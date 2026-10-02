// SQLite storage via Node's built-in node:sqlite. One file, one user.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { OCCASIONS } from './occasions.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    birthday TEXT,
    on_christmas_list INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS gifts (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES people(id),
    what TEXT NOT NULL,
    occasion TEXT NOT NULL,
    occasion_date TEXT NOT NULL,
    given_date TEXT,
    cost_cents INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    date TEXT NOT NULL,
    repeats INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS event_members (
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, person_id)
  );
  -- Gifts other people gave you. Kept apart from gifts, so they never count as
  -- covering anyone for an occasion.
  CREATE TABLE IF NOT EXISTS received (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES people(id),
    what TEXT NOT NULL,
    received_date TEXT NOT NULL,
    cost_cents INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BIRTHDAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const toPerson = (r) => r && { id: r.id, name: r.name, birthday: r.birthday, onChristmasList: r.on_christmas_list === 1 };
const toEvent = (r) => r && { id: r.id, name: r.name, date: r.date, repeats: r.repeats === 1 };
const toGift = (r) =>
  r && {
    id: r.id,
    personId: r.person_id,
    what: r.what,
    occasion: r.occasion,
    occasionDate: r.occasion_date,
    givenDate: r.given_date,
    costCents: r.cost_cents,
    eventId: r.event_id ?? null,
    eventName: r.event_name ?? null,
  };
const toReceived = (r) => r && { id: r.id, personId: r.person_id, what: r.what, receivedDate: r.received_date, costCents: r.cost_cents };

function cleanBirthday(b) {
  if (b === undefined || b === null || b === '') return null;
  if (!BIRTHDAY.test(b)) throw new Error(`birthday must be MM-DD, got "${b}"`);
  return b;
}

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  // Databases made before custom events have no gifts.event_id yet.
  if (!db.prepare('PRAGMA table_info(gifts)').all().some((c) => c.name === 'event_id')) {
    db.exec('ALTER TABLE gifts ADD COLUMN event_id INTEGER REFERENCES events(id)');
  }

  // Each person carries the ids of the custom event lists they are on.
  const withEvents = (person) => {
    if (!person) return null;
    const rows = db.prepare('SELECT event_id FROM event_members WHERE person_id = ? ORDER BY event_id').all(person.id);
    return { ...person, eventIds: rows.map((r) => r.event_id) };
  };
  const getPerson = (id) => withEvents(toPerson(db.prepare('SELECT * FROM people WHERE id = ?').get(id)));
  const GIFTS = 'SELECT g.*, e.name AS event_name FROM gifts g LEFT JOIN events e ON e.id = g.event_id';
  const getGift = (id) => toGift(db.prepare(`${GIFTS} WHERE g.id = ?`).get(id)) ?? null;
  const getEvent = (id) => toEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(id)) ?? null;

  function cleanEvent({ name, date, repeats = true }) {
    const n = String(name ?? '').trim();
    if (!n) throw new Error('event name is required');
    if (['christmas', 'birthday'].includes(n.toLowerCase())) throw new Error(`"${n}" is already built in`);
    if (!ISO_DATE.test(date ?? '')) throw new Error('event date must be YYYY-MM-DD');
    return [n, date, repeats ? 1 : 0];
  }

  const setMembers = (eventId, personIds) => {
    db.prepare('DELETE FROM event_members WHERE event_id = ?').run(eventId);
    const add = db.prepare('INSERT OR IGNORE INTO event_members (event_id, person_id) VALUES (?, ?)');
    for (const pid of personIds) add.run(eventId, pid);
  };

  return {
    listPeople: () => db.prepare('SELECT * FROM people ORDER BY name').all().map(toPerson).map(withEvents),
    getPerson,
    findPersonByName: (name) => withEvents(toPerson(db.prepare('SELECT * FROM people WHERE name = ?').get(String(name).trim()))),

    addPerson({ name, birthday = null, onChristmasList = true, eventIds = [] }) {
      const n = String(name ?? '').trim();
      if (!n) throw new Error('name is required');
      if (db.prepare('SELECT 1 FROM people WHERE name = ?').get(n)) throw new Error(`"${n}" is already on your list`);
      const { lastInsertRowid } = db
        .prepare('INSERT INTO people (name, birthday, on_christmas_list) VALUES (?, ?, ?)')
        .run(n, cleanBirthday(birthday), onChristmasList ? 1 : 0);
      const add = db.prepare('INSERT OR IGNORE INTO event_members (event_id, person_id) VALUES (?, ?)');
      for (const eid of eventIds) if (getEvent(eid)) add.run(eid, lastInsertRowid);
      return getPerson(lastInsertRowid);
    },

    updatePerson(id, { birthday, onChristmasList, eventIds }) {
      const p = getPerson(id);
      if (!p) throw new Error('person not found');
      db.prepare('UPDATE people SET birthday = ?, on_christmas_list = ? WHERE id = ?').run(
        birthday === undefined ? p.birthday : cleanBirthday(birthday),
        (onChristmasList ?? p.onChristmasList) ? 1 : 0,
        id,
      );
      if (eventIds) {
        db.prepare('DELETE FROM event_members WHERE person_id = ?').run(id);
        const add = db.prepare('INSERT OR IGNORE INTO event_members (event_id, person_id) VALUES (?, ?)');
        for (const eid of eventIds) if (getEvent(eid)) add.run(eid, id);
      }
      return getPerson(id);
    },

    // Custom events: a name and a date, once or every year, with their own list of people.
    listEvents: () => db.prepare('SELECT * FROM events ORDER BY name').all().map(toEvent),
    getEvent,

    addEvent({ name, date, repeats = true, personIds = [] }) {
      const row = cleanEvent({ name, date, repeats });
      if (db.prepare('SELECT 1 FROM events WHERE name = ?').get(row[0])) throw new Error(`"${row[0]}" already exists`);
      const { lastInsertRowid } = db.prepare('INSERT INTO events (name, date, repeats) VALUES (?, ?, ?)').run(...row);
      setMembers(lastInsertRowid, personIds);
      return getEvent(lastInsertRowid);
    },

    updateEvent(id, { name, date, repeats, personIds }) {
      if (!getEvent(id)) throw new Error('event not found');
      const row = cleanEvent({ name, date, repeats });
      if (db.prepare('SELECT 1 FROM events WHERE name = ? AND id != ?').get(row[0], id)) throw new Error(`"${row[0]}" already exists`);
      db.prepare('UPDATE events SET name = ?, date = ?, repeats = ? WHERE id = ?').run(...row, id);
      if (personIds) setMembers(id, personIds);
      return getEvent(id);
    },

    // Refused while gifts are logged for it, so no history is lost.
    deleteEvent(id) {
      const ev = getEvent(id);
      if (!ev) throw new Error('event not found');
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM gifts WHERE event_id = ?').get(id);
      if (n) throw new Error(`${ev.name} has ${n} gift${n === 1 ? '' : 's'} logged, so it can't be deleted.`);
      db.prepare('DELETE FROM events WHERE id = ?').run(id);
      return ev;
    },

    listGifts: () => db.prepare(`${GIFTS} ORDER BY g.id`).all().map(toGift),
    getGift,

    addGift({ personId, what, occasion, occasionDate, givenDate = null, costCents = null, eventId = null }) {
      if (!getPerson(personId)) throw new Error('person not found');
      const w = String(what ?? '').trim();
      if (!w) throw new Error('what is required');
      if (!OCCASIONS.includes(occasion)) throw new Error(`unknown occasion "${occasion}"`);
      if (occasion === 'event' && !getEvent(eventId)) throw new Error('event not found');
      if (occasion !== 'event') eventId = null;
      if (!ISO_DATE.test(occasionDate ?? '')) throw new Error('occasion date must be YYYY-MM-DD');
      if (givenDate && !ISO_DATE.test(givenDate)) throw new Error('given date must be YYYY-MM-DD');
      const { lastInsertRowid } = db
        .prepare(
          'INSERT INTO gifts (person_id, what, occasion, occasion_date, given_date, cost_cents, event_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(personId, w, occasion, occasionDate, givenDate || null, costCents ?? null, eventId);
      return getGift(lastInsertRowid);
    },

    deleteGift: (id) => db.prepare('DELETE FROM gifts WHERE id = ?').run(id),

    // Gifts people gave you, newest first.
    listReceived: () => db.prepare('SELECT * FROM received ORDER BY received_date DESC, id DESC').all().map(toReceived),
    getReceived: (id) => toReceived(db.prepare('SELECT * FROM received WHERE id = ?').get(id)) ?? null,

    addReceived({ personId, what, receivedDate, costCents = null }) {
      if (!getPerson(personId)) throw new Error('person not found');
      const w = String(what ?? '').trim();
      if (!w) throw new Error('what is required');
      if (!ISO_DATE.test(receivedDate ?? '')) throw new Error('date received must be YYYY-MM-DD');
      const { lastInsertRowid } = db
        .prepare('INSERT INTO received (person_id, what, received_date, cost_cents) VALUES (?, ?, ?, ?)')
        .run(personId, w, receivedDate, costCents ?? null);
      return toReceived(db.prepare('SELECT * FROM received WHERE id = ?').get(lastInsertRowid));
    },

    deleteReceived: (id) => db.prepare('DELETE FROM received WHERE id = ?').run(id),
    close: () => db.close(),
  };
}

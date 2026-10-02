import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../src/db.js';

const fresh = () => openDb(':memory:');

test('people: add, list by name, and find by name ignoring case and spaces', () => {
  const db = fresh();
  db.addPerson({ name: 'Ben' });
  const amy = db.addPerson({ name: 'Amy', birthday: '10-20' });
  assert.deepEqual(amy, { id: amy.id, name: 'Amy', birthday: '10-20', onChristmasList: true, eventIds: [] });
  assert.deepEqual(db.listPeople().map((p) => p.name), ['Amy', 'Ben']);
  assert.equal(db.findPersonByName('  amy ').id, amy.id);
  assert.equal(db.findPersonByName('Zed'), null);
});

test('people: names must be unique and non-empty', () => {
  const db = fresh();
  db.addPerson({ name: 'Amy' });
  assert.throws(() => db.addPerson({ name: 'amy' }), /already/);
  assert.throws(() => db.addPerson({ name: '  ' }), /name/);
});

test('people: bad birthday is rejected, blank birthday is fine', () => {
  const db = fresh();
  assert.throws(() => db.addPerson({ name: 'A', birthday: '13-01' }), /birthday/);
  assert.equal(db.addPerson({ name: 'B', birthday: '' }).birthday, null);
});

test('people: update birthday and Christmas list', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const got = db.updatePerson(p.id, { birthday: '03-14', onChristmasList: false });
  assert.deepEqual(got, { id: p.id, name: 'Amy', birthday: '03-14', onChristmasList: false, eventIds: [] });
});

const giftFor = (personId, extra = {}) => ({
  personId, what: 'Scarf', occasion: 'christmas', occasionDate: '2026-12-25', givenDate: '2026-11-20', costCents: 2500, ...extra,
});

test('gifts: add and list', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const g = db.addGift(giftFor(p.id));
  assert.equal(g.what, 'Scarf');
  assert.deepEqual(db.listGifts(), [g]);
});

test('gifts: blank cost and blank given date are saved', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const g = db.addGift(giftFor(p.id, { costCents: null, givenDate: null }));
  assert.equal(g.costCents, null);
  assert.equal(g.givenDate, null);
});

test('gifts: the same person and occasion twice saves both', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  db.addGift(giftFor(p.id));
  db.addGift(giftFor(p.id));
  assert.equal(db.listGifts().length, 2);
});

test('gifts: missing person, missing what, or unknown occasion is rejected', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  assert.throws(() => db.addGift(giftFor(999)), /person/);
  assert.throws(() => db.addGift(giftFor(p.id, { what: ' ' })), /what/);
  assert.throws(() => db.addGift(giftFor(p.id, { occasion: 'easter' })), /occasion/);
});

test('gifts: delete one', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const g = db.addGift(giftFor(p.id));
  db.deleteGift(g.id);
  assert.deepEqual(db.listGifts(), []);
});

test('events: add with a list, update, and people carry the lists they are on', () => {
  const db = fresh();
  const amy = db.addPerson({ name: 'Amy' });
  const ben = db.addPerson({ name: 'Ben' });
  const ev = db.addEvent({ name: "Mother's Day", date: '2026-05-10', repeats: true, personIds: [amy.id] });
  assert.deepEqual(ev, { id: ev.id, name: "Mother's Day", date: '2026-05-10', repeats: true });
  assert.deepEqual(db.getPerson(amy.id).eventIds, [ev.id]);
  db.updateEvent(ev.id, { name: "Mum's Day", date: '2026-05-10', repeats: false, personIds: [ben.id] });
  assert.deepEqual([db.getPerson(amy.id).eventIds, db.getPerson(ben.id).eventIds], [[], [ev.id]]);
  assert.equal(db.getEvent(ev.id).repeats, false);
  db.updatePerson(amy.id, { eventIds: [ev.id] });
  assert.deepEqual(db.listPeople().map((p) => p.eventIds), [[ev.id], [ev.id]]);
  const cat = db.addPerson({ name: 'Cat', eventIds: [ev.id, 999] });
  assert.deepEqual(cat.eventIds, [ev.id]);
});

test('events: names are unique, not built in, and need a date', () => {
  const db = fresh();
  db.addEvent({ name: 'Wedding', date: '2027-03-01', repeats: false });
  assert.throws(() => db.addEvent({ name: 'wedding', date: '2027-03-01' }), /already exists/);
  assert.throws(() => db.addEvent({ name: 'Christmas', date: '2026-12-25' }), /built in/);
  assert.throws(() => db.addEvent({ name: 'Party', date: '1 March' }), /YYYY-MM-DD/);
});

test('events: gifts carry the event name; an event with gifts cannot be deleted', () => {
  const db = fresh();
  const p = db.addPerson({ name: 'Amy' });
  const ev = db.addEvent({ name: 'Wedding', date: '2027-03-01', repeats: false });
  const g = db.addGift(giftFor(p.id, { occasion: 'event', eventId: ev.id, occasionDate: '2027-03-01' }));
  assert.deepEqual([g.eventId, g.eventName], [ev.id, 'Wedding']);
  assert.throws(() => db.addGift(giftFor(p.id, { occasion: 'event', eventId: 999 })), /event not found/);
  assert.throws(() => db.deleteEvent(ev.id), /can't be deleted/);
  db.deleteGift(g.id);
  db.deleteEvent(ev.id);
  assert.deepEqual(db.listEvents(), []);
});

test('an older database without events gets upgraded in place', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gifts-'));
  const path = join(dir, 'old.db');
  const old = new DatabaseSync(path);
  old.exec(`CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, birthday TEXT, on_christmas_list INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE gifts (id INTEGER PRIMARY KEY, person_id INTEGER NOT NULL, what TEXT NOT NULL, occasion TEXT NOT NULL, occasion_date TEXT NOT NULL, given_date TEXT, cost_cents INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO people (name) VALUES ('Amy');
    INSERT INTO gifts (person_id, what, occasion, occasion_date) VALUES (1, 'Scarf', 'christmas', '2025-12-25');`);
  old.close();
  const db = openDb(path);
  assert.deepEqual(db.listGifts().map((g) => [g.what, g.eventId]), [['Scarf', null]]);
  db.close(); // Windows can't delete an open file
  rmSync(dir, { recursive: true });
});

test('received: add, list newest first, delete, and keep apart from gifts', () => {
  const db = fresh();
  const amy = db.addPerson({ name: 'Amy' });
  db.addReceived({ personId: amy.id, what: 'Mug', receivedDate: '2025-12-25', costCents: 1500 });
  const wallet = db.addReceived({ personId: amy.id, what: ' Wallet ', receivedDate: '2026-08-02' });
  assert.deepEqual(wallet, { id: wallet.id, personId: amy.id, what: 'Wallet', receivedDate: '2026-08-02', costCents: null });
  assert.deepEqual(db.listReceived().map((r) => r.what), ['Wallet', 'Mug']);
  assert.deepEqual(db.listGifts(), []);
  db.deleteReceived(wallet.id);
  assert.equal(db.getReceived(wallet.id), null);
});

test('received: needs a known person, a what and a real date', () => {
  const db = fresh();
  const amy = db.addPerson({ name: 'Amy' });
  assert.throws(() => db.addReceived({ personId: 99, what: 'x', receivedDate: '2026-01-01' }), /person not found/);
  assert.throws(() => db.addReceived({ personId: amy.id, what: ' ', receivedDate: '2026-01-01' }), /what/);
  assert.throws(() => db.addReceived({ personId: amy.id, what: 'x', receivedDate: '1 Jan' }), /YYYY-MM-DD/);
});

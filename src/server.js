// Local web server. createApp() is the request handler, so tests can drive it
// with an in-memory database and a fixed "today".
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { defaultOccasionDate } from './occasions.js';
import { personHistory, withDuplicateFlags } from './coverage.js';
import { upcomingSections, localToday } from './upcoming.js';
import { parseCost } from './money.js';
import * as views from './views.js';
import { landingPage } from './landing.js';
import { createEntryParser } from './ai/parse-entry.js';
import { SEASONS, seasonFor } from './season.js';

// Wide enough that Christmas shows from late September, when shopping for it starts.
export const HOME_WINDOW_DAYS = 90;


async function readForm(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return Object.fromEntries(new URLSearchParams(body));
}

const send = (res, status, html) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
};
const redirect = (res, location) => {
  res.writeHead(303, { Location: location });
  res.end();
};
const withFlash = (path, msg) => `${path}?${new URLSearchParams({ flash: msg })}`;

// Day + month selects -> 'MM-DD', or null when either is blank.
function birthdayFrom(f) {
  if (!f.bday || !f.bmonth) return null;
  const [d, m] = [Number(f.bday), Number(f.bmonth)];
  const maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  if (!maxDay || d < 1 || d > maxDay) throw new Error('That birthday date doesn\'t exist.');
  return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Say why type-to-log failed, so a bad key doesn't look like a hard-to-read note.
function aiFailureReason(err) {
  if (err.status === 401 || err.status === 403) return "Couldn't read that automatically: the AI service turned down the request (check OPENCODE_API_KEY in .env).";
  if (err.status === 429) return "Couldn't read that automatically: the AI service is busy right now.";
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return "Couldn't read that automatically: the AI took too long to answer.";
  return "Couldn't read that automatically.";
}

const cookie = (req, name) =>
  (req.headers?.cookie ?? '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1];

// Back to the page the request came from, if it was a page of this app.
function backTo(req) {
  try {
    const ref = new URL(req.headers?.referer ?? '');
    if (ref.host !== req.headers.host) return '/';
    ref.searchParams.delete('flash');
    return ref.pathname + ref.search;
  } catch {
    return '/';
  }
}

// Ticked pill toggles named like "event_3" -> [3].
const idsFrom = (f, prefix) =>
  Object.keys(f)
    .filter((k) => k.startsWith(prefix) && f[k] === '1')
    .map((k) => Number(k.slice(prefix.length)))
    .filter(Number.isInteger);

export function createApp({ db, today = localToday, parseEntry = null, season: fixedSeason = null }) {
  // The season someone picked in the menu (a cookie) wins, then a fixed SEASON=winter
  // in .env, then the date. `chosen` tells the menu which option to tick.
  const seasonOf = (req) => {
    const picked = SEASONS[cookie(req, 'season')];
    if (picked) return { ...picked, chosen: true };
    return SEASONS[fixedSeason] ?? seasonFor(today());
  };
  const peopleNames = () => db.listPeople().map((p) => p.name);

  const giftForm = (res, values, extra = {}) =>
    send(res, extra.status ?? 200, views.giftFormPage({ values, peopleNames: peopleNames(), events: db.listEvents(), aiEnabled: !!parseEntry, season: res.season, ...extra }));

  const peoplePage = (res, status, extra = {}) =>
    send(res, status, views.peoplePage({ people: db.listPeople(), gifts: db.listGifts(), events: db.listEvents(), season: res.season, ...extra }));
  const eventsPage = (res, status, extra = {}) =>
    send(res, status, views.eventsPage({ events: db.listEvents(), people: db.listPeople(), today: today(), season: res.season, ...extra }));
  const eventFrom = (f) => ({ name: f.name, date: f.date, repeats: f.repeats === '1', personIds: idsFrom(f, 'person_') });

  const emptyValues = () => ({ person: '', what: '', occasion: 'christmas', givenDate: today(), cost: '', occasionDate: '', entry: '' });

  async function saveGift(req, res) {
    const f = await readForm(req);
    const values = { ...emptyValues(), ...f };
    const name = (f.person ?? '').trim();
    if (!name) return giftForm(res, values, { status: 400, error: 'Who is this gift for?' });

    let person = db.findPersonByName(name);
    if (!person && f.confirmNew !== '1') {
      return giftForm(res, values, { confirmNewPerson: true, notice: `"${name}" isn't on your list yet. Tick the box to add them, or fix the spelling.` });
    }
    try {
      person ??= db.addPerson({ name });
      // Custom events come through as "event:<id>".
      const [occasion, eventId] = (f.occasion || 'christmas').split(':');
      const event = occasion === 'event' ? db.getEvent(Number(eventId)) : null;
      if (occasion === 'event' && !event) throw new Error('That event no longer exists.');
      const givenDate = f.givenDate || today();
      const occasionDate = f.occasionDate || defaultOccasionDate(occasion, givenDate, person.birthday, event);
      const costCents = parseCost(f.cost);
      const gift = db.addGift({ personId: person.id, what: f.what, occasion, occasionDate, givenDate, costCents, eventId: event?.id });

      const notes = [`Saved: ${gift.what} for ${person.name} (${views.occasionLabel(occasion, occasionDate, event?.name)}).`];
      if (costCents === null && (f.cost ?? '').trim()) notes.push(`"${f.cost}" isn't a number, so the cost was left blank.`);
      const flagged = withDuplicateFlags(db.listGifts()).find((g) => g.id === gift.id);
      if (flagged.possibleDuplicate) notes.push(`Possible duplicate: ${person.name} already has a gift logged for this occasion. Both are kept.`);
      return redirect(res, withFlash('/', notes.join(' ')));
    } catch (err) {
      return giftForm(res, values, { status: 400, error: err.message });
    }
  }

  async function parseGift(req, res) {
    const f = await readForm(req);
    const entry = (f.entry ?? '').trim();
    const base = { ...emptyValues(), entry };
    if (!entry) return giftForm(res, base);
    try {
      const draft = await parseEntry(entry, { today: today(), peopleNames: peopleNames() });
      const known = draft.person && db.findPersonByName(draft.person);
      const found = Object.keys(draft);
      return giftForm(res, { ...base, ...draft }, {
        confirmNewPerson: !!draft.person && !known,
        aiFilled: found,
        notice: found.length
          ? 'Check the highlighted details, then save.'
          : "The AI couldn't find any gift details in that. Fill in the form below instead.",
      });
    } catch (err) {
      console.error('type-to-log failed:', err.message);
      return giftForm(res, base, { error: `${aiFailureReason(err)} Fill in the form below instead.` });
    }
  }

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const flash = views.flashBox(url.searchParams.get('flash'));
    let m;
    res.season = seasonOf(req);

    // The season menu: remember a pick for a year, or forget it for "Automatic".
    if (req.method === 'POST' && path === '/season') {
      const { season: pick } = await readForm(req);
      const value = SEASONS[pick] ? `season=${pick}; Max-Age=31536000` : 'season=; Max-Age=0';
      res.writeHead(303, { Location: backTo(req), 'Set-Cookie': `${value}; Path=/; SameSite=Lax` });
      return res.end();
    }

    if (req.method === 'GET' && path === '/') {
      return send(res, 200, views.homePage({
        today: today(),
        sections: upcomingSections(db, today(), HOME_WINDOW_DAYS),
        peopleCount: db.listPeople().length,
        flash,
        season: res.season,
      }));
    }
    if (req.method === 'GET' && path === '/welcome') return send(res, 200, landingPage({ today: today(), season: res.season }));
    if (req.method === 'GET' && path === '/gifts/new') {
      const q = Object.fromEntries(url.searchParams);
      return giftForm(res, { ...emptyValues(), ...q });
    }
    if (req.method === 'POST' && path === '/gifts') return saveGift(req, res);
    if (req.method === 'POST' && path === '/gifts/parse' && parseEntry) return parseGift(req, res);
    if (req.method === 'POST' && (m = path.match(/^\/gifts\/(\d+)\/delete$/))) {
      const gift = db.getGift(Number(m[1]));
      if (!gift) return send(res, 404, views.notFoundPage({ season: res.season }));
      db.deleteGift(gift.id);
      return redirect(res, withFlash(`/people/${gift.personId}`, `Deleted: ${gift.what}.`));
    }
    if (req.method === 'GET' && path === '/people') {
      return peoplePage(res, 200, { flash });
    }
    if (req.method === 'POST' && path === '/people') {
      const f = await readForm(req);
      try {
        const p = db.addPerson({ name: f.name, birthday: birthdayFrom(f), onChristmasList: f.christmas === '1', eventIds: idsFrom(f, 'event_') });
        return redirect(res, withFlash('/people', `Added ${p.name}.`));
      } catch (err) {
        return peoplePage(res, 400, { error: err.message });
      }
    }
    // A person's page shows their history and is where their birthday and lists are edited.
    if ((m = path.match(/^\/people\/(\d+)$/)) && (req.method === 'GET' || req.method === 'POST')) {
      const person = db.getPerson(Number(m[1]));
      if (!person) return send(res, 404, views.notFoundPage({ season: res.season }));
      const page = (extra) =>
        views.personPage({ person, history: personHistory(person.id, db.listGifts()), events: db.listEvents(), flash, season: res.season, ...extra });
      if (req.method === 'GET') return send(res, 200, page());
      const f = await readForm(req);
      try {
        db.updatePerson(person.id, { birthday: birthdayFrom(f), onChristmasList: f.christmas === '1', eventIds: idsFrom(f, 'event_') });
        return redirect(res, withFlash(`/people/${person.id}`, 'Saved.'));
      } catch (err) {
        return send(res, 400, page({ error: err.message }));
      }
    }
    if (req.method === 'GET' && path === '/events') return eventsPage(res, 200, { flash });
    if (req.method === 'POST' && path === '/events') {
      const f = await readForm(req);
      try {
        const e = db.addEvent(eventFrom(f));
        return redirect(res, withFlash('/events', `Added ${e.name}.`));
      } catch (err) {
        return eventsPage(res, 400, { error: err.message });
      }
    }
    if (req.method === 'POST' && (m = path.match(/^\/events\/(\d+)$/))) {
      const f = await readForm(req);
      try {
        const e = db.updateEvent(Number(m[1]), eventFrom(f));
        return redirect(res, withFlash('/events', `Saved ${e.name}.`));
      } catch (err) {
        return eventsPage(res, 400, { error: err.message, openId: Number(m[1]) });
      }
    }
    if (req.method === 'POST' && (m = path.match(/^\/events\/(\d+)\/delete$/))) {
      try {
        const e = db.deleteEvent(Number(m[1]));
        return redirect(res, withFlash('/events', `Deleted ${e.name}.`));
      } catch (err) {
        return eventsPage(res, 400, { error: err.message });
      }
    }
    return send(res, 404, views.notFoundPage({ season: res.season }));
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb(process.env.DB_PATH ?? 'data/gifts.db');
  const port = Number(process.env.PORT ?? 3000);
  const parseEntry = process.env.OPENCODE_API_KEY ? createEntryParser() : null;
  createServer(createApp({ db, parseEntry, season: process.env.SEASON })).listen(port, '127.0.0.1', () => {
    console.log(`Gift app running at http://localhost:${port}`);
    if (!parseEntry) console.log('Type-to-log is off: set OPENCODE_API_KEY in .env to turn it on.');
  });
}

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';

let server, base, db;
let parseEntry = null;

before(async () => {
  db = openDb(':memory:');
  const app = createApp({ db, today: () => '2026-11-20', parseEntry: (...a) => parseEntry(...a) });
  server = createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, fields) =>
  fetch(base + path, { method: 'POST', body: new URLSearchParams(fields), redirect: 'manual' });
const flashOf = (res) => new URL(res.headers.get('location'), base).searchParams.get('flash');
const get = async (path) => (await fetch(base + path)).text();

test('home with an empty list says so and offers to add a gift', async () => {
  const html = await get('/');
  assert.match(html, /Your list is empty/);
  assert.match(html, /Add a gift/);
});

test('a new name asks for confirmation instead of silently creating a person', async () => {
  const res = await post('/gifts', { person: 'Amy', what: 'Scarf', occasion: 'christmas', cost: '25' });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /isn&#39;t on your list yet/);
  assert.equal(db.listPeople().length, 0);
});

test('confirmed new name saves the gift and Christmas 2026 shows them covered', async () => {
  const res = await post('/gifts', { person: 'Amy', what: 'Scarf', occasion: 'christmas', cost: '25', confirmNew: '1' });
  assert.equal(res.status, 303);
  const [gift] = db.listGifts();
  assert.equal(gift.occasionDate, '2026-12-25');
  assert.equal(gift.costCents, 2500);
  db.addPerson({ name: 'Ben' });
  const home = await get('/');
  assert.match(home, /Christmas 2026/);
  assert.match(home, /Still to buy \(1\)[\s\S]*Ben[\s\S]*Covered \(1\)[\s\S]*Amy/);
});

test('blank cost saves; unreadable cost saves blank and says so', async () => {
  let res = await post('/gifts', { person: 'Ben', what: 'Book', occasion: 'christmas', cost: '' });
  assert.equal(res.status, 303);
  res = await post('/gifts', { person: 'Ben', what: 'Mug', occasion: 'christmas', cost: 'about 20' });
  assert.match(flashOf(res), /isn't a number/);
  const ben = db.findPersonByName('Ben');
  assert.ok(db.listGifts().filter((g) => g.personId === ben.id).every((g) => g.costCents === null));
});

test('a second gift for the same person and occasion is kept and flagged', async () => {
  const res = await post('/gifts', { person: 'Amy', what: 'Gloves', occasion: 'christmas' });
  assert.match(flashOf(res), /Possible duplicate/);
  const amy = db.findPersonByName('Amy');
  const page = await get(`/people/${amy.id}`);
  assert.equal(page.match(/possible duplicate<\/span>/g).length, 2);
});

test('a person with no gifts shows "Nothing recorded yet" and a quick add', async () => {
  const cat = db.addPerson({ name: 'Cat' });
  const page = await get(`/people/${cat.id}`);
  assert.match(page, /Nothing recorded yet/);
  assert.match(page, /Add a gift for Cat/);
});

test('missing "what" is refused with the form kept filled in', async () => {
  const res = await post('/gifts', { person: 'Amy', what: '', occasion: 'christmas', cost: '9' });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /value="9"/);
});

test('type-to-log fills the form for review and does not save', async () => {
  parseEntry = async () => ({ person: 'Amy', what: 'Socks', occasion: 'birthday', cost: '' });
  const before = db.listGifts().length;
  const res = await post('/gifts/parse', { entry: 'socks for amy bday' });
  const html = await res.text();
  assert.match(html, /value="Socks"/);
  assert.match(html, /value="birthday" checked/);
  assert.equal(db.listGifts().length, before);
});

test('type-to-log failure falls back to the plain form', async () => {
  parseEntry = async () => { throw new Error('network down'); };
  const res = await post('/gifts/parse', { entry: 'socks for amy' });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Fill in the form below instead/);
});

test('page text is escaped', async () => {
  await post('/gifts', { person: '<b>Eve</b>', what: 'x', confirmNew: '1' });
  const eve = db.findPersonByName('<b>Eve</b>');
  assert.doesNotMatch(await get(`/people/${eve.id}`), /<b>Eve<\/b>/);
});

test('people page: add with birthday, then update; impossible dates are refused', async () => {
  let res = await post('/people', { name: 'Dan', bday: '29', bmonth: '2', christmas: '1' });
  assert.equal(res.status, 303);
  const dan = db.findPersonByName('Dan');
  assert.deepEqual([dan.birthday, dan.onChristmasList], ['02-29', true]);
  res = await post(`/people/${dan.id}`, { bday: '5', bmonth: '1' }); // checkbox unticked
  assert.deepEqual(db.getPerson(dan.id), { ...dan, birthday: '01-05', onChristmasList: false });
  res = await post(`/people/${dan.id}`, { bday: '31', bmonth: '4' });
  assert.equal(res.status, 400);
  res = await post('/people', { name: 'dan' });
  assert.match(await res.text(), /already on your list/);
});

test('a birthday gift for someone with a birthday counts for their next birthday', async () => {
  const fay = db.addPerson({ name: 'Fay', birthday: '12-01' });
  await post('/gifts', { person: 'Fay', what: 'Plant', occasion: 'birthday' });
  const g = db.listGifts().find((x) => x.personId === fay.id);
  assert.equal(g.occasionDate, '2026-12-01');
  assert.match(await get('/'), /Fay&#39;s birthday 2026[\s\S]*Covered \(1\)[\s\S]*Fay/);
});

test('home on 2 Oct shows both a nearer birthday and Christmas 2026', async () => {
  const db2 = openDb(':memory:');
  db2.addPerson({ name: 'Amy', birthday: '10-20' });
  db2.addPerson({ name: 'Ben' });
  const s = createServer(createApp({ db: db2, today: () => '2026-10-02' }));
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const html = await (await fetch(`http://127.0.0.1:${s.address().port}/`)).text();
  s.close();
  assert.match(html, /Amy&#39;s birthday 2026[\s\S]*Christmas 2026/);
});

test('pages wear the season for today, or a fixed SEASON override', async () => {
  const html = (app) => new Promise((resolve) => {
    const res = { writeHead() {}, end: resolve };
    app({ method: 'GET', url: '/people', [Symbol.asyncIterator]: async function* () {} }, res);
  });
  const db = openDb(':memory:');
  assert.match(await html(createApp({ db, today: () => '2026-12-10' })), /class="s-winter"[\s\S]*sky-winter/);
  assert.match(await html(createApp({ db, today: () => '2026-10-02' })), /class="s-autumn"/);
  assert.match(await html(createApp({ db, today: () => '2026-10-02', season: 'spring' })), /class="s-spring"/);
});

test('events: create one with a list, log a gift for it, and see it on the home page', async () => {
  const gus = db.addPerson({ name: 'Gus' });
  let res = await post('/events', { name: 'Housewarming', date: '2026-12-05', [`person_${gus.id}`]: '1' });
  assert.match(flashOf(res), /Added Housewarming/);
  const ev = db.listEvents().find((e) => e.name === 'Housewarming');
  assert.equal(ev.repeats, false);
  assert.deepEqual(db.getPerson(gus.id).eventIds, [ev.id]);
  assert.match(await get('/'), /Housewarming 2026[\s\S]*Still to buy \(1\)[\s\S]*Gus/);
  assert.match(await get('/gifts/new'), new RegExp(`value="event:${ev.id}"`));

  res = await post('/gifts', { person: 'Gus', what: 'Plant', occasion: `event:${ev.id}`, cost: '30' });
  assert.match(flashOf(res), /Saved: Plant for Gus \(Housewarming 2026\)/);
  assert.deepEqual(db.listGifts().filter((g) => g.eventId === ev.id).map((g) => g.occasionDate), ['2026-12-05']);
  assert.match(await get(`/people/${gus.id}`), /Plant[\s\S]*Housewarming 2026/);

  res = await post(`/events/${ev.id}/delete`, {});
  assert.equal(res.status, 400);
  assert.match(await res.text(), /can&#39;t be deleted/);
});

test('people page: list toggles add and remove someone from an event', async () => {
  const ev = db.addEvent({ name: 'Lunar New Year', date: '2027-02-06', repeats: false });
  let res = await post('/people', { name: 'Hal', christmas: '1', [`event_${ev.id}`]: '1' });
  const hal = db.findPersonByName('Hal');
  assert.deepEqual(hal.eventIds, [ev.id]);
  assert.match(await get('/people'), /🎉 Lunar New Year/);
  res = await post(`/people/${hal.id}`, { christmas: '1' });
  assert.equal(res.status, 303);
  assert.deepEqual(db.getPerson(hal.id).eventIds, []);
});

test('type-to-log says when the AI key is turned down', async () => {
  parseEntry = async () => { throw Object.assign(new Error('401 invalid key'), { status: 401 }); };
  const html = await (await post('/gifts/parse', { entry: 'socks for amy' })).text();
  assert.match(html, /check OPENCODE_API_KEY/);
});

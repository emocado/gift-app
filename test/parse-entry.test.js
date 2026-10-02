import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanDraft, createEntryParser } from '../src/ai/parse-entry.js';

const raw = (fields) => ({ person: '', what: '', occasion: '', cost: '', given_date: '', occasion_date: '', ...fields });
const names = ['Amy', 'Ben Tan'];

test('cleanDraft: snaps a known name to the list spelling', () => {
  assert.equal(cleanDraft(raw({ person: 'amy' }), 'scarf for amy', names).person, 'Amy');
  assert.equal(cleanDraft(raw({ person: "Amy's" }), "amy's scarf", names).person, 'Amy');
});

test('cleanDraft: an unknown name is kept as written', () => {
  assert.equal(cleanDraft(raw({ person: 'Zoe' }), 'scarf for Zoe', names).person, 'Zoe');
});

test('cleanDraft: a cost that is not in the note is dropped', () => {
  assert.equal(cleanDraft(raw({ cost: '20' }), 'scarf for Amy', names).cost, '');
  assert.equal(cleanDraft(raw({ cost: '20' }), 'scarf for Amy, 25', names).cost, '');
});

test('cleanDraft: a cost that is in the note is kept, with currency stripped', () => {
  assert.equal(cleanDraft(raw({ cost: '25' }), 'scarf for Amy $25', names).cost, '25');
  assert.equal(cleanDraft(raw({ cost: 'S$12.50' }), 'mug, S$12.50', names).cost, '12.50');
  assert.equal(cleanDraft(raw({ cost: '1200' }), 'watch 1,200', names).cost, '1200');
});

test('cleanDraft: unknown occasion and bad dates become blank', () => {
  const d = cleanDraft(raw({ occasion: 'easter', given_date: 'yesterday', occasion_date: '2026-13-01' }), 'x', names);
  assert.deepEqual([d.occasion, d.givenDate, d.occasionDate], ['', '', '']);
});

test('cleanDraft: tolerates missing or non-string fields', () => {
  assert.deepEqual(cleanDraft({ person: 5 }, 'x', names), {
    person: '', what: '', occasion: '', cost: '', givenDate: '', occasionDate: '',
  });
});

const fakeClient = (response) => {
  const calls = [];
  return {
    calls,
    chat: { completions: { create: async (params) => (calls.push(params), response) } },
  };
};
const reply = (obj, finish_reason = 'stop') => ({ choices: [{ finish_reason, message: { content: JSON.stringify(obj) } }] });

test('parseEntry: returns only the fields found, cleaned', async () => {
  const client = fakeClient(reply(raw({ person: 'amy', what: 'Scarf', occasion: 'christmas', cost: '30' })));
  const parse = createEntryParser({ client });
  const got = await parse('scarf for amy xmas', { today: '2026-11-20', peopleNames: names });
  assert.deepEqual(got, { person: 'Amy', what: 'Scarf', occasion: 'christmas' });
});

test('parseEntry: sends today, the list of names, the note, and asks for JSON', async () => {
  const client = fakeClient(reply(raw({})));
  await createEntryParser({ client })('socks', { today: '2026-11-20', peopleNames: names });
  const p = client.calls[0];
  assert.equal(p.model, 'deepseek-v4.1-flash');
  assert.equal(p.response_format.type, 'json_schema');
  assert.equal(p.messages[0].role, 'system');
  assert.match(p.messages[1].content, /2026-11-20[\s\S]*Amy, Ben Tan[\s\S]*socks/);
});

test('parseEntry: a refusal or cut-off reply throws so the plain form is shown', async () => {
  for (const stop of ['content_filter', 'length']) {
    const parse = createEntryParser({ client: fakeClient(reply(raw({}), stop)) });
    await assert.rejects(parse('x', { today: '2026-11-20', peopleNames: [] }), /model stopped/);
  }
});

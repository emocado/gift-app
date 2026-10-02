import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastGiftBefore } from '../src/upcoming.js';

const gift = (what, occasion, occasionDate, eventId = null) => ({ what, occasion, occasionDate, eventId });

test('lastGiftBefore: never a gift for an occasion still to come, same kind first', () => {
  const history = [ // newest first, as personHistory returns it
    gift('Lego', 'christmas', '2026-12-25'),
    gift('Scarf', 'christmas', '2025-12-25'),
    gift('Kindle', 'birthday', '2025-10-14'),
  ];
  assert.equal(lastGiftBefore({ occasion: 'birthday', date: '2026-10-14' }, history).what, 'Kindle');
  assert.equal(lastGiftBefore({ occasion: 'christmas', date: '2026-12-25' }, history).what, 'Scarf');
  assert.equal(lastGiftBefore({ occasion: 'birthday', date: '2026-01-05' }, [gift('Scarf', 'christmas', '2025-12-25')]).what, 'Scarf');
  assert.equal(lastGiftBefore({ occasion: 'christmas', date: '2025-12-25' }, history.slice(0, 2)), null);
});

test('lastGiftBefore: for a custom event, the same event counts as the same kind', () => {
  const history = [gift('Cake', 'event', '2026-02-01', 2), gift('Card', 'event', '2025-06-01', 1)];
  assert.equal(lastGiftBefore({ occasion: 'event', eventId: 1, date: '2026-06-01' }, history).what, 'Card');
});

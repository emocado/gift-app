import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balance, visibleToFriend } from '../src/balance.js';
import { sharingPreview } from '../src/sharing-preview.js';

const cost = (costCents, occasionDate = '2025-12-25') => ({ costCents, occasionDate });

test('balance: they spent more on you, so you are behind by the difference', () => {
  assert.deepEqual(balance([cost(1000)], [cost(1500)]), { givenCents: 1000, receivedCents: 1500, gapCents: 500, unpriced: 0 });
});

test('balance: you spent more, so the gap is negative', () => {
  assert.equal(balance([cost(2000), cost(500)], [cost(1500)]).gapCents, -1000);
});

test('balance: gifts without a cost are left out and counted', () => {
  assert.deepEqual(balance([cost(1000), cost(null)], [cost(null)]), { givenCents: 1000, receivedCents: 0, gapCents: -1000, unpriced: 2 });
});

test('balance: nothing logged either way is even', () => {
  assert.deepEqual(balance([], []), { givenCents: 0, receivedCents: 0, gapCents: 0, unpriced: 0 });
});

test('visibleToFriend: only gifts whose occasion has come, the day itself included', () => {
  const gifts = [cost(1, '2026-12-25'), cost(2, '2026-10-02'), cost(3, '2025-12-25')];
  assert.deepEqual(visibleToFriend(gifts, '2026-10-02').map((g) => g.costCents), [2, 3]);
});

test('sharing preview: one gift is still hidden from the friend, and you are behind', () => {
  const { given, received } = sharingPreview('2026-10-02');
  assert.equal(given.length - visibleToFriend(given, '2026-10-02').length, 1);
  assert.equal(balance(given, received).gapCents, 4500);
});

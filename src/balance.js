// Money each way between you and one person, so you know which side is ahead.
// Pure functions over gift objects that carry costCents (null when unknown).

const sumCost = (items) => items.reduce((t, g) => t + (g.costCents ?? 0), 0);

// given: gifts you gave them. received: gifts they gave you.
// gapCents > 0 means they've spent that much more on you than you on them.
export function balance(given, received) {
  const givenCents = sumCost(given);
  const receivedCents = sumCost(received);
  return {
    givenCents,
    receivedCents,
    gapCents: receivedCents - givenCents,
    unpriced: [...given, ...received].filter((g) => g.costCents === null).length,
  };
}

// Planned sharing: a friend sees a gift once its occasion has come, so logging early spoils nothing.
export const visibleToFriend = (gifts, today) => gifts.filter((g) => g.occasionDate <= today);

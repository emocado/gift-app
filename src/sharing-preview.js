// Made-up data for the "share with friends" preview page. Sharing isn't built yet;
// this shows how it would look. Nothing here touches the database.

const SAMPLE_FRIEND = 'Amy';

// Dates are relative to this year, so the preview always has a past and a coming occasion.
export function sharingPreview(today) {
  const y = Number(today.slice(0, 4));
  // Bought on the day, or today for an occasion still to come.
  const gift = (id, what, occasion, occasionDate, cost) => ({
    id, what, occasion, occasionDate, givenDate: occasionDate < today ? occasionDate : today, costCents: cost * 100, eventName: null,
  });
  // What you gave Amy. The last one is for an occasion still to come.
  const given = [
    gift(4, 'Silver earrings', 'christmas', `${y}-12-25`, 40),
    gift(3, 'Scented candle', 'christmas', `${y - 1}-12-25`, 20),
    gift(2, 'Cookbook', 'birthday', `${y - 1}-03-14`, 30),
    gift(1, 'Wool scarf', 'christmas', `${y - 2}-12-25`, 25),
  ];
  // What Amy gave you, as she would log it on her side.
  const received = [
    { id: 3, what: 'Perfume', receivedDate: `${y - 1}-12-25`, costCents: 6500 },
    { id: 2, what: 'Leather wallet', receivedDate: `${y - 1}-08-02`, costCents: 8000 },
    { id: 1, what: 'Coffee mug', receivedDate: `${y - 2}-12-25`, costCents: 1500 },
  ];
  return { friend: SAMPLE_FRIEND, given, received };
}

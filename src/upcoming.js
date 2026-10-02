// Upcoming occasions with covered / still-to-buy. One source for both the home page
// and the reminder email, so a missed email never shows something the app doesn't.
import { upcomingOccasions } from './occasions.js';
import { coverage, personHistory } from './coverage.js';
import { occasionLabel } from './views.js';

const sameKind = (occ) => (g) => g.occasion === occ.occasion && (occ.occasion !== 'event' || g.eventId === occ.eventId);

// The most recent gift for an occasion before `occ`, same kind first (last birthday
// for a birthday), so "last time" never shows a gift for something still to come.
export function lastGiftBefore(occ, history) {
  const past = history.filter((g) => g.occasionDate < occ.date);
  return past.find(sameKind(occ)) ?? past[0] ?? null;
}

export function upcomingSections(db, today, days) {
  const people = db.listPeople();
  const gifts = db.listGifts();
  const events = db.listEvents();
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const eventName = new Map(events.map((e) => [e.id, e.name]));
  return upcomingOccasions(people, today, days, events).map((occ) => {
    const { covered, missing } = coverage(occ, people, gifts);
    return {
      occ,
      label: occasionLabel(occ.occasion, occ.date, occ.occasion === 'event' ? eventName.get(occ.eventId) : nameOf.get(occ.personId)),
      covered,
      missing: missing.map((person) => ({ person, lastGift: lastGiftBefore(occ, personHistory(person.id, gifts)) })),
    };
  });
}

export const localToday = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

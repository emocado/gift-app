// HTML pages. Server-rendered forms that work without JavaScript; a few lines of
// script only add niceties (busy state, delete confirmation, example chips).
import { formatCost } from './money.js';
import { daysBetween, nextEventDate } from './occasions.js';
import { seasonFor } from './season.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (iso) => DAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];

export const formatDate = (iso) => (iso ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : '—');
const formatShort = (iso) => `${weekday(iso).slice(0, 3)}, ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const formatToday = (iso) => `${weekday(iso)}, ${Number(iso.slice(8, 10))} ${LONG_MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const formatBirthday = (md) => (md ? `${Number(md.slice(3, 5))} ${MONTHS[Number(md.slice(0, 2)) - 1]}` : null);

// name: the person's name for a birthday, or the event's name for a custom event.
export function occasionLabel(occasion, date, name = null) {
  const year = date.slice(0, 4);
  if (occasion === 'christmas') return `Christmas ${year}`;
  if (occasion === 'event') return `${name ?? 'Event'} ${year}`;
  return name ? `${name}'s birthday ${year}` : `Birthday ${year}`;
}

const whenLabel = (today, date) => {
  const d = daysBetween(today, date);
  return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `in ${d} days`;
};

const giftUrl = (params) => `/gifts/new?${new URLSearchParams(params)}`;
const dupBadge = (g) => (g.possibleDuplicate ? ' <span class="badge">possible duplicate</span>' : '');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// --- small building blocks -------------------------------------------------------

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 7v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1.4" fill="#fff"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 11v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.4" fill="#fff"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  gift: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 3c.3 0 .5.2.6.5l1 3.4a5 5 0 0 0 3.5 3.5l3.4 1c.6.2.6 1 0 1.2l-3.4 1a5 5 0 0 0-3.5 3.5l-1 3.4c-.2.6-1 .6-1.2 0l-1-3.4a5 5 0 0 0-3.5-3.5l-3.4-1c-.6-.2-.6-1 0-1.2l3.4-1a5 5 0 0 0 3.5-3.5l1-3.4c.1-.3.3-.5.6-.5Z"/><path d="M18.5 1.5c.2 0 .3.1.4.3l.4 1.3c.2.6.6 1 1.2 1.2l1.3.4c.4.1.4.7 0 .8l-1.3.4c-.6.2-1 .6-1.2 1.2l-.4 1.3c-.1.4-.7.4-.8 0l-.4-1.3c-.2-.6-.6-1-1.2-1.2l-1.3-.4c-.4-.1-.4-.7 0-.8l1.3-.4c.6-.2 1-.6 1.2-1.2l.4-1.3c.1-.2.2-.3.4-.3Z"/></svg>',
};

const AVATAR_COLORS = ['#ff9f0a', '#ff375f', '#bf5af2', '#5e5ce6', '#0a84ff', '#30d158', '#40c8e0', '#ff6b3d', '#ac8e68'];
function avatar(name, size = '') {
  const hash = [...name].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
  const initials = name.trim().split(/\s+/).map((w) => [...w][0] ?? '').slice(0, 2).join('').toUpperCase();
  return `<span class="avatar ${size}" style="--c:${AVATAR_COLORS[hash % AVATAR_COLORS.length]}" aria-hidden="true">${esc(initials)}</span>`;
}

const OCC_EMOJI = { christmas: '🎄', birthday: '🎂', event: '🎉' };
const occIcon = (occasion, size = '') =>
  `<span class="occ-icon ${occasion} ${size}" aria-hidden="true">${OCC_EMOJI[occasion]}</span>`;

function ring(done, total) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const frac = total ? done / total : 0;
  const full = total > 0 && done >= total;
  return `<div class="ring${full ? ' full' : ''}" role="img" aria-label="${done} of ${total} covered">
    <svg viewBox="0 0 56 56" width="56" height="56"><circle cx="28" cy="28" r="${r}" class="track"/>
      ${done ? `<circle cx="28" cy="28" r="${r}" class="bar" stroke-dasharray="${(frac * c).toFixed(1)} ${c.toFixed(1)}"/>` : ''}</svg>
    <span>${full ? ICONS.check : `${done}/${total}`}</span></div>`;
}

const tile = (label, value, sub = '') =>
  `<div class="tile"><div class="tile-k">${label}</div><div class="tile-v">${value}</div>${sub ? `<div class="tile-s">${sub}</div>` : ''}</div>`;

// --- page shell -----------------------------------------------------------------

const STYLE = `
  :root {
    --bg:#f5f5f7; --card:#fff; --fg:#1d1d1f; --fg2:#6e6e73; --fg3:#8e8e93;
    --sep:rgba(60,60,67,.13); --fill:rgba(120,120,128,.12); --fill2:rgba(120,120,128,.07);
    --tint:#0071e3; --tint-hover:#0077ed; --tint-soft:rgba(0,113,227,.1); --tint-ring:rgba(0,113,227,.22);
    --green:#248a3d; --green-solid:#34c759; --green-bg:rgba(52,199,89,.13);
    --orange:#c93400; --orange-solid:#ff9500; --orange-bg:rgba(255,149,0,.13); --red:#e30000;
    --switch-off:#e9e9eb; --nav:rgba(245,245,247,.75); --nav-line:rgba(0,0,0,.08);
    --shadow:0 1px 1px rgba(0,0,0,.02), 0 4px 18px rgba(0,0,0,.05); --card-line:transparent;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:#000; --card:#1c1c1e; --fg:#f5f5f7; --fg2:#a1a1a6; --fg3:#8e8e93;
      --sep:rgba(84,84,88,.5); --fill:rgba(118,118,128,.24); --fill2:rgba(118,118,128,.14);
      --tint:#0a84ff; --tint-hover:#409cff; --tint-soft:rgba(10,132,255,.18); --tint-ring:rgba(10,132,255,.35);
      --green:#30d158; --green-solid:#30d158; --green-bg:rgba(48,209,88,.16);
      --orange:#ff9f0a; --orange-solid:#ff9f0a; --orange-bg:rgba(255,159,10,.16); --red:#ff453a;
      --switch-off:#39393d; --nav:rgba(22,22,23,.72); --nav-line:rgba(255,255,255,.08);
      --shadow:none; --card-line:rgba(255,255,255,.06);
    }
  }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; color-scheme:light dark; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.47 Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
         letter-spacing:-.011em; -webkit-font-smoothing:antialiased; font-feature-settings:"cv11","ss01"; }
  a { color:var(--tint); text-decoration:none; }
  a:hover { text-decoration:underline; }
  .wrap { max-width:760px; margin:0 auto; padding:0 20px; }
  main.wrap { padding-top:28px; padding-bottom:72px; }

  /* top bar */
  .topbar { position:sticky; top:0; z-index:10; background:var(--nav); backdrop-filter:saturate(180%) blur(20px); -webkit-backdrop-filter:saturate(180%) blur(20px); border-bottom:.5px solid var(--nav-line); }
  .topbar .wrap { display:flex; align-items:center; gap:16px; height:56px; }
  .brand { display:flex; align-items:center; gap:9px; font-weight:650; font-size:17px; color:var(--fg); letter-spacing:-.02em; }
  .brand:hover { text-decoration:none; }
  .brand-mark { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; color:#fff; background:linear-gradient(160deg,#ff6b6b,#e0245e); box-shadow:inset 0 0 0 .5px rgba(0,0,0,.1); }
  .tabs { display:flex; gap:2px; background:var(--fill); padding:2px; border-radius:9px; margin-left:auto; }
  .tabs a { padding:5px 16px; border-radius:7px; font-size:14px; font-weight:500; color:var(--fg); }
  .tabs a:hover { text-decoration:none; background:var(--fill2); }
  .tabs a.on { background:var(--card); box-shadow:0 1px 3px rgba(0,0,0,.12), 0 0 0 .5px rgba(0,0,0,.04); }

  /* type */
  .eyebrow { margin:0 0 2px; color:var(--fg2); font-size:15px; font-weight:500; }
  h1 { font-size:34px; line-height:1.12; font-weight:700; letter-spacing:-.028em; margin:0; }
  .lede { color:var(--fg2); margin:8px 0 0; font-size:17px; max-width:56ch; }
  .page-head { display:flex; align-items:flex-end; gap:16px; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; }
  h2 { font-size:19px; line-height:1.25; font-weight:650; letter-spacing:-.02em; margin:0; }
  .section-title { font-size:22px; font-weight:700; letter-spacing:-.022em; margin:36px 0 12px; }
  .muted { color:var(--fg2); }
  .small { font-size:13px; }

  /* buttons */
  .btn, button { display:inline-flex; align-items:center; justify-content:center; gap:6px; border:0; border-radius:980px; padding:9px 18px; font:inherit; font-size:15px; font-weight:550;
                 background:var(--tint); color:#fff; cursor:pointer; transition:background .15s, transform .1s, opacity .15s; white-space:nowrap; text-decoration:none; }
  .btn:hover, button:hover { background:var(--tint-hover); text-decoration:none; }
  .btn:active, button:active { transform:scale(.97); }
  .btn.lg { padding:12px 22px; font-size:17px; }
  .btn.soft, button.soft { background:var(--tint-soft); color:var(--tint); }
  .btn.soft:hover, button.soft:hover { background:var(--tint-ring); }
  .btn.sm { padding:5px 14px; font-size:14px; }
  .btn.plain, button.plain { background:transparent; color:var(--tint); padding-left:8px; padding-right:8px; }
  button.icon { background:transparent; color:var(--fg3); padding:8px; border-radius:50%; }
  button.icon:hover { background:var(--fill); color:var(--red); }
  button:disabled { opacity:.6; cursor:default; transform:none; }

  /* cards and lists */
  .card { background:var(--card); border-radius:18px; box-shadow:var(--shadow); border:.5px solid var(--card-line); overflow:hidden; }
  .card + .card { margin-top:16px; }
  .card-pad { padding:20px; }
  .list { list-style:none; margin:0; padding:0; }
  .list li { display:flex; align-items:center; gap:12px; padding-left:20px; }
  .row-main { flex:1; min-width:0; display:flex; align-items:center; gap:12px; padding:12px 20px 12px 0; }
  .list li + li .row-main { border-top:.5px solid var(--sep); }
  .row-text { flex:1; min-width:0; }
  .row-title { font-weight:550; color:var(--fg); display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  a.row-link { display:flex; align-items:center; gap:12px; flex:1; min-width:0; color:inherit; }
  a.row-link:hover { text-decoration:none; }
  a.row-link:hover .row-title { color:var(--tint); }
  .row-sub { display:block; color:var(--fg2); font-size:14px; overflow:hidden; text-overflow:ellipsis; }
  .row-end { color:var(--fg2); font-size:15px; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .chev { color:var(--fg3); opacity:.7; display:flex; }
  .group-label { padding:16px 20px 4px; font-size:13px; font-weight:600; color:var(--fg2); letter-spacing:0; }
  .empty-row { padding:12px 20px 16px; color:var(--fg2); }

  .avatar { --c:#8e8e93; width:40px; height:40px; flex:none; border-radius:50%; display:grid; place-items:center; color:#fff; font-weight:600; font-size:15px; letter-spacing:0;
            background:linear-gradient(180deg, color-mix(in srgb, var(--c) 70%, #fff), var(--c)); position:relative; }
  .avatar.lg { width:88px; height:88px; font-size:34px; }
  .avatar-wrap { position:relative; display:inline-flex; flex:none; }
  .avatar-wrap .tick { position:absolute; right:-2px; bottom:-2px; width:18px; height:18px; border-radius:50%; background:var(--green-solid); color:#fff; display:grid; place-items:center; border:2px solid var(--card); }
  .occ-icon { width:44px; height:44px; flex:none; border-radius:12px; display:grid; place-items:center; font-size:24px; }
  .occ-icon.sm { width:36px; height:36px; border-radius:10px; font-size:19px; }
  .occ-icon.christmas { background:var(--green-bg); }
  .occ-icon.birthday { background:rgba(255,55,95,.12); }
  .occ-icon.event { background:rgba(175,82,222,.13); }
  .badge { display:inline-block; background:var(--orange-bg); color:var(--orange); border-radius:6px; padding:1px 7px; font-size:12px; font-weight:600; white-space:nowrap; vertical-align:1px; }
  .tag { display:inline-flex; align-items:center; gap:4px; background:var(--fill2); color:var(--fg2); border-radius:6px; padding:1px 8px; font-size:13px; font-weight:500; }
  .tag.warn { background:var(--orange-bg); color:var(--orange); }

  /* home */
  .tiles { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:28px; }
  .tile { background:var(--card); border-radius:16px; padding:16px 18px; box-shadow:var(--shadow); border:.5px solid var(--card-line); min-width:0; }
  .tile-k { font-size:13px; color:var(--fg2); font-weight:500; }
  .tile-v { font-size:24px; font-weight:700; letter-spacing:-.025em; margin-top:2px; font-variant-numeric:tabular-nums; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tile-s { font-size:13px; color:var(--fg2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .occ-head { display:flex; align-items:center; gap:14px; padding:20px 20px 8px; }
  .occ-head .grow { flex:1; min-width:0; }
  .when { display:inline-block; margin-left:6px; background:var(--tint-soft); color:var(--tint); border-radius:6px; padding:0 7px; font-size:13px; font-weight:600; }
  .ring { position:relative; width:56px; height:56px; flex:none; }
  .ring svg { transform:rotate(-90deg); }
  .ring circle { fill:none; stroke-width:5; }
  .ring .track { stroke:var(--fill); }
  .ring .bar { stroke:var(--green-solid); stroke-linecap:round; transition:stroke-dasharray .6s; }
  .ring span { position:absolute; inset:0; display:grid; place-items:center; font-size:13px; font-weight:650; font-variant-numeric:tabular-nums; }
  .ring.full span { color:var(--green); }
  .ring.full span svg { width:20px; height:20px; transform:none; }
  .card-foot { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:12px 20px; background:var(--fill2); font-size:14px; color:var(--fg2); border-top:.5px solid var(--sep); margin-top:8px; }
  .card-foot strong { color:var(--fg); font-weight:600; font-variant-numeric:tabular-nums; }
  .over { color:var(--orange); font-weight:600; }
  .under { color:var(--green); font-weight:600; }
  .hero { text-align:center; padding:48px 24px; }
  .hero .mark { width:72px; height:72px; margin:0 auto 18px; border-radius:20px; display:grid; place-items:center; color:#fff; background:linear-gradient(160deg,#ff6b6b,#e0245e); box-shadow:0 10px 30px -8px rgba(224,36,94,.5); }
  .hero .mark svg { width:36px; height:36px; }
  .hero p { color:var(--fg2); max-width:42ch; margin:10px auto 24px; font-size:17px; }
  .hero .actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }

  /* banners */
  .banner { display:flex; gap:10px; align-items:flex-start; padding:12px 16px; border-radius:14px; background:var(--card); box-shadow:var(--shadow); border:.5px solid var(--card-line); margin-bottom:16px; font-size:15px; }
  .banner .ic { flex:none; display:flex; margin-top:1px; color:var(--green-solid); }
  .banner.warn { background:var(--orange-bg); box-shadow:none; border-color:transparent; }
  .banner.warn .ic { color:var(--orange-solid); }
  .banner.info .ic { color:var(--tint); }

  /* forms */
  label { font-weight:500; }
  .field { padding:14px 20px; }
  .field + .field, .field-row + .field, .field + .field-row { border-top:.5px solid var(--sep); }
  .field > label, .field > .label { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--fg2); font-weight:600; margin-bottom:6px; }
  .field-row { display:grid; grid-template-columns:1fr 1fr; }
  .field-row .field + .field { border-top:0; border-left:.5px solid var(--sep); }
  input, select { width:100%; padding:10px 14px; font:inherit; font-size:16px; color:var(--fg); background:var(--fill2); border:1px solid transparent; border-radius:10px; outline:none; transition:border-color .15s, box-shadow .15s, background .15s; letter-spacing:-.011em; }
  input:hover, select:hover { background:var(--fill); }
  input:focus, select:focus { background:var(--card); border-color:var(--tint); box-shadow:0 0 0 4px var(--tint-ring); }
  input::placeholder { color:var(--fg3); }
  select { appearance:none; -webkit-appearance:none; padding-right:34px; cursor:pointer;
           background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E");
           background-repeat:no-repeat; background-position:right 12px center; }
  .money { position:relative; }
  .money::before { content:"S$"; position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--fg3); pointer-events:none; }
  .money input { padding-left:38px; font-variant-numeric:tabular-nums; }
  .field.ai input, .field.ai .seg { background:var(--tint-soft); }
  .ai-tag { display:inline-flex; align-items:center; gap:3px; color:var(--tint); font-size:12px; font-weight:600; }
  .ai-tag svg { width:12px; height:12px; }
  .form-actions { display:flex; gap:8px; align-items:center; padding:16px 20px 20px; }
  details summary { cursor:pointer; color:var(--tint); font-size:15px; list-style:none; display:flex; align-items:center; gap:6px; }
  details summary::-webkit-details-marker { display:none; }
  details summary svg { transition:transform .2s; }
  details[open] summary svg { transform:rotate(90deg); }
  details .inner { padding-top:12px; }
  .hint { color:var(--fg2); font-size:13px; margin:8px 0 0; }
  .field > label.check-row { color:var(--fg); font-weight:500; margin-bottom:0; }
  .check-row { display:flex; align-items:center; gap:12px; justify-content:space-between; margin-top:10px; padding:10px 14px; border-radius:10px; background:var(--orange-bg); font-size:15px; }
  input[type=checkbox] { width:auto; }

  /* segmented control */
  .seg { display:inline-flex; background:var(--fill); padding:2px; border-radius:9px; gap:2px; }
  .seg label { position:relative; margin:0; cursor:pointer; }
  .seg input { position:absolute; inset:0; opacity:0; margin:0; cursor:pointer; }
  .seg span { display:block; padding:6px 20px; border-radius:7px; font-size:14px; font-weight:500; transition:background .15s; }
  .seg input:checked + span { background:var(--card); box-shadow:0 1px 3px rgba(0,0,0,.12), 0 0 0 .5px rgba(0,0,0,.04); }
  .seg input:focus-visible + span { outline:2px solid var(--tint); outline-offset:1px; }

  /* switch */
  input.switch { appearance:none; -webkit-appearance:none; flex:none; width:51px; height:31px; border-radius:31px; background:var(--switch-off); border:0; padding:0; position:relative; cursor:pointer; transition:background .2s; box-shadow:none; }
  input.switch::before { content:""; position:absolute; top:2px; left:2px; width:27px; height:27px; border-radius:50%; background:#fff; box-shadow:0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.16); transition:transform .2s; }
  input.switch:checked { background:var(--green-solid); }
  input.switch:checked::before { transform:translateX(20px); }
  input.switch:focus-visible { box-shadow:0 0 0 4px var(--tint-ring); }
  .switch-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .bday { display:flex; gap:8px; }
  .bday select { width:auto; min-width:96px; }
  .switch-row > label { font-size:16px; font-weight:500; color:var(--fg); }

  /* AI card */
  .ai-card { position:relative; background:var(--card); border-radius:20px; padding:20px; margin-bottom:24px; box-shadow:0 12px 40px -16px rgba(124,58,237,.35), var(--shadow); }
  .ai-card::before { content:""; position:absolute; inset:0; border-radius:inherit; padding:1.5px; pointer-events:none;
                     background:linear-gradient(115deg,#0a84ff,#a855f7 30%,#ff375f 60%,#ff9f0a 85%,#0a84ff); background-size:200% 100%;
                     -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; }
  .ai-card.busy::before { animation:flow 1.4s linear infinite; }
  @keyframes flow { to { background-position:-200% 0; } }
  .ai-title { display:flex; align-items:center; gap:8px; font-weight:650; font-size:17px; margin-bottom:4px; letter-spacing:-.02em; }
  .ai-title .spark { display:flex; color:#a855f7; }
  .ai-sub { color:var(--fg2); font-size:14px; margin:0 0 14px; }
  .ai-input { display:flex; gap:8px; }
  .ai-input input { flex:1; font-size:17px; padding:12px 16px; border-radius:12px; }
  .ai-input button { padding:0 20px; border-radius:12px; }
  .examples { display:flex; gap:6px; flex-wrap:wrap; margin-top:12px; }
  .example { background:var(--fill2); color:var(--fg2); border-radius:980px; padding:5px 12px; font-size:13px; font-weight:500; }
  .example:hover { background:var(--fill); color:var(--fg); }
  .spinner { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; animation:spin .7s linear infinite; display:none; }
  .busy .spinner { display:inline-block; }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* list toggles: a hidden checkbox inside a pill */
  .chips { display:flex; flex-wrap:wrap; gap:8px; }
  .chip { position:relative; display:inline-flex; align-items:center; gap:6px; margin:0; padding:6px 14px; border-radius:980px; background:var(--fill2); color:var(--fg);
          font-size:14px; font-weight:500; cursor:pointer; user-select:none; transition:background .15s, color .15s; }
  .chip:hover { background:var(--fill); }
  .chip input { position:absolute; opacity:0; width:1px; height:1px; }
  .chip:has(input:checked) { background:var(--tint); color:#fff; }
  .chip:has(input:checked)::before { content:"✓"; font-weight:700; }
  .chip:has(input:focus-visible) { outline:2px solid var(--tint); outline-offset:2px; }

  /* events */
  .row-edit { padding:0 20px 16px 76px; }
  .row-edit summary { font-size:14px; }
  .row-edit .inner { display:grid; gap:14px; }
  button.danger { color:var(--red); background:transparent; padding:0; font-size:14px; }
  button.danger:hover { background:transparent; text-decoration:underline; }
  .stack { display:grid; gap:14px; }
  .lbl { display:block; font-size:13px; color:var(--fg2); font-weight:600; margin-bottom:6px; }
  .two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  /* seasons: a soft wash of colour and a few slow falling things behind the cards */
  .s-winter { --season:#64d2ff; --particle:rgba(150,185,220,.75); }
  .s-spring { --season:#ff8fb1; --particle:rgba(242,160,190,.8); }
  .s-summer { --season:#40c8e0; --particle:rgba(110,170,190,.5); }
  .s-autumn { --season:#ff9f0a; --particle:rgba(217,130,70,.75); }
  @media (prefers-color-scheme: dark) {
    .s-winter { --particle:rgba(230,238,246,.55); } .s-spring { --particle:rgba(232,163,184,.5); }
    .s-summer { --particle:rgba(120,170,180,.4); } .s-autumn { --particle:rgba(200,120,60,.55); }
  }
  body { background:var(--bg) linear-gradient(180deg, color-mix(in srgb, var(--season, var(--bg)) 9%, var(--bg)), var(--bg) 420px) no-repeat; }
  main.wrap { position:relative; z-index:1; }
  .season-emoji { font-size:15px; }
  .sky { position:fixed; inset:0; overflow:hidden; pointer-events:none; z-index:0; }
  .sky span { position:absolute; top:-24px; left:var(--x); width:calc(9px * var(--size)); height:calc(9px * var(--size)); background:var(--particle);
              animation:fall var(--dur) linear var(--delay) infinite; }
  .sky-winter span { border-radius:50%; }
  .sky-spring span { border-radius:70% 0 70% 0; animation-name:fall, turn; animation-duration:var(--dur), calc(var(--dur) / 2); }
  .sky-autumn span { width:calc(12px * var(--size)); border-radius:0 80% 0 80%; animation-name:fall, turn; animation-duration:var(--dur), calc(var(--dur) / 2); }
  .sky-summer span { width:2px; height:calc(16px * var(--size)); border-radius:2px; animation-duration:calc(var(--dur) / 4); }
  @keyframes fall { 0% { transform:translate(0, 0); } 50% { transform:translate(24px, 52vh); } 100% { transform:translate(-8px, 105vh); } }
  @keyframes turn { to { rotate:360deg; } }

  /* person */
  .person-head { display:flex; align-items:center; gap:20px; margin-bottom:24px; flex-wrap:wrap; }
  .person-head .meta { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
  .people-add { display:grid; grid-template-columns:1.4fr 1fr; gap:14px 12px; align-items:end; }
  .people-add .full { grid-column:1 / -1; }
  form.inline { display:inline; margin:0; }

  @media (max-width:640px) {
    h1 { font-size:30px; }
    .tiles { grid-template-columns:1fr; }
    .tabs a { padding:5px 12px; }
    .brand span.name { display:none; }
    .field-row { grid-template-columns:1fr; }
    .field-row .field + .field { border-left:0; border-top:.5px solid var(--sep); }
    .people-add, .two { grid-template-columns:1fr; }
    .row-edit { padding-left:20px; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition:none !important; animation:none !important; } .sky { display:none; } }
`;

const SCRIPT = `
  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.dataset.confirm && !confirm(f.dataset.confirm)) return e.preventDefault();
    if (!f.hasAttribute('data-busy')) return;
    const b = f.querySelector('[type=submit]');
    f.closest('.ai-card')?.classList.add('busy');
    if (b) { b.classList.add('busy'); b.querySelector('.label').textContent = f.dataset.busy; setTimeout(() => (b.disabled = true)); }
  });
  window.addEventListener('pageshow', () => document.querySelectorAll('.busy').forEach((el) => {
    el.classList.remove('busy'); el.disabled = false;
    const l = el.querySelector?.('.label'); if (l && el.dataset.idle) l.textContent = el.dataset.idle;
  }));
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-fill]');
    if (!c) return;
    const i = document.getElementById(c.dataset.target);
    i.value = c.dataset.fill; i.focus();
  });
`;

const FAVICON = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='88'>🎁</text></svg>")}`;

// A few falling flakes, petals, drops or leaves behind the page. CSS only, fixed
// positions (no randomness), so pages render the same every time.
const PARTICLES = 14;
function sky(season) {
  const bits = Array.from({ length: PARTICLES }, (_, i) => {
    const x = (i * 37 + 11) % 100;
    const dur = 11 + ((i * 7) % 9);
    const delay = -((i * 5.3) % dur).toFixed(1);
    const size = 0.6 + ((i * 3) % 5) / 10;
    return `<span style="--x:${x}%;--dur:${dur}s;--delay:${delay}s;--size:${size.toFixed(1)}"></span>`;
  });
  return `<div class="sky sky-${season.key}" aria-hidden="true">${bits.join('')}</div>`;
}

function layout({ title, active = '', body, flash = '', season = seasonFor(new Date().toLocaleDateString('en-CA')) }) {
  const tab = (href, name, label) => `<a href="${href}" class="${active === name ? 'on' : ''}">${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>${STYLE}</style>
</head>
<body class="s-${season.key}">
${sky(season)}
<header class="topbar"><div class="wrap">
  <a class="brand" href="/"><span class="brand-mark">${ICONS.gift}</span><span class="name">Gifts</span><span class="season-emoji" aria-hidden="true">${season.emoji}</span></a>
  <nav class="tabs" aria-label="Main">${tab('/', 'home', 'Home')}${tab('/people', 'people', 'People')}${tab('/events', 'events', 'Events')}</nav>
  <a class="btn sm" href="/gifts/new">${ICONS.plus} Add a gift</a>
</div></header>
<main class="wrap">
${flash}
${body}
</main>
<script>${SCRIPT}</script>
</body>
</html>`;
}

// Success unless the message carries a warning (a duplicate, an unreadable cost).
export function flashBox(msg, kind = '') {
  if (!msg) return '';
  const k = kind || (/duplicate|isn't a number/i.test(msg) ? 'warn' : 'ok');
  const ic = k === 'ok' ? ICONS.checkCircle : k === 'info' ? ICONS.info : ICONS.warn;
  return `<div class="banner flash ${k === 'error' ? 'warn error' : k}" role="status"><span class="ic">${ic}</span><div>${esc(msg)}</div></div>`;
}

// --- home -----------------------------------------------------------------------

function missingRow({ person, lastGift }, prefill) {
  const sub = lastGift
    ? `Last time: ${esc(lastGift.what)} · ${esc(occasionLabel(lastGift.occasion, lastGift.occasionDate, lastGift.eventName))} · ${formatCost(lastGift.costCents)}`
    : 'Nothing recorded yet';
  return `<li><div class="row-main">
      <a class="row-link" href="/people/${person.id}">${avatar(person.name)}
        <span class="row-text"><span class="row-title">${esc(person.name)}</span><span class="row-sub">${sub}</span></span></a>
      <a class="btn soft sm" href="${esc(giftUrl({ ...prefill, person: person.name }))}">Log gift</a>
    </div></li>`;
}

function coveredRow({ person, gifts }) {
  const total = gifts.reduce((t, g) => t + (g.costCents ?? 0), 0);
  return `<li><div class="row-main">
      <a class="row-link" href="/people/${person.id}"><span class="avatar-wrap">${avatar(person.name)}<span class="tick">${ICONS.check}</span></span>
        <span class="row-text"><span class="row-title">${esc(person.name)}</span>
          <span class="row-sub">${gifts.map((g) => `${esc(g.what)}${dupBadge(g)}`).join(', ')}</span></span></a>
      <span class="row-end">${gifts.some((g) => g.costCents !== null) ? formatCost(total) : '—'}</span>
    </div></li>`;
}

function spendLine(spentCents, lastYearCents) {
  const left = `Spent <strong>${formatCost(spentCents)}</strong>`;
  if (lastYearCents === null) return `<span>${left}</span><span>No spend logged last year</span>`;
  const diff = spentCents - lastYearCents;
  const vs =
    diff > 0
      ? `<span class="over">${formatCost(diff)} over</span> last year’s <strong>${formatCost(lastYearCents)}</strong>`
      : `<span class="under">${formatCost(-diff)} left</span> of last year’s <strong>${formatCost(lastYearCents)}</strong>`;
  return `<span>${left}</span><span>${vs}</span>`;
}

function occasionCard(today, { occ, label, covered, missing, spentCents = 0, lastYearCents = null }) {
  const prefill = { occasion: occ.occasion === 'event' ? `event:${occ.eventId}` : occ.occasion, occasionDate: occ.date };
  const total = covered.length + missing.length;
  return `<section class="card">
      <div class="occ-head">${occIcon(occ.occasion)}
        <div class="grow"><h2>${esc(label)}</h2>
          <div class="muted small">${formatShort(occ.date)} ${formatDate(occ.date).slice(-4)}<span class="when">${whenLabel(today, occ.date)}</span></div></div>
        ${ring(covered.length, total)}</div>
      ${missing.length ? `<div class="group-label">Still to buy (${missing.length})</div><ul class="list">${missing.map((m) => missingRow(m, prefill)).join('')}</ul>` : '<div class="empty-row">Everyone is covered. 🎉</div>'}
      ${covered.length ? `<div class="group-label">Covered (${covered.length})</div><ul class="list">${covered.map(coveredRow).join('')}</ul>` : ''}
      <div class="card-foot">${spendLine(spentCents, lastYearCents)}</div>
    </section>`;
}

// sections: [{ occ, label, covered, missing, spentCents, lastYearCents }] — missing entries carry lastGift.
export function homePage({ today, sections, peopleCount, flash, season }) {
  if (peopleCount === 0) {
    return layout({
      title: 'Gifts',
      active: 'home',
      flash,
      season,
      body: `<section class="card hero"><div class="mark">${ICONS.gift}</div>
        <h1>Gifts</h1>
        <p>${esc(season.greeting)} Your list is empty. Add the people you give gifts to, or just log a gift and the name is added as you go.</p>
        <div class="actions"><a class="btn lg" href="/gifts/new">Add a gift</a><a class="btn lg soft" href="/people">Add people</a></div></section>`,
    });
  }
  const [next] = sections;
  const toBuy = new Set(sections.flatMap((s) => s.missing.map((m) => m.person.id))).size;
  const spent = sections.reduce((t, s) => t + (s.spentCents ?? 0), 0);
  const tiles = `<div class="tiles">
      ${tile('Next up', esc(whenLabel(today, next.occ.date).replace(/^in /, '')), esc(next.label))}
      ${tile('Still to buy', plural(toBuy, 'person').replace('persons', 'people'), toBuy ? 'across what’s coming up' : 'You’re all set')}
      ${tile('Spent so far', formatCost(spent), 'for what’s coming up')}
    </div>`;
  return layout({
    title: 'Gifts',
    active: 'home',
    flash,
    season,
    body: `<div class="page-head"><div><p class="eyebrow">${formatToday(today)}</p><h1>Coming up</h1><p class="lede">${esc(season.greeting)}</p></div></div>
      ${tiles}
      ${sections.map((s) => occasionCard(today, s)).join('')}`,
  });
}

// --- person ---------------------------------------------------------------------

function birthdayFields(md) {
  const [m, d] = md ? md.split('-').map(Number) : [0, 0];
  const opt = (val, label, sel) => `<option value="${val}" ${sel ? 'selected' : ''}>${label}</option>`;
  return `<div class="bday"><select name="bday" aria-label="Birthday day">${opt('', 'Day', !d)}${Array.from({ length: 31 }, (_, i) => opt(i + 1, i + 1, d === i + 1)).join('')}</select>
    <select name="bmonth" aria-label="Birthday month">${opt('', 'Month', !m)}${MONTHS.map((n, i) => opt(i + 1, n, m === i + 1)).join('')}</select></div>`;
}

const chip = (name, label, checked) =>
  `<label class="chip"><input type="checkbox" name="${name}" value="1" ${checked ? 'checked' : ''}>${label}</label>`;

// Christmas plus every custom event, as pill toggles.
const listChips = (events, { onChristmasList, eventIds = [] }) =>
  `<div class="chips">${chip('christmas', '🎄 Christmas', onChristmasList)}${events
    .map((e) => chip(`event_${e.id}`, `🎉 ${esc(e.name)}`, eventIds.includes(e.id)))
    .join('')}</div>`;

function historyRow(g) {
  return `<li>${occIcon(g.occasion, 'sm')}<div class="row-main">
      <span class="row-text"><span class="row-title">${esc(g.what)}${dupBadge(g)}</span>
        <span class="row-sub">${esc(occasionLabel(g.occasion, g.occasionDate, g.eventName))} · Bought ${formatDate(g.givenDate)}</span></span>
      <span class="row-end">${formatCost(g.costCents)}</span>
      <form class="inline" method="post" action="/gifts/${g.id}/delete" data-confirm="${esc(`Delete “${g.what}”? This can’t be undone.`)}">
        <button class="icon" type="submit" aria-label="${esc(`Delete ${g.what}`)}" title="Delete">${ICONS.trash}</button></form>
    </div></li>`;
}

export function personPage({ person, history, flash, error, season, events = [] }) {
  const onEvents = events.filter((e) => person.eventIds?.includes(e.id));
  const tags = [
    person.birthday ? `<span class="tag">🎂 Birthday ${formatBirthday(person.birthday)}</span>` : '<span class="tag">No birthday set</span>',
    person.onChristmasList ? '<span class="tag">🎄 On the Christmas list</span>' : '<span class="tag">Not on the Christmas list</span>',
    ...onEvents.map((e) => `<span class="tag">🎉 ${esc(e.name)}</span>`),
  ];
  if (!person.birthday && !person.onChristmasList && !onEvents.length) tags.push('<span class="tag warn">Won’t show on the home page</span>');
  const priced = history.filter((g) => g.costCents !== null);
  const spent = priced.reduce((t, g) => t + g.costCents, 0);
  const stats = history.length
    ? `<div class="tiles">
        ${tile('Gifts logged', history.length)}
        ${tile('Total spent', formatCost(spent))}
        ${tile('Average gift', priced.length ? formatCost(Math.round(spent / priced.length)) : '—', `across ${plural(priced.length, 'priced gift')}`)}
      </div>`
    : '';
  const list = history.length
    ? `<ul class="list">${history.map(historyRow).join('')}</ul>`
    : `<div class="empty-row" style="padding-top:16px">Nothing recorded yet.</div>`;
  return layout({
    title: person.name,
    active: 'people',
    season,
    flash: (error ? flashBox(error, 'error') : '') + flash,
    body: `<div class="person-head">${avatar(person.name, 'lg')}
        <div style="flex:1;min-width:0"><h1>${esc(person.name)}</h1><div class="meta">${tags.join('')}</div></div>
        <a class="btn" href="${esc(giftUrl({ person: person.name }))}">${ICONS.plus} Add a gift for ${esc(person.name)}</a></div>
      ${stats}
      <section class="card"><div class="group-label" style="padding-top:18px">Gift history</div>${list}</section>
      <h2 class="section-title">Details</h2>
      <section class="card"><form method="post" action="/people/${person.id}">
        <div class="field"><div class="label">Birthday</div>${birthdayFields(person.birthday)}</div>
        <div class="field"><div class="label">Lists</div>${listChips(events, person)}
          ${events.length ? '' : '<p class="hint">Want more lists? <a href="/events">Create an event</a>.</p>'}</div>
        <div class="form-actions"><button type="submit">Save changes</button></div>
      </form></section>`,
  });
}

// --- add a gift -----------------------------------------------------------------

const EXAMPLES = ['scarf for Amy, xmas, 25', 'Lego for Ben’s bday yesterday $59.90', 'perfume for mum last christmas'];

// values: { person, what, occasion, givenDate, cost, occasionDate, entry }; a custom
// event's occasion is "event:<id>".
// aiFilled: the form fields the AI filled in, so they can be checked before saving.
export function giftFormPage({ values, peopleNames, error, confirmNewPerson, notice, aiEnabled, aiFilled = [], season, events = [] }) {
  const v = values;
  const ai = (k) => aiFilled.includes(k);
  const aiTag = (k) => (ai(k) ? ` <span class="ai-tag">${ICONS.sparkles} filled by AI</span>` : '');
  const radio = (val, label) =>
    `<label><input type="radio" name="occasion" value="${val}" ${v.occasion === val ? 'checked' : ''}><span>${label}</span></label>`;
  const typeToLog = aiEnabled
    ? `<section class="ai-card">
        <div class="ai-title"><span class="spark">${ICONS.sparkles}</span>Describe it in one line</div>
        <p class="ai-sub">Type it the way you’d text it. AI fills in the form below, and nothing is saved until you check it.</p>
        <form method="post" action="/gifts/parse" data-busy="Reading…">
          <label for="entry" style="position:absolute;left:-9999px">Type it in one line</label>
          <div class="ai-input">
            <input id="entry" name="entry" value="${esc(v.entry)}" placeholder="scarf for Amy, xmas, 25" autocomplete="off" ${v.entry ? '' : 'autofocus'}>
            <button type="submit" data-idle="Fill in the form"><span class="spinner"></span><span class="label">Fill in the form</span></button>
          </div>
        </form>
        <div class="examples">${EXAMPLES.map((e) => `<button type="button" class="example" data-target="entry" data-fill="${esc(e)}">${esc(e)}</button>`).join('')}</div>
      </section>`
    : '';
  return layout({
    title: 'Add a gift',
    season,
    body: `<div class="page-head"><div><h1>Add a gift</h1><p class="lede">Who it’s for, what it is, and roughly what it cost.</p></div></div>
     ${typeToLog}
     ${error ? flashBox(error, 'error') : ''}
     ${notice ? flashBox(notice, 'info') : ''}
     <section class="card"><form method="post" action="/gifts">
       <div class="field ${ai('person') ? 'ai' : ''}">
         <label for="person">Person${aiTag('person')}</label>
         <input id="person" name="person" list="people" value="${esc(v.person)}" required autocomplete="off" placeholder="Name">
         <datalist id="people">${peopleNames.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
         ${
           confirmNewPerson
             ? `<label class="check-row"><span>Add “${esc(v.person)}” as a new person</span>
                 <input class="switch" type="checkbox" name="confirmNew" value="1" required></label>`
             : ''
         }
       </div>
       <div class="field ${ai('what') ? 'ai' : ''}">
         <label for="what">What${aiTag('what')}</label>
         <input id="what" name="what" value="${esc(v.what)}" required autocomplete="off" placeholder="e.g. Wool scarf">
       </div>
       <div class="field ${ai('occasion') ? 'ai' : ''}">
         <div class="label">Occasion${aiTag('occasion')}</div>
         <div class="seg" role="radiogroup" aria-label="Occasion" style="flex-wrap:wrap">${radio('christmas', '🎄 Christmas')}${radio('birthday', '🎂 Birthday')}${events
           .map((e) => radio(`event:${e.id}`, `🎉 ${esc(e.name)}`))
           .join('')}</div>
       </div>
       <div class="field-row">
         <div class="field ${ai('givenDate') ? 'ai' : ''}">
           <label for="givenDate">Date bought${aiTag('givenDate')}</label>
           <input id="givenDate" name="givenDate" type="date" value="${esc(v.givenDate)}">
         </div>
         <div class="field ${ai('cost') ? 'ai' : ''}">
           <label for="cost">Cost${aiTag('cost')}</label>
           <div class="money"><input id="cost" name="cost" inputmode="decimal" value="${esc(v.cost)}" placeholder="Leave blank if unsure"></div>
         </div>
       </div>
       <div class="field ${ai('occasionDate') ? 'ai' : ''}">
         <details ${v.occasionDate ? 'open' : ''}><summary>${ICONS.chevron} Which year's occasion is this for?${aiTag('occasionDate')}</summary>
           <div class="inner"><label for="occasionDate" class="lbl">Occasion date</label>
           <input id="occasionDate" name="occasionDate" type="date" value="${esc(v.occasionDate)}">
           <p class="hint">Leave blank to work it out: the next one after the date bought, or the one just passed if the gift is up to 14 days late.</p></div>
         </details>
       </div>
       <div class="form-actions"><button type="submit" class="lg btn">Save gift</button><a class="btn plain" href="/">Cancel</a></div>
     </form></section>`,
  });
}

// --- people ---------------------------------------------------------------------

export function peoplePage({ people, gifts = [], events = [], flash, error, season }) {
  const countOf = new Map();
  for (const g of gifts) countOf.set(g.personId, (countOf.get(g.personId) ?? 0) + 1);
  const onXmas = people.filter((p) => p.onChristmasList).length;
  const rows = people.length
    ? people
        .map((p) => {
          const bits = [
            p.birthday ? `🎂 ${formatBirthday(p.birthday)}` : null,
            p.onChristmasList ? '🎄 Christmas' : null,
            ...events.filter((e) => p.eventIds?.includes(e.id)).map((e) => `🎉 ${esc(e.name)}`),
          ].filter(Boolean);
          const sub = bits.length ? bits.join(' · ') : '<span class="tag warn">Not on any list</span>';
          const n = countOf.get(p.id) ?? 0;
          return `<li id="p${p.id}"><div class="row-main">
              <a class="row-link" href="/people/${p.id}">${avatar(p.name)}
                <span class="row-text"><span class="row-title">${esc(p.name)}</span><span class="row-sub">${sub}</span></span>
                <span class="row-end">${n ? plural(n, 'gift') : ''}</span><span class="chev">${ICONS.chevron}</span></a>
            </div></li>`;
        })
        .join('')
    : '<li class="empty-row">Nobody yet.</li>';
  return layout({
    title: 'People',
    active: 'people',
    season,
    flash: (error ? flashBox(error, 'error') : '') + (flash ?? ''),
    body: `<div class="page-head"><div><h1>People</h1>
        <p class="lede">${plural(people.length, 'person').replace('persons', 'people')} · ${onXmas} on the Christmas list</p></div></div>
      <section class="card card-pad"><form method="post" action="/people" class="people-add">
        <div><label for="name" class="lbl">Add someone</label><input id="name" name="name" required autocomplete="off" placeholder="Name"></div>
        <div><span class="lbl">Birthday (optional)</span>${birthdayFields(null)}</div>
        <div class="full"><span class="lbl">Lists</span>${listChips(events, { onChristmasList: true })}</div>
        <div class="full" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button type="submit">${ICONS.plus} Add</button>
          ${events.length ? '' : '<span class="muted small">Want more lists? <a href="/events">Create an event</a>.</span>'}</div>
      </form></section>
      <h2 class="section-title">Your list (${people.length})</h2>
      <section class="card"><ul class="list">${rows}</ul></section>`,
  });
}

// --- events ---------------------------------------------------------------------

const repeatLabel = (e) => (e.repeats ? `Every year on ${formatBirthday(e.date.slice(5))}` : `Once, on ${formatDate(e.date)}`);

function eventFields(e, people) {
  const id = e?.id ?? 'new';
  const members = e ? people.filter((p) => p.eventIds?.includes(e.id)) : [];
  return `<div class="two">
      <div><label for="ename-${id}" class="lbl">Name</label>
        <input id="ename-${id}" name="name" value="${esc(e?.name)}" placeholder="Mother's Day, Lunar New Year, Wedding…" required autocomplete="off"></div>
      <div><label for="edate-${id}" class="lbl">Date</label><input id="edate-${id}" name="date" type="date" value="${esc(e?.date)}" required></div>
    </div>
    <div class="switch-row"><label for="erep-${id}">Every year</label>
      <input class="switch" id="erep-${id}" type="checkbox" name="repeats" value="1" ${(e ? e.repeats : true) ? 'checked' : ''}></div>
    <div><span class="lbl">Who’s on this list</span>
    ${people.length
      ? `<div class="chips">${people.map((p) => chip(`person_${p.id}`, esc(p.name), members.includes(p))).join('')}</div>`
      : '<p class="hint" style="margin:0">Nobody on your list yet. <a href="/people">Add people</a> first, or tick this event when you add them.</p>'}</div>`;
}

export function eventsPage({ events, people, today, flash, error, season, openId = null }) {
  const rows = events.length
    ? events
        .map((e) => {
          const next = nextEventDate(e, today);
          const members = people.filter((p) => p.eventIds?.includes(e.id));
          const nextBit = e.repeats ? ` · next ${formatShort(next ?? e.date)}` : '';
          const when = next ? `${nextBit}<span class="when">${whenLabel(today, next)}</span>` : ' · already passed';
          return `<li id="e${e.id}" style="display:block;padding:0">
            <div style="display:flex;align-items:center;gap:12px;padding-left:20px">${occIcon('event')}<div class="row-main">
              <span class="row-text"><span class="row-title">${esc(e.name)}</span>
                <span class="row-sub">${esc(repeatLabel(e))}${when}</span>
                <span class="row-sub">${members.length ? members.map((p) => esc(p.name)).join(', ') : 'Nobody on this list yet'}</span></span>
              <span class="row-end">${plural(members.length, 'person').replace('persons', 'people')}</span></div></div>
            <details class="row-edit" ${openId === e.id ? 'open' : ''}><summary>${ICONS.chevron} Edit event and list</summary>
              <div class="inner"><form method="post" action="/events/${e.id}" class="stack">${eventFields(e, people)}
                <div><button type="submit">Save</button></div></form>
              <form method="post" action="/events/${e.id}/delete" data-confirm="${esc(`Delete ${e.name}?`)}"><button class="danger" type="submit">Delete this event</button></form></div>
            </details></li>`;
        })
        .join('')
    : '<li class="empty-row">No events yet. Christmas and birthdays are already built in.</li>';
  return layout({
    title: 'Events',
    active: 'events',
    season,
    flash: (error ? flashBox(error, 'error') : '') + (flash ?? ''),
    body: `<div class="page-head"><div><h1>Events</h1>
        <p class="lede">Christmas and birthdays are built in. Add anything else you give gifts for.</p></div></div>
      <section class="card card-pad"><h2 style="margin-bottom:14px">Add an event</h2>
        <form method="post" action="/events" class="stack">${eventFields(null, people)}
          <div><button type="submit">${ICONS.plus} Add event</button></div></form></section>
      <h2 class="section-title">Your events (${events.length})</h2>
      <section class="card"><ul class="list">${rows}</ul></section>`,
  });
}

export function notFoundPage({ season } = {}) {
  return layout({
    title: 'Not found',
    season,
    body: `<section class="card hero"><h1>Not found</h1><p>That page doesn’t exist.</p><div class="actions"><a class="btn" href="/">Back home</a></div></section>`,
  });
}

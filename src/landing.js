// Landing page at /welcome. The hero "film" is CSS only, like the rest of the app:
// one 16s timeline that every part keys off, so it loops with no seam. The present
// wobbles, unties and opens; gift cards rise out; a gift is typed in one line; the
// card flips to covered; then everything packs back into the box and re-wraps.
// It uses the app's own look (tokens, type, buttons and top bar from views.js); the
// stage takes a tint of the season. Reduced motion gets a still frame.
import { esc, BASE_CSS, SKY_CSS, FAVICON, FONT_LINKS, sky, topbar } from './views.js';
import { daysBetween, nextOccurrence } from './occasions.js';

const TYPED = 'candle set for Amy, xmas, 32';

// The film: cards that rise out of the box. back = what the card flips to.
const CARDS = [
  { initial: 'B', name: 'Ben', c: '#ff9f0a', tag: '🎂 Birthday 2026', what: 'Board game', cost: 'S$45', x: -19, y: -31, r: -9 },
  {
    initial: 'A', name: 'Amy', c: '#ff375f', tag: '🎄 Christmas 2025', what: 'Wool scarf', cost: 'S$25', x: 0, y: -37, r: 0, label: 'Last time',
    back: { tag: '🎄 Christmas 2026', what: 'Candle set', cost: 'S$32' },
  },
  { initial: 'M', name: 'Mum', c: '#bf5af2', tag: "🎉 Mother's Day", what: 'Tea set', cost: 'S$40', x: 19, y: -31, r: 9 },
];

const face = (c, { tag, what, cost }, pill, cls = '') => `
  <span class="face ${cls}">
    ${pill}
    <span class="av" style="--c:${c.c}">${c.initial}</span>
    <b>${c.name}</b>
    <span class="t">${tag}</span>
    <span class="w">${what}</span>
    <span class="c">${cost}</span>
  </span>`;

const card = (c, i) => `
  <div class="card${c.back ? ' flips' : ''}" style="--i:${i};--x:${c.x}cqw;--y:${c.y}cqw;--r:${c.r}deg">
    <div class="flip">${face(c, c, c.label ? `<span class="pill">${c.label}</span>` : '')}${c.back ? face(c, c.back, '<span class="pill ok">✓ Covered</span>', 'back') : ''}</div>
  </div>`;

// Confetti pieces: fixed spread (no randomness) so the page renders the same every time.
const confetti = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI - Math.PI; // upper half-circle
  const d = 18 + ((i * 7) % 11);
  return `<i style="--dx:${(Math.cos(a) * d * 1.3).toFixed(1)}cqw;--dy:${(Math.sin(a) * d).toFixed(1)}cqw;--rot:${(i * 67) % 360}deg;--k:${i % 4}"></i>`;
}).join('');

const sparkles = [
  [18, 50, 0], [80, 46, 0.6], [28, 30, 1.1], [72, 26, 0.3], [86, 70, 0.9],
].map(([x, y, d]) => `<s style="--sx:${x}%;--sy:${y}%;--sd:${d}s">✦</s>`).join('');

function film(days, year) {
  return `
<div class="film">
  <input type="checkbox" id="pause" class="pause-toggle" aria-label="Pause the animation">
  <div class="stage" role="img" aria-label="A wrapped present opens. Cards rise out showing past gifts: a board game for Ben, a wool scarf for Amy last Christmas, a tea set for Mum. Someone types “${TYPED}” and Amy's card flips to Covered. The list now says 2 people are still to buy for.">
    <div class="glow"></div>
    <div class="sparkles">${sparkles}</div>
    <div class="cap c1">Every gift you've given…</div>
    <div class="cap c2">…log the next in one line…</div>
    <div class="cap c3">…and see who's left.</div>
    <div class="toast">🎄 Christmas ${year} · ${days} days · <span class="n"><span class="n3">3</span><span class="n2">2</span></span> to buy</div>
    <div class="shadow"></div>
    <div class="box">
      <div class="inside"></div>
      <div class="cards">${CARDS.map(card).join('')}</div>
      <div class="front"></div>
      <div class="lid"><div class="bow"><span class="loop l"></span><span class="loop r"></span><span class="tail l"></span><span class="tail r"></span><span class="knot"></span></div></div>
    </div>
    <div class="confetti">${confetti}</div>
    <div class="typer"><span class="typed">${esc(TYPED)}</span><span class="caret"></span><span class="go">Fill in</span></div>
  </div>
  <label for="pause" class="pause" aria-hidden="true"><span class="when-playing" title="Pause">❚❚</span><span class="when-paused" title="Play">▶</span></label>
</div>`;
}

const FILM_CSS = `
  /* The film borrows the app's tokens: tint for the typed line, green for covered,
     and the logo's pink-red for the paper. */
  .film { position: relative; --T: 16s; --paper: #e8365f; --ribbon: #f2c14e; --ribbon-hi: #fbe3a0;
    --accent: var(--tint); --on-accent: #fff; --muted: var(--fg2); --line: var(--sep); }
  .stage { position: relative; aspect-ratio: 4 / 3; container-type: inline-size; overflow: hidden; border-radius: 28px;
    background: radial-gradient(120% 90% at 50% 62%, var(--card), color-mix(in srgb, var(--season, var(--fg3)) 14%, var(--card)) 75%);
    border: .5px solid var(--card-line); box-shadow: 0 30px 60px -30px rgb(0 0 0 / .3), var(--shadow); isolation: isolate; }
  .stage * { animation-duration: var(--T); animation-iteration-count: infinite; animation-fill-mode: both; }
  .film:has(.pause-toggle:checked) .stage * { animation-play-state: paused; }
  .pause-toggle { position: absolute; opacity: 0; pointer-events: none; }
  .pause { position: absolute; right: 10px; bottom: 10px; z-index: 7; display: grid; place-items: center; width: 32px; height: 32px; font-size: .75rem; border-radius: 50%;
    background: color-mix(in srgb, var(--card) 80%, transparent); border: .5px solid var(--sep); cursor: pointer; color: var(--fg); backdrop-filter: blur(12px); }
  .pause .when-paused, .film:has(.pause-toggle:checked) .when-playing { display: none; }
  .film:has(.pause-toggle:checked) .when-paused { display: inline; }
  .film:has(.pause-toggle:focus-visible) .pause { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* Light burst behind the open box. */
  .glow { position: absolute; left: 50%; top: 41cqw; width: 110cqw; aspect-ratio: 1; translate: -50% -50%; border-radius: 50%; z-index: -1;
    background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--ribbon) 40%, transparent) 0 6deg, transparent 6deg 18deg);
    mask: radial-gradient(circle, #000 0 8%, transparent 55%); animation-name: glow; }
  @keyframes glow { 0%, 21% { opacity: 0; scale: .3; rotate: 0deg; } 27% { opacity: 1; scale: 1; } 70% { opacity: .8; } 80%, 100% { opacity: 0; scale: .6; rotate: 40deg; } }

  .shadow { position: absolute; left: 50%; bottom: 9cqw; width: 42cqw; height: 5cqw; translate: -50% 50%; border-radius: 50%;
    background: radial-gradient(closest-side, rgb(0 0 0 / .22), transparent); animation-name: shadow; }
  @keyframes shadow { 0%, 5%, 15%, 100% { scale: 1; } 8%, 12% { scale: .92 1; } 18% { scale: 1.08 1; } 22% { scale: .9; } 25% { scale: 1; } }

  /* The present. Front face and lid share the paper; the gold ribbon crosses both. */
  .box { position: absolute; left: 50%; bottom: 12cqw; width: 34cqw; height: 24cqw; margin-left: -17cqw; transform-origin: 50% 100%; animation-name: wobble; }
  @keyframes wobble {
    0%, 5% { transform: none; } 6.5% { transform: rotate(-3deg); } 8% { transform: rotate(3deg); } 9.5% { transform: rotate(-2deg); } 11% { transform: rotate(2deg); }
    12.5% { transform: none; } 17% { transform: scale(1.05, .93); } 20% { transform: scale(.97, 1.05); } 23% { transform: none; }
    85% { transform: none; } 87% { transform: scale(1.04, .95); } 89%, 100% { transform: none; } }
  .front, .lid { background-color: var(--paper);
    background-image: linear-gradient(90deg, transparent calc(50% - 2.2cqw), var(--ribbon) calc(50% - 2.2cqw), var(--ribbon-hi) 50%, var(--ribbon) calc(50% + 2.2cqw), transparent calc(50% + 2.2cqw)),
      radial-gradient(circle, rgb(255 255 255 / .22) 0 .5cqw, transparent .6cqw);
    background-size: 100% 100%, 4cqw 4cqw; }
  .front { position: absolute; inset: 0; z-index: 3; border-radius: 0 0 1.4cqw 1.4cqw; box-shadow: inset 0 -2cqw 3cqw rgb(0 0 0 / .14), inset 0 2.2cqw 2cqw -1.4cqw rgb(0 0 0 / .25); }
  .inside { position: absolute; left: 0; right: 0; top: -2.2cqw; height: 4.4cqw; z-index: 1; border-radius: 50%; background: color-mix(in srgb, var(--paper) 55%, #000); }
  .lid { position: absolute; z-index: 4; left: -2cqw; right: -2cqw; bottom: 100%; height: 7cqw; border-radius: 1.2cqw; transform-origin: 15% 100%;
    box-shadow: 0 1cqw 1.4cqw -0.6cqw rgb(0 0 0 / .35), inset 0 -0.8cqw 0 rgb(0 0 0 / .1); animation-name: lid; }
  @keyframes lid {
    0%, 19% { transform: none; opacity: 1; }
    22% { transform: translateY(-5cqw) rotate(-6deg); }
    28% { transform: translate(-58cqw, -26cqw) rotate(-48deg); opacity: 1; }
    28.5%, 79% { transform: translate(-58cqw, -26cqw) rotate(-48deg); opacity: 0; }
    79.5% { transform: translateY(-60cqw); opacity: 1; animation-timing-function: cubic-bezier(.5, 0, .9, .4); }
    85% { transform: none; } 86.5% { transform: translateY(-1.5cqw); } 88%, 100% { transform: none; opacity: 1; } }

  /* Bow: two loops, two tails and a knot, centred on the lid. Unties, then re-ties at the end. */
  .bow { position: absolute; left: 50%; top: 0; width: 0; height: 0; }
  .bow > * { position: absolute; background: linear-gradient(135deg, var(--ribbon-hi), var(--ribbon)); animation-name: untie; }
  .loop { width: 10cqw; height: 6.4cqw; top: -5.6cqw; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; box-shadow: inset 0 0 0 1.4cqw var(--ribbon), inset .6cqw .6cqw 1.4cqw rgb(0 0 0 / .2); }
  .loop.l { right: .4cqw; transform-origin: 100% 100%; --u: -70deg; rotate: -14deg; }
  .loop.r { left: .4cqw; transform-origin: 0 100%; --u: 70deg; rotate: 14deg; }
  .tail { width: 2.6cqw; height: 6cqw; top: -0.6cqw; border-radius: 0 0 .4cqw .4cqw; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }
  .tail.l { right: 0; transform-origin: 100% 0; rotate: 24deg; --u: 60deg; }
  .tail.r { left: 0; transform-origin: 0 0; rotate: -24deg; --u: -60deg; }
  .knot { width: 4.2cqw; height: 4cqw; left: -2.1cqw; top: -3.2cqw; border-radius: 1.2cqw; --u: 0deg; }
  @keyframes untie {
    0%, 15% { transform: none; opacity: 1; }
    17% { transform: scale(1.12); }
    20.5% { transform: rotate(var(--u)) scale(.2); opacity: 0; }
    86%, 87% { transform: rotate(var(--u)) scale(0); opacity: 0; animation-timing-function: cubic-bezier(.3, 1.8, .5, 1); }
    90% { transform: scale(1.18); opacity: 1; } 92%, 100% { transform: none; opacity: 1; } }

  .sparkles s { position: absolute; left: var(--sx); top: var(--sy); text-decoration: none; color: var(--ribbon); font-size: 3.4cqw; animation-name: sparkle; }
  @keyframes sparkle { 0%, 100% { opacity: 0; scale: .2; } 3%, 14% { opacity: 1; scale: 1; } 18%, 92% { opacity: 0; scale: .2; } 96% { opacity: 1; scale: 1; } }
  .sparkles s:nth-child(odd) { animation-name: sparkle2; }
  @keyframes sparkle2 { 0%, 100% { opacity: .9; scale: 1; } 6%, 11% { opacity: .2; scale: .5; } 18%, 92% { opacity: 0; scale: .2; } }

  /* Gift cards: tucked inside the box, spring out into a fan, then pack away. */
  .cards { position: absolute; inset: 0; z-index: 2; }
  .card { position: absolute; left: 50%; top: 3cqw; width: 17cqw; height: 19cqw; margin-left: -8.5cqw; perspective: 80cqw; animation-name: rise; animation-delay: calc(var(--i) * .22s); }
  @keyframes rise {
    0%, 23% { transform: none; animation-timing-function: cubic-bezier(.2, 1.5, .4, 1); }
    31%, 75% { transform: translate(var(--x), var(--y)) rotate(var(--r)); animation-timing-function: cubic-bezier(.6, 0, .8, .4); }
    81%, 100% { transform: none; } }
  .card:nth-child(2) { z-index: 1; }
  .flip { position: absolute; inset: 0; transform-style: preserve-3d; }
  .flips .flip { animation-name: flip; }
  @keyframes flip { 0%, 66% { transform: none; } 70%, 83% { transform: rotateY(180deg); } 83.5%, 100% { transform: none; } }
  .face { position: absolute; inset: 0; backface-visibility: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: .4cqw;
    padding: 1.6cqw; border-radius: 2cqw; background: var(--card); border: .5px solid var(--sep); box-shadow: 0 1.2cqw 2.4cqw -1cqw rgb(0 0 0 / .25);
    font-size: 1.7cqw; line-height: 1.25; color: var(--fg); text-align: left; }
  .face.back { transform: rotateY(180deg); border: 1.5px solid var(--green-solid); }
  .face b { font-size: 2.4cqw; font-weight: 650; letter-spacing: -.02em; }
  .face .av { width: 4.4cqw; height: 4.4cqw; border-radius: 50%; display: grid; place-items: center; font-weight: 600; font-size: 2cqw; color: #fff;
    background: linear-gradient(180deg, color-mix(in srgb, var(--c) 70%, #fff), var(--c)); }
  .face .t { color: var(--fg2); font-size: 1.5cqw; white-space: nowrap; }
  .face .w { margin-top: auto; font-weight: 600; }
  .face .c { font-weight: 600; color: var(--fg2); font-variant-numeric: tabular-nums; }
  .pill { position: absolute; bottom: 1.4cqw; right: 1.2cqw; font-size: 1.4cqw; font-weight: 600; padding: .2cqw 1cqw; border-radius: .8cqw; background: var(--orange-bg); color: var(--orange); }
  .pill.ok { background: var(--green-bg); color: var(--green); }

  /* Confetti burst as the lid comes off. */
  .confetti { position: absolute; left: 50%; top: 40cqw; z-index: 2; }
  .confetti i { position: absolute; width: 1.4cqw; height: .8cqw; border-radius: .2cqw; animation-name: burst;
    background: var(--accent); }
  .confetti i:nth-child(4n+1) { background: var(--paper); }
  .confetti i:nth-child(4n+2) { background: var(--ribbon); }
  .confetti i:nth-child(4n+3) { background: var(--particle); border-radius: 50%; width: 1cqw; height: 1cqw; }
  @keyframes burst {
    0%, 22% { transform: none; opacity: 0; }
    23% { opacity: 1; animation-timing-function: cubic-bezier(.1, .8, .3, 1); }
    33% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 1; animation-timing-function: ease-in; }
    44% { transform: translate(var(--dx), calc(var(--dy) + 22cqw)) rotate(calc(var(--rot) * 3)); opacity: 0; }
    100% { transform: none; opacity: 0; } }

  /* Type-to-log: one line typed, the button pressed. */
  .typer { position: absolute; left: 50%; bottom: 3cqw; z-index: 6; display: flex; align-items: center; gap: 1cqw; width: 62cqw; margin-left: -33cqw;
    padding: 1.2cqw 1.2cqw 1.2cqw 2.4cqw; border-radius: 99px; background: var(--card); border: 1px solid var(--tint);
    box-shadow: 0 0 0 .8cqw var(--tint-ring), 0 1.4cqw 3cqw -1.2cqw rgb(0 0 0 / .3); animation-name: typer; }
  @keyframes typer { 0%, 54% { opacity: 0; transform: translateY(4cqw) scale(.96); } 57%, 71% { opacity: 1; transform: none; } 74%, 100% { opacity: 0; transform: translateY(2cqw) scale(.96); } }
  .typed { font: 600 2.5cqw/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace; white-space: nowrap; overflow: hidden; width: 0; color: var(--fg); animation-name: type; }
  @keyframes type { 0%, 58% { width: 0; animation-timing-function: steps(${TYPED.length}, end); } 67%, 100% { width: ${TYPED.length}ch; } }
  .caret { width: .3cqw; height: 3cqw; background: var(--accent); animation: blink .9s steps(1) infinite !important; }
  @keyframes blink { 50% { opacity: 0; } }
  .go { margin-left: auto; font-size: 2cqw; font-weight: 600; padding: 1cqw 2.2cqw; border-radius: 99px; background: var(--accent); color: var(--on-accent); animation-name: press; }
  @keyframes press { 0%, 67.5% { transform: none; filter: none; } 68.5% { transform: scale(.88); filter: brightness(1.2); } 70%, 100% { transform: none; filter: none; } }

  /* Countdown chip: 3 to buy, then 2 once Amy is covered. */
  .toast { position: absolute; right: 3cqw; top: 3cqw; z-index: 6; font-size: 1.9cqw; font-weight: 600; padding: .8cqw 1.8cqw; border-radius: 99px;
    background: color-mix(in srgb, var(--card) 85%, transparent); backdrop-filter: blur(12px); border: .5px solid var(--sep); box-shadow: 0 .8cqw 2cqw -1cqw rgb(0 0 0 / .25); animation-name: toast; }
  @keyframes toast { 0%, 31% { opacity: 0; transform: translateY(-3cqw); } 34%, 77% { opacity: 1; transform: none; } 80%, 100% { opacity: 0; transform: translateY(-3cqw); } }
  .n { display: inline-grid; color: var(--tint); font-weight: 700; }
  .n > * { grid-area: 1 / 1; }
  .n3 { animation-name: out; } .n2 { animation-name: in; }
  @keyframes out { 0%, 69% { opacity: 1; transform: none; } 71%, 100% { opacity: 0; transform: translateY(-1cqw); } }
  @keyframes in { 0%, 69% { opacity: 0; transform: translateY(1cqw); } 71% { opacity: 1; transform: scale(1.6); } 74%, 100% { opacity: 1; transform: none; } }

  /* Scene captions, top left. */
  .cap { position: absolute; left: 3.4cqw; top: 3.4cqw; z-index: 6; font-size: 2.3cqw; font-weight: 600; letter-spacing: -.01em; color: var(--fg2); opacity: 0; }
  .c1 { animation-name: c1; } .c2 { animation-name: c2; } .c3 { animation-name: c3; }
  @keyframes c1 { 0%, 31% { opacity: 0; transform: translateY(1cqw); } 34%, 53% { opacity: 1; transform: none; } 56%, 100% { opacity: 0; } }
  @keyframes c2 { 0%, 56% { opacity: 0; transform: translateY(1cqw); } 59%, 68% { opacity: 1; transform: none; } 70%, 100% { opacity: 0; } }
  @keyframes c3 { 0%, 70% { opacity: 0; transform: translateY(1cqw); } 72%, 77% { opacity: 1; transform: none; } 80%, 100% { opacity: 0; } }

  /* Reduced motion: one still frame, box open and cards out. */
  @media (prefers-reduced-motion: reduce) {
    .stage *, .caret { animation: none !important; }
    .pause { display: none; }
    .glow { opacity: .8; }
    .lid, .bow, .sparkles, .confetti, .typer, .cap { display: none; }
    .card { transform: translate(var(--x), var(--y)) rotate(var(--r)); }
    .toast { opacity: 1; } .n2 { opacity: 0; }
    .shadow { opacity: 1; }
  }
`;

const PAGE_CSS = `
  .wrap.wide { max-width: 1080px; }
  main.landing { position: relative; z-index: 1; padding-top: 40px; padding-bottom: 24px; }
  .hero { display: grid; gap: 40px; align-items: center; padding-bottom: 72px; }
  @media (min-width: 860px) { .hero { grid-template-columns: 1fr 1.1fr; gap: 56px; } }
  .hero .eyebrow { font-size: 17px; font-weight: 600; margin-bottom: 12px; }
  .hero h1 { font-size: clamp(40px, 6vw, 64px); line-height: 1.04; letter-spacing: -.035em; text-wrap: balance; }
  .hero h1 em { font-style: normal; background: linear-gradient(160deg, #ff6b6b, #e0245e); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .hero .lede { font-size: 21px; line-height: 1.38; max-width: 32ch; margin: 18px 0 28px; }
  .ctas { display: flex; gap: 12px; flex-wrap: wrap; }

  .section-head { text-align: center; font-size: clamp(28px, 4vw, 40px); line-height: 1.1; font-weight: 700; letter-spacing: -.03em; margin: 0 0 28px; text-wrap: balance; }
  .features, .steps { display: grid; gap: 16px; }
  @media (min-width: 760px) { .features, .steps { grid-template-columns: repeat(3, 1fr); } }
  .features { margin-bottom: 16px; }
  .feature, .steps li, .countdown, .soon { background: var(--card); border-radius: 18px; box-shadow: var(--shadow); border: .5px solid var(--card-line); }
  .feature { padding: 24px; }
  .feature .ico { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 22px; margin-bottom: 14px; background: var(--tint-soft); }
  .feature:nth-child(2) .ico { background: var(--green-bg); }
  .feature:nth-child(3) .ico { background: var(--orange-bg); }
  .feature h3 { font-size: 19px; font-weight: 650; letter-spacing: -.02em; margin: 0 0 6px; }
  .feature p { margin: 0; color: var(--fg2); font-size: 15px; }
  .feature code { font: 500 14px ui-monospace, "SF Mono", Menlo, Consolas, monospace; background: var(--fill); padding: 1px 6px; border-radius: 6px; color: var(--fg); }
  .steps { list-style: none; margin: 0 0 72px; padding: 0; counter-reset: step; }
  .steps li { counter-increment: step; display: flex; gap: 14px; align-items: flex-start; padding: 20px; color: var(--fg2); font-size: 15px; }
  .steps li strong { color: var(--fg); font-weight: 600; }
  .steps li::before { content: counter(step); flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
    font-size: 14px; font-weight: 600; background: var(--tint); color: #fff; }
  .soon { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; padding: 24px; margin-bottom: 16px; }
  .soon .ico { flex: none; width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; font-size: 26px; background: rgba(175,82,222,.13); }
  .soon .grow { flex: 1; min-width: 240px; }
  .soon .eyebrow { margin: 0 0 2px; font-size: 13px; font-weight: 600; color: var(--fg2); text-transform: uppercase; letter-spacing: .04em; }
  .soon h3 { font-size: 21px; font-weight: 650; letter-spacing: -.02em; margin: 0 0 4px; }
  .soon p { margin: 0; color: var(--fg2); font-size: 15px; max-width: 60ch; }
  .countdown { text-align: center; padding: 48px 24px; margin-bottom: 48px; border-radius: 22px; }
  .countdown .big { font-size: clamp(56px, 10vw, 88px); font-weight: 700; letter-spacing: -.045em; line-height: 1; font-variant-numeric: tabular-nums; }
  .countdown p { color: var(--fg2); font-size: 19px; margin: 12px auto 24px; max-width: 40ch; }

  /* Sections drift up as they scroll in, where the browser supports scroll timelines. */
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
      @keyframes reveal { from { opacity: 0; transform: translateY(32px) scale(.98); } }
    }
  }
  @media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
`;

export function landingPage({ today, season }) {
  const xmas = nextOccurrence('christmas', today);
  const days = daysBetween(today, xmas);
  const year = xmas.slice(0, 4);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gift</title>
<link rel="icon" href="${FAVICON}">
<meta name="description" content="Remember who you gave what, when, and roughly how much, before the next occasion.">
${FONT_LINKS}
<style>
${BASE_CSS}
${PAGE_CSS}
${FILM_CSS}
${SKY_CSS}
</style>
</head>
<body class="s-${season.key}">
${sky(season)}
${topbar({ season, wide: true })}
<main class="wrap wide landing">

<section class="hero">
  <div>
    <p class="eyebrow">${season.emoji} ${esc(season.greeting)}</p>
    <h1>Never wonder <em>“what did I get them last time?”</em> again.</h1>
    <p class="lede">One place for who got what, when, and roughly how much, so the next occasion starts from your list instead of your memory.</p>
    <div class="ctas">
      <a class="btn lg" href="/gifts/new">Log your first gift</a>
      <a class="btn soft lg" href="/people">Add your people</a>
    </div>
  </div>
  ${film(days, year)}
</section>

<h2 class="section-head reveal">Built for the week before the occasion.</h2>
<div class="features">
  <div class="feature reveal"><div class="ico">🗂️</div><h3>Last time, at a glance</h3>
    <p>Everyone still to buy for shows what they got last time and what it cost. No more giving Amy the same scarf twice.</p></div>
  <div class="feature reveal"><div class="ico">⌨️</div><h3>Type it in one line</h3>
    <p>Write <code>scarf for Amy, xmas, 25</code> and the form fills itself in. You check it before it's saved, and a cost you didn't type is never invented.</p></div>
  <div class="feature reveal"><div class="ico">📬</div><h3>A nudge before the day</h3>
    <p>A Sunday email lists who's still open in the next 30 days. If everyone is covered, it stays quiet.</p></div>
</div>

<ol class="steps reveal">
  <li><span><strong>Add your people.</strong> Birthdays, the Christmas list, and any event you give for.</span></li>
  <li><span><strong>Log gifts as you buy.</strong> Ten seconds at the till, or one typed line.</span></li>
  <li><span><strong>Check before the occasion.</strong> See who's covered, who's left, and what you spent.</span></li>
</ol>

<section class="soon reveal">
  <div class="ico" aria-hidden="true">🤝</div>
  <div class="grow">
    <p class="eyebrow">Coming soon</p>
    <h3>Share with friends</h3>
    <p>Invite a friend and you both keep one record: what you gave each other, and who's ahead, so you know when the next gift should be a bigger one. Gifts for an occasion still to come stay hidden until the day.</p>
  </div>
  <a class="btn soft" href="/preview/sharing">See a preview</a>
</section>

<section class="countdown reveal">
  <div class="big">${days === 0 ? 'Today!' : `${days} day${days === 1 ? '' : 's'}`}</div>
  <p>${days === 0 ? `It's Christmas ${year}. Merry Christmas!` : `until Christmas ${year}. Get everyone on the list before the rush.`}</p>
  <a class="btn lg" href="/gifts/new">Start my Christmas ${year} list</a>
</section>
</main>
</body>
</html>`;
}

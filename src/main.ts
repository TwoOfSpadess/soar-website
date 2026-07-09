import '@fontsource-variable/inter';
import './styles.css';
import { initChat } from './chat';
import { initDemo } from './demo';
import { SoarGuide } from './guide';
import type { Poi, Pose } from './guide';

initDemo();

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- Sticky header ---- */
const head = document.getElementById('site-head')!;
const onHeadScroll = () => head.classList.toggle('scrolled', window.scrollY > 24);
window.addEventListener('scroll', onHeadScroll, { passive: true });
onHeadScroll();

/* ---- Reveal on scroll ---- */
const revealables = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.18 },
);
revealables.forEach((el) => revealObserver.observe(el));

/* ---- The guide ---- */
const pois: Poi[] = [...document.querySelectorAll<HTMLElement>('[data-soar-poi]')].map((el) => ({
  el,
  side: (el.dataset.soarSide as Poi['side']) ?? 'right',
  pose: (el.dataset.soarPose as Pose) ?? 'bounce',
  say: el.dataset.soarSay ?? null,
  isDock: el.dataset.soarPoi === 'dock',
}));

/** The poi whose center sits nearest the viewport's focus line wins.
    A switch margin keeps the guide from flapping between neighbors. */
function pickPoi(current: Poi | null): Poi {
  const focusY = window.innerHeight * 0.44;
  let best: Poi | null = null;
  let bestDist = Infinity;
  for (const poi of pois) {
    const r = poi.el.getBoundingClientRect();
    if (r.bottom < -40 || r.top > window.innerHeight + 40) continue;
    const dist = Math.abs(r.top + r.height / 2 - focusY);
    if (dist < bestDist) {
      bestDist = dist;
      best = poi;
    }
  }
  if (!best) return current ?? pois[0];
  if (current && best !== current) {
    const currentRect = current.el.getBoundingClientRect();
    const currentDist = Math.abs(currentRect.top + currentRect.height / 2 - focusY);
    const onScreen = currentRect.bottom > -40 && currentRect.top < window.innerHeight + 40;
    if (onScreen && currentDist - bestDist < 48) return current; // not decisively better
  }
  return best;
}

const guide = new SoarGuide(reduced);
// Browsers restore scroll position on reload — start at whatever is in view.
let active: Poi = pickPoi(null);
guide.jumpTo(active);
guide.enter();

/* ---- Concierge mode ---- */
const chat = initChat(guide);
guide.onParkedClick = () => chat.toggle();

// Tour complete = visitor reached the bottom, then headed back up.
let touredToBottom = false;
let deepestScroll = 0;
window.addEventListener(
  'scroll',
  () => {
    if (guide.isParked) return;
    const bottom = window.scrollY + window.innerHeight;
    if (bottom > document.documentElement.scrollHeight - 140) touredToBottom = true;
    if (touredToBottom) {
      deepestScroll = Math.max(deepestScroll, window.scrollY);
      if (deepestScroll - window.scrollY > 220) {
        guide.park("That's the tour! Give me a click if you have questions — happy to help.");
      }
    }
  },
  { passive: true },
);

window.addEventListener('soar:resume', () => {
  touredToBottom = false;
  deepestScroll = 0;
  guide.unpark();
  active = pickPoi(null);
  guide.setPoi(active);
});

function frame() {
  if (!guide.isParked) {
    const next = pickPoi(active);
    if (next !== active) {
      active = next;
      guide.setPoi(active);
    }
  }
  guide.tick();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

import { animate } from 'animejs';

export type Pose = 'dock' | 'wiggle' | 'bounce' | 'spin' | 'nod' | 'cheer' | 'peek';

export interface Poi {
  el: HTMLElement;
  side: 'left' | 'right' | 'top';
  pose: Pose;
  say: string | null;
  isDock: boolean;
}

const BASE_W = 64;
const BASE_H = 57;
const FOLLOW = 0.095; // lerp factor per frame — higher when far, so it "zips"
const ARRIVE_DIST = 13;

const GUIDE_SVG = `
  <div class="sg-bubble" role="status"></div>
  <div class="sg-motion">
    <div class="sg-inner">
      <svg viewBox="0 0 72 64" width="${BASE_W}" height="${BASE_H}">
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 56 L36 10 L60 56" stroke="#4a6318" stroke-width="9" />
          <path d="M24 56 L36 33 L48 56" stroke="#1b2065" stroke-width="4.5" />
        </g>
        <g class="sg-eye" style="transform-origin: 29px 27px">
          <circle cx="29" cy="27" r="4.6" fill="#fff" stroke="#1b2065" stroke-width="1.6" />
          <circle class="sg-pupil" cx="29.6" cy="27.8" r="2.1" fill="#1b2065" />
        </g>
        <g class="sg-eye" style="transform-origin: 43px 27px">
          <circle cx="43" cy="27" r="4.6" fill="#fff" stroke="#1b2065" stroke-width="1.6" />
          <circle class="sg-pupil" cx="43.6" cy="27.8" r="2.1" fill="#1b2065" />
        </g>
      </svg>
    </div>
  </div>`;

export class SoarGuide {
  private root: HTMLDivElement;
  private motion: HTMLDivElement;
  private inner: HTMLDivElement;
  private bubble: HTMLDivElement;
  private eyes: SVGGElement[];
  private pupils: SVGCircleElement[];

  private x = 0;
  private y = 0;
  private scale = 1;
  private activePoi: Poi | null = null;
  private pendingArrival = false;
  private posing = false;
  private bubbleTimer = 0;
  private mouseX = 0;
  private mouseY = 0;
  private lastX = 0;
  private lastY = 0;
  private angle = 0;
  private reduced: boolean;

  constructor(reduced: boolean) {
    this.reduced = reduced;
    this.root = document.createElement('div');
    this.root.id = 'soar-guide';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = GUIDE_SVG;
    document.body.appendChild(this.root);

    this.motion = this.root.querySelector('.sg-motion')!;
    this.inner = this.root.querySelector('.sg-inner')!;
    this.bubble = this.root.querySelector('.sg-bubble')!;
    this.eyes = [...this.root.querySelectorAll<SVGGElement>('.sg-eye')];
    this.pupils = [...this.root.querySelectorAll<SVGCircleElement>('.sg-pupil')];

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    // A friendly easter egg: he likes being clicked.
    this.root.addEventListener('click', () => this.quip());

    if (!this.reduced) this.scheduleBlink();
  }

  private quip() {
    if (this.reduced) return;
    const lines = ['Wheee!', 'Up and to the right!', 'Onward!', 'Mind the SLA!', 'That tickles.'];
    this.say(lines[Math.floor(Math.random() * lines.length)]);
    this.pose(Math.random() < 0.5 ? 'cheer' : 'spin');
  }

  /** Snap instantly (used on init so the guide starts life docked in the wordmark). */
  jumpTo(poi: Poi) {
    this.activePoi = poi;
    const t = this.targetFor(poi);
    this.x = t.x;
    this.y = t.y;
    this.scale = t.scale;
    this.render(0, 0);
  }

  setPoi(poi: Poi) {
    if (this.activePoi?.el === poi.el) return;
    this.activePoi = poi;
    this.pendingArrival = true;
    this.hideBubble();
  }

  /** Playful entrance: start above the viewport and swoop into position via
      the normal follow physics (nose-down dive, flare upright to land). */
  enter() {
    if (this.reduced) return;
    this.y = -BASE_H * this.scale - 60;
    this.lastY = this.y;
    this.pendingArrival = true;
    window.setTimeout(() => this.say('Follow me!'), 1500);
  }

  tick() {
    const poi = this.activePoi;
    if (!poi) return;
    const t = this.targetFor(poi);

    if (this.reduced) {
      this.x = t.x;
      this.y = t.y;
      this.scale = t.scale;
      this.render(0, 0);
      return;
    }

    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const dist = Math.hypot(dx, dy);
    // Far targets get an extra kick so the guide zips rather than drifts.
    const k = FOLLOW * (dist > 420 ? 1.9 : dist > 160 ? 1.35 : 1);
    this.x += dx * k;
    this.y += dy * k;
    this.scale += (t.scale - this.scale) * 0.11;

    // Land exactly on the mark instead of asymptotically hovering beside it.
    if (dist < 0.5) {
      this.x = t.x;
      this.y = t.y;
    }
    if (Math.abs(t.scale - this.scale) < 0.002) this.scale = t.scale;

    const vx = this.x - this.lastX;
    const vy = this.y - this.lastY;
    this.lastX = this.x;
    this.lastY = this.y;
    this.render(vx, vy);

    if (this.pendingArrival && dist < ARRIVE_DIST) {
      this.pendingArrival = false;
      this.pose(poi.pose);
      if (poi.say) this.say(poi.say);
    }
  }

  private targetFor(poi: Poi): { x: number; y: number; scale: number } {
    const r = poi.el.getBoundingClientRect();
    if (poi.isDock) {
      const scale = Math.max(0.6, r.height / BASE_H);
      return { x: r.left + r.width / 2 - (BASE_W * scale) / 2, y: r.top + r.height / 2 - (BASE_H * scale) / 2, scale };
    }
    const w = BASE_W;
    const h = BASE_H;
    let x: number;
    let y = r.top + r.height / 2 - h / 2;
    if (poi.side === 'left') x = r.left - w - 18;
    else if (poi.side === 'top') {
      x = r.left + r.width / 2 - w / 2;
      y = r.top - h - 16;
    } else x = r.right + 18;
    // Keep the little guy on screen.
    x = Math.min(Math.max(x, 8), window.innerWidth - w - 8);
    y = Math.min(Math.max(y, 60), window.innerHeight - h - 12);
    return { x, y, scale: 1 };
  }

  private render(vx: number, vy: number) {
    this.root.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    // Speech bubble stays reading-size no matter how big the guide is scaled.
    this.bubble.style.setProperty('--inv', String(1 / this.scale));

    // Fly nose-first: point the arrow along its direction of travel, then
    // ease back upright as it slows into a landing.
    const speed = Math.hypot(vx, vy);
    const flying = speed > 2.8 && !this.activePoi?.isDock;
    const targetAngle = flying ? (Math.atan2(vx, -vy) * 180) / Math.PI : 0;
    const delta = ((targetAngle - this.angle + 540) % 360) - 180;
    this.angle += delta * (flying ? 0.22 : 0.14);
    if (!flying && Math.abs(this.angle) < 0.2) this.angle = 0;
    const stretch = Math.min(speed * 0.007, 0.18);
    this.motion.style.transform = `rotate(${this.angle}deg) scale(${1 - stretch}, ${1 + stretch})`;

    // Eyes: look where you're going; when still, follow the cursor.
    const cx = this.x + (BASE_W * this.scale) / 2;
    const cy = this.y + (BASE_H * this.scale) / 2;
    let lx = this.mouseX - cx;
    let ly = this.mouseY - cy;
    if (speed > 2.5) {
      lx = vx;
      ly = vy;
    }
    const mag = Math.hypot(lx, ly) || 1;
    const px = (lx / mag) * 2.1;
    const py = (ly / mag) * 2.1;
    for (const pupil of this.pupils) pupil.style.transform = `translate(${px}px, ${py}px)`;
  }

  private pose(pose: Pose) {
    if (this.posing || this.reduced) return;
    this.posing = true;
    const done = () => {
      this.posing = false;
      this.inner.style.transform = '';
    };
    switch (pose) {
      case 'bounce':
        animate(this.inner, { translateY: [0, -15, 0, -7, 0], duration: 650, ease: 'outQuad', onComplete: done });
        break;
      case 'wiggle':
        animate(this.inner, { rotate: [0, -12, 10, -6, 0], duration: 640, ease: 'inOutSine', onComplete: done });
        break;
      case 'spin':
        animate(this.inner, { rotate: [0, 360], duration: 720, ease: 'inOutBack', onComplete: done });
        break;
      case 'nod':
        animate(this.inner, { rotate: [0, 8, -4, 0], translateY: [0, 3, 0], duration: 520, ease: 'inOutQuad', onComplete: done });
        break;
      case 'cheer':
        animate(this.inner, { translateY: [0, -22, 0], scale: [1, 1.14, 1], duration: 700, ease: 'outBack', onComplete: done });
        break;
      case 'peek':
        animate(this.inner, { rotate: [0, -14, -14, 0], duration: 900, ease: 'inOutQuad', onComplete: done });
        break;
      case 'dock':
        animate(this.inner, { scaleY: [1, 0.86, 1.05, 1], duration: 480, ease: 'outQuad', onComplete: done });
        break;
    }
  }

  private say(text: string) {
    this.bubble.textContent = text;
    this.bubble.classList.add('visible');
    window.clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => this.hideBubble(), 2600);
  }

  private hideBubble() {
    this.bubble.classList.remove('visible');
  }

  private scheduleBlink() {
    const delay = 2800 + Math.random() * 3200;
    window.setTimeout(() => {
      for (const eye of this.eyes) {
        animate(eye, { scaleY: [1, 0.1, 1], duration: 150, ease: 'inOutQuad' });
      }
      this.scheduleBlink();
    }, delay);
  }
}

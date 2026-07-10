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
const FOLLOW = 0.06; // lerp factor per frame
const MAX_STEP = 11; // px per frame — caps cruise speed so long flights glide like a paper plane
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
  private parkedFlag = false;
  private parkSay: string | null = null;
  private reduced: boolean;

  /** Set by the chat layer — invoked when the parked guide is clicked. */
  onParkedClick?: () => void;

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

    // Parked: clicking opens the chat. On tour: a friendly easter egg.
    this.root.addEventListener('click', () => {
      if (this.parkedFlag && this.onParkedClick) this.onParkedClick();
      else this.quip();
    });

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

  /** End of the tour: glide to the bottom-right corner and become the concierge. */
  park(message: string) {
    if (this.parkedFlag) return;
    this.parkedFlag = true;
    this.parkSay = message;
    this.pendingArrival = true;
    this.hideBubble();
  }

  unpark() {
    this.parkedFlag = false;
    this.parkSay = null;
    this.hideBubble();
  }

  get isParked(): boolean {
    return this.parkedFlag;
  }

  /** Small acknowledgment gesture while answering chat messages. */
  react() {
    this.pose(Math.random() < 0.5 ? 'nod' : 'bounce');
  }

  private parkTarget(): { x: number; y: number; scale: number } {
    return {
      x: window.innerWidth - BASE_W - 26,
      y: window.innerHeight - BASE_H - 24,
      scale: 1,
    };
  }

  tick() {
    const poi = this.activePoi;
    if (!poi && !this.parkedFlag) return;
    const t = this.parkedFlag ? this.parkTarget() : this.targetFor(poi!);

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
    // Ease toward the target, but cap per-frame travel so long flights become
    // a graceful constant-speed glide instead of a lunge.
    let stepX = dx * FOLLOW;
    let stepY = dy * FOLLOW;
    const stepLen = Math.hypot(stepX, stepY);
    if (stepLen > MAX_STEP) {
      stepX = (stepX / stepLen) * MAX_STEP;
      stepY = (stepY / stepLen) * MAX_STEP;
    }
    this.x += stepX;
    this.y += stepY;
    this.scale += (t.scale - this.scale) * 0.09;

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
      if (this.parkedFlag) {
        this.pose('cheer');
        if (this.parkSay) this.say(this.parkSay, 7000);
      } else if (poi) {
        this.pose(poi.pose);
        if (poi.say) this.say(poi.say);
      }
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
    if (poi.side === 'left') x = r.left - w - 30;
    else if (poi.side === 'top') {
      x = r.left + r.width / 2 - w / 2;
      y = r.top - h - 26;
    } else x = r.right + 30;
    // Keep the little guy on screen, clear of the fixed header, and off the text.
    x = Math.min(Math.max(x, 10), window.innerWidth - w - 10);
    y = Math.min(Math.max(y, 74), window.innerHeight - h - 14);
    return { x, y, scale: 1 };
  }

  private render(vx: number, vy: number) {
    this.root.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    // Speech bubble stays reading-size no matter how big the guide is scaled.
    this.bubble.style.setProperty('--inv', String(1 / this.scale));

    // Nose-first in flight; once landed, aim at what he's presenting
    // (upright only when docked as the wordmark's A).
    const speed = Math.hypot(vx, vy);
    const poi = this.activePoi;
    const flying = speed > 2.5 && (this.parkedFlag || !poi?.isDock);
    let targetAngle = 0;
    if (flying) {
      targetAngle = (Math.atan2(vx, -vy) * 180) / Math.PI;
    } else if (this.parkedFlag) {
      targetAngle = 0; // upright and approachable in the corner
    } else if (poi && !poi.isDock) {
      const r = poi.el.getBoundingClientRect();
      const ax = r.left + r.width / 2 - (this.x + (BASE_W * this.scale) / 2);
      const ay = r.top + r.height / 2 - (this.y + (BASE_H * this.scale) / 2);
      targetAngle = (Math.atan2(ax, -ay) * 180) / Math.PI;
    }
    const delta = ((targetAngle - this.angle + 540) % 360) - 180;
    this.angle += delta * (flying ? 0.12 : 0.08);
    const stretch = Math.min(speed * 0.007, 0.14);
    this.motion.style.transform = `rotate(${this.angle}deg) scale(${1 - stretch}, ${1 + stretch})`;

    // Keep the speech bubble on-screen: flip it underneath when he's up top.
    this.bubble.classList.toggle('below', this.y < 130);

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

  private say(text: string, duration = 2600) {
    this.bubble.style.setProperty('--shiftX', '0px');
    this.bubble.textContent = text;
    this.bubble.classList.add('visible');
    // Clamp the bubble inside the viewport; the tail counter-shifts so it
    // keeps pointing at the guide even when the bubble slides over. Uses
    // layout width (offsetWidth) because the pop-in transition makes
    // getBoundingClientRect read too narrow mid-animation; the bubble's
    // inverse scale cancels the root scale, so offsetWidth IS final width.
    requestAnimationFrame(() => {
      const width = this.bubble.offsetWidth;
      const centerX = this.x + (BASE_W * this.scale) / 2;
      let shift = 0;
      const right = centerX + width / 2;
      const left = centerX - width / 2;
      if (right > window.innerWidth - 10) shift = window.innerWidth - 10 - right;
      else if (left < 10) shift = 10 - left;
      if (shift !== 0) this.bubble.style.setProperty('--shiftX', `${shift}px`);
    });
    window.clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => this.hideBubble(), duration);
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

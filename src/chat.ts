import type { SoarGuide } from './guide';

/* A scripted concierge: curated answers matched by keyword, no backend.
   Bot answer strings may contain trusted HTML (links); user input is only
   ever rendered via textContent. */

interface Topic {
  keywords: string[];
  answer: string;
}

const CONTACT_LINK = '<a href="mailto:hello@soar-crm.com">hello@soar-crm.com</a>';

const TOPICS: Topic[] = [
  {
    keywords: ['what is', 'about', 'soar', 'product', 'crm', 'psa', 'tool'],
    answer:
      'SOAR is one workspace for everything a service business runs on — service desk tickets, projects, time tracking, contracts, and billing — built around a dashboard you design yourself.',
  },
  {
    keywords: ['customize', 'custom', 'widget', 'drag', 'layout', 'dashboard', 'personalize', 'views'],
    answer:
      'Customization is the whole point. Every stat and panel is a widget — 27 of them across four departments so far. Pick the ones you want per view, drag them where you like, and click any number to expand the full story. The demo up the page is a mini version of exactly that.',
  },
  {
    keywords: ['price', 'pricing', 'cost', 'how much', 'subscription', 'pay'],
    answer:
      `Pricing isn't public yet — we're in early access and shaping plans with the first teams on board. Reach out at ${CONTACT_LINK} and we'll talk specifics.`,
  },
  {
    keywords: ['early access', 'access', 'sign up', 'signup', 'waitlist', 'join', 'get started', 'trial', 'try'],
    answer:
      `Early access is open to a small group of teams. Email ${CONTACT_LINK} with a line about your business and we'll get you set up. And do try the interactive demo up the page in the meantime.`,
  },
  {
    keywords: ['ticket', 'service desk', 'sla', 'helpdesk', 'support desk', 'queue', 'escalation'],
    answer:
      'The service desk has queues, priorities, SLA countdowns, and escalations that surface before they burn. Every ticket keeps its full activity trail, and stats like "SLA at risk" live right on your dashboard.',
  },
  {
    keywords: ['time', 'hours', 'billing', 'invoice', 'billable', 'contract', 'mrr'],
    answer:
      'Log time against tickets and projects, watch contract hours burn down, and turn unbilled work into clean invoices without switching tools. Billable ratio and receivables are dashboard widgets too.',
  },
  {
    keywords: ['integration', 'api', 'connect', 'slack', 'teams', 'quickbooks', 'm365', 'stripe', 'sync'],
    answer:
      'Integrations and APIs are where SOAR is headed next. The design goal: every connected tool lands as new widgets on your dashboard, so outside data lives beside your own.',
  },
  {
    keywords: ['desktop', 'windows', 'app', 'install', 'download', 'mac', 'web', 'browser', 'electron'],
    answer:
      'SOAR ships as a desktop application (think QuickBooks) with a web deployment planned. Windows first; other platforms will follow demand.',
  },
  {
    keywords: ['data', 'security', 'privacy', 'storage', 'secure', 'backup'],
    answer:
      `Your workspace data stays yours — the early build is local-first on your machine. For security specifics as we grow into hosted options, email ${CONTACT_LINK}.`,
  },
  {
    keywords: ['who', 'team', 'company', 'behind', 'founder', 'made'],
    answer:
      'SOAR is a young company building the CRM we always wished existed: one tool that does everything you need, shaped to how you work. The arrow does the tours; humans answer the email.',
  },
  {
    keywords: ['hello', 'hi ', 'hey', 'yo ', 'sup'],
    answer: 'Hey! Ask me anything about SOAR — or tap one of the suggestions below.',
  },
  {
    keywords: ['thanks', 'thank you', 'ty', 'appreciate'],
    answer: 'Anytime! That’s what I’m here for. Up and to the right!',
  },
];

const FALLBACK = `Good question — that one's beyond my little arrow brain. The humans at ${CONTACT_LINK} will have a real answer for you.`;

const GREETING =
  'Hi! I’m the SOAR guide. Ask me about the product, customization, pricing, or early access — or pick a suggestion below.';

const CHIPS: { label: string; query?: string; action?: 'resume' }[] = [
  { label: 'What is SOAR?', query: 'What is SOAR?' },
  { label: 'Can I customize it?', query: 'Can I customize it?' },
  { label: 'Pricing?', query: 'What does it cost?' },
  { label: 'Get early access', query: 'How do I get early access?' },
  { label: 'Resume the tour', action: 'resume' },
];

function matchAnswer(query: string): string {
  const q = ` ${query.toLowerCase()} `;
  let best: Topic | null = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    const score = topic.keywords.reduce((sum, kw) => sum + (q.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return best ? best.answer : FALLBACK;
}

const PANEL_HTML = `
  <header class="chat-head">
    <svg viewBox="0 0 64 64" width="20" height="20" aria-hidden="true">
      <path d="M13 51 L32 11 L51 51" fill="none" stroke="#7a9c3a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="chat-title">
      <b>SOAR Guide</b>
      <span>Scripted concierge &middot; instant-ish</span>
    </div>
    <button class="chat-close" aria-label="Close chat" type="button">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
  </header>
  <div class="chat-msgs" role="log" aria-live="polite"></div>
  <div class="chat-chips"></div>
  <form class="chat-input">
    <input type="text" placeholder="Ask about SOAR..." aria-label="Ask a question" maxlength="200" />
    <button type="submit" aria-label="Send">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
    </button>
  </form>`;

export interface ChatControls {
  toggle: () => void;
}

export function initChat(guide: SoarGuide): ChatControls {
  const panel = document.createElement('div');
  panel.className = 'chat-panel';
  panel.innerHTML = PANEL_HTML;
  document.body.appendChild(panel);

  const msgs = panel.querySelector<HTMLDivElement>('.chat-msgs')!;
  const chipsRow = panel.querySelector<HTMLDivElement>('.chat-chips')!;
  const form = panel.querySelector<HTMLFormElement>('.chat-input')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  let open = false;
  let greeted = false;

  const addMsg = (kind: 'bot' | 'user', content: string, asHtml: boolean): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = `msg ${kind}`;
    if (asHtml) el.innerHTML = content;
    else el.textContent = content;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  };

  const botReply = (query: string) => {
    const typing = addMsg('bot', '', false);
    typing.classList.add('typing');
    typing.innerHTML = '<i></i><i></i><i></i>';
    const answer = matchAnswer(query);
    window.setTimeout(() => {
      typing.classList.remove('typing');
      typing.innerHTML = answer;
      msgs.scrollTop = msgs.scrollHeight;
      guide.react();
    }, 450 + Math.min(answer.length * 4, 700));
  };

  const ask = (query: string) => {
    addMsg('user', query, false);
    botReply(query);
  };

  for (const chip of CHIPS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-chip';
    btn.textContent = chip.label;
    btn.addEventListener('click', () => {
      if (chip.action === 'resume') {
        setOpen(false);
        window.dispatchEvent(new CustomEvent('soar:resume'));
      } else if (chip.query) {
        ask(chip.query);
      }
    });
    chipsRow.appendChild(btn);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });

  panel.querySelector('.chat-close')!.addEventListener('click', () => setOpen(false));

  const setOpen = (next: boolean) => {
    open = next;
    panel.classList.toggle('open', open);
    if (open) {
      if (!greeted) {
        greeted = true;
        addMsg('bot', GREETING, false);
      }
      input.focus();
    }
  };

  return { toggle: () => setOpen(!open) };
}

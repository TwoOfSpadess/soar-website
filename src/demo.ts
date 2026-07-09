/* A miniature, self-contained taste of the SOAR workspace: toggle widgets,
   drag to reorder, click to expand. Static sample data — the pitch is the
   interaction model, not the numbers. */

type Tone = 'red' | 'amber' | 'green' | 'navy';

interface Row {
  a: string;
  b: string;
  bTone: Tone;
  c: string;
}

interface DemoWidget {
  id: string;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  warn?: boolean;
  title: string;
  rows: Row[];
}

const TICKET_ROWS: Row[] = [
  { a: 'Backup job failing — Ironwood Mfg', b: 'Critical', bTone: 'red', c: 'overdue' },
  { a: 'Email delivery delayed — Summit Financial', b: 'High', bTone: 'amber', c: 'due in 7h' },
  { a: 'VPN drops for remote staff — Lakeside', b: 'High', bTone: 'amber', c: 'due in 1d' },
  { a: 'Printer offline — Harborview Dental', b: 'Medium', bTone: 'navy', c: 'due in 4h' },
];

const WIDGETS: DemoWidget[] = [
  {
    id: 'open',
    label: 'Open Tickets',
    value: '18',
    sub: '2 new today',
    title: 'Open Tickets',
    rows: TICKET_ROWS,
  },
  {
    id: 'sla',
    label: 'SLA At Risk',
    value: '2',
    sub: 'due today or overdue',
    warn: true,
    title: 'SLA At Risk',
    rows: [
      { a: 'Backup job failing — Ironwood Mfg', b: 'Breached', bTone: 'red', c: '4h over' },
      { a: 'UPS battery fault — Northgate', b: 'Due today', bTone: 'amber', c: '5pm' },
    ],
  },
  {
    id: 'hours',
    label: 'Hours This Week',
    value: '42h',
    sub: '87% billable',
    title: 'Hours This Week',
    rows: [
      { a: 'Cole Bennett — AP install, warehouse', b: 'Billable', bTone: 'green', c: '6.0h' },
      { a: 'Derek Okafor — Veeam troubleshooting', b: 'Billable', bTone: 'green', c: '3.5h' },
      { a: 'Maya Torres — message trace, Summit', b: 'Billable', bTone: 'green', c: '1.5h' },
    ],
  },
  {
    id: 'mrr',
    label: 'Monthly Recurring',
    value: '$40.9k',
    sub: '7 active contracts',
    accent: true,
    title: 'Monthly Recurring Revenue',
    rows: [
      { a: 'Ironwood Manufacturing', b: 'Platinum', bTone: 'navy', c: '$8,400/mo' },
      { a: 'Lakeside Logistics', b: 'Gold', bTone: 'navy', c: '$7,200/mo' },
      { a: 'Northgate Physicians', b: 'Gold', bTone: 'navy', c: '$6,750/mo' },
    ],
  },
];

const PANEL_ID = 'recent';
const DEFAULT_ORDER = ['open', 'sla', 'hours', 'mrr'];

let order: string[] = [...DEFAULT_ORDER];
let panelOn = true;
let dragId: string | null = null;

const byId = (id: string) => WIDGETS.find((w) => w.id === id)!;

function rowsTable(rows: Row[]): string {
  return `<table>${rows
    .map(
      (r) =>
        `<tr><td>${r.a}</td><td><span class="demo-tone ${r.bTone}">${r.b}</span></td><td style="text-align:right;font-weight:620">${r.c}</td></tr>`,
    )
    .join('')}</table>`;
}

export function initDemo() {
  const chips = document.getElementById('demo-chips');
  const band = document.getElementById('demo-band');
  const panel = document.getElementById('demo-panel');
  const frame = band?.closest('.demo-frame') as HTMLElement | null;
  const reset = document.getElementById('demo-reset');
  if (!chips || !band || !panel || !frame || !reset) return;

  const render = () => {
    chips.innerHTML = [...WIDGETS.map((w) => ({ id: w.id, label: w.label })), { id: PANEL_ID, label: 'Recent Tickets' }]
      .map(({ id, label }) => {
        const active = id === PANEL_ID ? panelOn : order.includes(id);
        return `<button type="button" class="demo-chip ${active ? 'active' : ''}" data-chip="${id}">${label}</button>`;
      })
      .join('');

    band.innerHTML =
      order.length === 0
        ? `<div class="demo-empty">No widgets — flip a chip above to add some back.</div>`
        : order
            .map((id) => {
              const w = byId(id);
              return `<div class="demo-card ${w.accent ? 'accent' : ''} ${w.warn ? 'warn' : ''}" draggable="true" data-id="${w.id}">
                <span class="dc-grip">⠿</span><b>${w.value}</b><span>${w.label}</span><small>${w.sub}</small>
              </div>`;
            })
            .join('');

    panel.innerHTML = panelOn
      ? `<div class="panel-title">Recent Tickets</div>${rowsTable(TICKET_ROWS)}`
      : '';
  };

  const expand = (w: DemoWidget) => {
    const overlay = document.createElement('div');
    overlay.className = 'demo-overlay';
    overlay.innerHTML = `<div class="demo-overlay-card">
      <header><b>${w.title}</b><button type="button" class="do-close" aria-label="Close">&times;</button></header>
      ${rowsTable(w.rows)}
      <p class="do-note">In the full product this is your live data — and clicking a row takes you straight to it.</p>
    </div>`;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || (e.target as HTMLElement).closest('.do-close')) overlay.remove();
    });
    frame.appendChild(overlay);
  };

  chips.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-chip]');
    if (!chip) return;
    const id = chip.dataset.chip!;
    if (id === PANEL_ID) panelOn = !panelOn;
    else if (order.includes(id)) order = order.filter((x) => x !== id);
    else order = [...order, id];
    render();
  });

  reset.addEventListener('click', () => {
    order = [...DEFAULT_ORDER];
    panelOn = true;
    render();
  });

  band.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (card && !dragId) expand(byId(card.dataset.id!));
  });

  band.addEventListener('dragstart', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (!card) return;
    dragId = card.dataset.id!;
    e.dataTransfer?.setData('text/plain', dragId);
    card.classList.add('dragging');
  });

  band.addEventListener('dragover', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (!card || !dragId || card.dataset.id === dragId) return;
    e.preventDefault();
    const r = card.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    band.querySelectorAll('.drop-l, .drop-r').forEach((el) => el.classList.remove('drop-l', 'drop-r'));
    card.classList.add(after ? 'drop-r' : 'drop-l');
  });

  band.addEventListener('drop', (e) => {
    e.preventDefault();
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (!card || !dragId || card.dataset.id === dragId) return;
    const r = card.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    const without = order.filter((x) => x !== dragId);
    const at = without.indexOf(card.dataset.id!) + (after ? 1 : 0);
    order = [...without.slice(0, at), dragId, ...without.slice(at)];
    render();
  });

  band.addEventListener('dragend', () => {
    // Cleared next tick so the post-drag click doesn't open the overlay.
    window.setTimeout(() => {
      dragId = null;
    }, 0);
    band.querySelectorAll('.dragging, .drop-l, .drop-r').forEach((el) =>
      el.classList.remove('dragging', 'drop-l', 'drop-r'),
    );
  });

  render();
}

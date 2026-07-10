/* Interactive mini-SOAR: a read-only slice of the real dashboard.
   Widgets toggle, drag to reorder, and click-expand into flood views —
   mirroring the product. Nothing here mutates anything real. */

type Tone = 'red' | 'amber' | 'green' | 'navy' | 'gray';

interface Cell {
  text: string;
  tone?: Tone;
  prio?: 'critical' | 'high' | 'medium' | 'low';
  sub?: string;
}

interface ExpandedView {
  headers: string[];
  rows: Cell[][];
}

interface DemoWidget {
  id: string;
  chip: string;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  warn?: boolean;
  kind: 'stat' | 'panel';
  title: string;
  blurb: string;
  expanded: ExpandedView;
}

const TICKET_ROWS: Cell[][] = [
  [{ text: 'Critical', prio: 'critical' }, { text: 'Backup job failing on HV-SQL01', sub: 'Ironwood Manufacturing' }, { text: 'Escalated', tone: 'red' }, { text: 'overdue', tone: 'red' }],
  [{ text: 'High', prio: 'high' }, { text: 'Email delivery delayed externally', sub: 'Summit Financial Partners' }, { text: 'In Progress', tone: 'navy' }, { text: 'in 7h' }],
  [{ text: 'High', prio: 'high' }, { text: 'VPN drops for remote dispatchers', sub: 'Lakeside Logistics' }, { text: 'In Progress', tone: 'navy' }, { text: 'in 1d' }],
  [{ text: 'Medium', prio: 'medium' }, { text: 'Printer offline — Operatory 2', sub: 'Harborview Dental Group' }, { text: 'New', tone: 'green' }, { text: 'in 4h' }],
  [{ text: 'Medium', prio: 'medium' }, { text: 'Teams Rooms console offline', sub: 'Summit Financial Partners' }, { text: 'In Progress', tone: 'navy' }, { text: 'in 1d' }],
  [{ text: 'Low', prio: 'low' }, { text: 'Q3 license reconciliation', sub: 'BrightPath Charter Schools' }, { text: 'New', tone: 'green' }, { text: 'in 2w' }],
];

const WIDGETS: DemoWidget[] = [
  {
    id: 'open',
    chip: 'Open Tickets',
    label: 'Open Tickets',
    value: '18',
    sub: '2 new today',
    kind: 'stat',
    title: 'Open Tickets',
    blurb: 'Every unresolved ticket across your clients, priority first.',
    expanded: { headers: ['Priority', 'Ticket', 'Status', 'SLA'], rows: TICKET_ROWS },
  },
  {
    id: 'sla',
    chip: 'SLA At Risk',
    label: 'SLA At Risk',
    value: '3',
    sub: 'due today or overdue',
    warn: true,
    kind: 'stat',
    title: 'SLA At Risk',
    blurb: 'Tickets due today or already past their SLA.',
    expanded: { headers: ['Priority', 'Ticket', 'Status', 'SLA'], rows: TICKET_ROWS.slice(0, 3) },
  },
  {
    id: 'hours',
    chip: 'Hours This Week',
    label: 'Hours Logged This Week',
    value: '42h',
    sub: '87% billable',
    kind: 'stat',
    title: 'Hours Logged This Week',
    blurb: 'Time captured since Monday, ready for billing.',
    expanded: {
      headers: ['Date', 'Resource', 'Work', 'Hours'],
      rows: [
        [{ text: 'Wed' }, { text: 'Derek Okafor' }, { text: 'Veeam VSS troubleshooting', sub: 'Ironwood Manufacturing' }, { text: '3.5h' }],
        [{ text: 'Wed' }, { text: 'Cole Bennett' }, { text: 'Warehouse AP mounting', sub: 'Ironwood Manufacturing' }, { text: '6.0h' }],
        [{ text: 'Tue' }, { text: 'Maya Torres' }, { text: 'Message trace analysis', sub: 'Summit Financial Partners' }, { text: '1.5h' }],
        [{ text: 'Mon' }, { text: 'Priya Shah' }, { text: 'Migration wave 2 planning', sub: 'Summit Financial Partners' }, { text: '2.0h' }],
      ],
    },
  },
  {
    id: 'mrr',
    chip: 'MRR',
    label: 'Monthly Recurring Revenue',
    value: '$40.9k',
    sub: '7 active contracts',
    accent: true,
    kind: 'stat',
    title: 'Monthly Recurring Revenue',
    blurb: 'Recurring revenue across every managed agreement.',
    expanded: {
      headers: ['Company', 'Agreement', 'Status', 'MRR'],
      rows: [
        [{ text: 'Ironwood Manufacturing' }, { text: 'Managed Services — Platinum' }, { text: 'Active', tone: 'green' }, { text: '$8,400' }],
        [{ text: 'Lakeside Logistics' }, { text: 'Managed Services — Gold' }, { text: 'Active', tone: 'green' }, { text: '$7,200' }],
        [{ text: 'Northgate Physicians' }, { text: 'Managed Services — Gold' }, { text: 'Active', tone: 'green' }, { text: '$6,750' }],
        [{ text: 'Summit Financial' }, { text: 'Managed Services — Gold' }, { text: 'Renews Aug 30', tone: 'amber' }, { text: '$5,600' }],
      ],
    },
  },
  {
    id: 'activity',
    chip: 'Recent Activity',
    label: 'Recent Ticket Activity',
    value: '',
    sub: '',
    kind: 'panel',
    title: 'Recent Ticket Activity',
    blurb: 'The latest movement across open tickets.',
    expanded: { headers: ['Priority', 'Ticket', 'Status', 'SLA'], rows: TICKET_ROWS },
  },
];

const DEFAULT_ORDER = WIDGETS.map((w) => w.id);

const cellHtml = (cell: Cell): string => {
  if (cell.prio) return `<span class="demo-prio ${cell.prio}">${cell.text}</span>`;
  if (cell.tone) return `<span class="demo-tone ${cell.tone}">${cell.text}</span>`;
  if (cell.sub) return `<span class="demo-cell-main">${cell.text}</span><span class="demo-cell-sub">${cell.sub}</span>`;
  return cell.text;
};

const tableHtml = (view: ExpandedView): string => `
  <table>
    <thead><tr>${view.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${view.rows
      .map((row) => `<tr>${row.map((c) => `<td>${cellHtml(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody>
  </table>`;

export function initDemo(): void {
  const chipsEl = document.getElementById('demo-chips');
  const bandEl = document.getElementById('demo-band');
  const panelEl = document.getElementById('demo-panel');
  const frameEl = document.querySelector<HTMLElement>('.demo-frame');
  const toastEl = document.getElementById('demo-toast');
  const newBtn = document.getElementById('demo-new');
  if (!chipsEl || !bandEl || !panelEl || !frameEl || !toastEl || !newBtn) return;

  let order = [...DEFAULT_ORDER];
  let dragId: string | null = null;
  let toastTimer = 0;

  const byId = (id: string): DemoWidget => WIDGETS.find((w) => w.id === id)!;

  const render = () => {
    chipsEl.innerHTML = WIDGETS.map(
      (w) => `<button type="button" class="demo-chip ${order.includes(w.id) ? 'active' : ''}" data-chip="${w.id}">${w.chip}</button>`,
    ).join('');

    const stats = order.filter((id) => byId(id).kind === 'stat');
    bandEl.innerHTML = stats.length
      ? stats
          .map((id) => {
            const w = byId(id);
            return `<div class="demo-card ${w.accent ? 'accent' : ''} ${w.warn ? 'warn' : ''}" draggable="true" data-id="${w.id}">
              <span class="dc-grip">⠿</span>
              <b>${w.value}</b><span>${w.label}</span><small>${w.sub}</small>
            </div>`;
          })
          .join('')
      : '<div class="demo-empty">No widgets — tap a chip above to add some back.</div>';

    const panels = order.filter((id) => byId(id).kind === 'panel');
    panelEl.innerHTML = panels
      .map((id) => {
        const w = byId(id);
        return `<div class="demo-panel-card" data-id="${w.id}">
          <div class="panel-title">${w.title}<span class="panel-expand">expand</span></div>
          ${tableHtml({ headers: w.expanded.headers, rows: w.expanded.rows.slice(0, 4) })}
        </div>`;
      })
      .join('');
  };

  const toast = (text: string) => {
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove('show');
      toastTimer = window.setTimeout(() => {
        toastEl.hidden = true;
      }, 250);
    }, 2800);
  };

  const expand = (id: string) => {
    const w = byId(id);
    const overlay = document.createElement('div');
    overlay.className = 'demo-overlay';
    overlay.innerHTML = `
      <div class="demo-overlay-card">
        <header>
          <div><b>${w.title}</b><span class="do-blurb">${w.blurb}</span></div>
          <button class="do-close" type="button" aria-label="Close">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        ${tableHtml(w.expanded)}
        <p class="do-note">In the real SOAR, every row clicks through to the full record. <a href="mailto:hello@soar-crm.com?subject=SOAR%20early%20access">Get early access</a> to try it with your data.</p>
      </div>`;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || (e.target as HTMLElement).closest('.do-close')) overlay.remove();
    });
    frameEl.appendChild(overlay);
  };

  /* Delegated interactions */
  chipsEl.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-chip]');
    if (!chip) return;
    const id = chip.dataset.chip!;
    order = order.includes(id) ? order.filter((x) => x !== id) : [...order, id];
    render();
  });

  document.getElementById('demo-reset')?.addEventListener('click', () => {
    order = [...DEFAULT_ORDER];
    render();
  });

  newBtn.addEventListener('click', () =>
    toast('Demo mode — creating tickets is a real-SOAR perk. Grab early access!'),
  );

  bandEl.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.demo-card');
    if (card && !dragId) expand(card.dataset.id!);
  });

  panelEl.addEventListener('click', (e) => {
    const panel = (e.target as HTMLElement).closest<HTMLElement>('.demo-panel-card');
    if (panel) expand(panel.dataset.id!);
  });

  bandEl.addEventListener('dragstart', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.demo-card');
    if (!card) return;
    dragId = card.dataset.id!;
    e.dataTransfer!.setData('text/plain', dragId);
    e.dataTransfer!.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  bandEl.addEventListener('dragover', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.demo-card');
    if (!card || !dragId || card.dataset.id === dragId) return;
    e.preventDefault();
    const rect = card.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    card.classList.toggle('drop-r', after);
    card.classList.toggle('drop-l', !after);
  });

  bandEl.addEventListener('dragleave', (e) => {
    (e.target as HTMLElement).closest('.demo-card')?.classList.remove('drop-l', 'drop-r');
  });

  bandEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const card = (e.target as HTMLElement).closest<HTMLElement>('.demo-card');
    if (!card || !dragId) return;
    const targetId = card.dataset.id!;
    const after = card.classList.contains('drop-r');
    const without = order.filter((x) => x !== dragId);
    const at = without.indexOf(targetId) + (after ? 1 : 0);
    order = [...without.slice(0, at), dragId, ...without.slice(at)];
    render();
  });

  bandEl.addEventListener('dragend', () => {
    dragId = null;
    render();
  });

  render();
}

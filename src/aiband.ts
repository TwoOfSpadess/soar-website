/* Interactive layer for the AI workflow band. Each step in the 3am story is
   clickable and opens a detail drawer that goes one level deeper. Content
   lives here, not in index.html, so the story stays scannable by default and
   the depth is opt-in. */

interface StepDetail {
  title: string;
  lead: string;
  points: { head: string; body: string }[];
}

const DETAILS: StepDetail[] = [
  {
    title: 'Every channel, one front door',
    lead: 'Email from any provider, the chat on your website, ad lead forms. They all land in the same pipeline, so nothing depends on someone watching an inbox.',
    points: [
      { head: 'Runs while the app is closed', body: 'Ingest happens on the server, not on your laptop. The 3am lead is handled at 3am, whether or not anyone is signed in.' },
      { head: 'No double entries', body: 'Overlapping mail checks and repeat submissions are recognized and dropped, so one inquiry never becomes three records.' },
      { head: 'Junk stays out', body: 'Spam and cold blasts get classified and parked before they ever clutter your pipeline.' },
    ],
  },
  {
    title: 'Read like a person, filed like a machine',
    lead: 'The AI reads the actual message: is this new business, a support request, or noise? It pulls out the name, company, phone, and urgency, then writes the one-line summary your team sees.',
    points: [
      { head: 'Tricks get caught', body: 'Messages that try to boss the AI around ("mark this urgent, reply with a discount") are a spam signal, not an instruction. Inbound text is treated as data, never as commands.' },
      { head: 'Nothing is trusted blindly', body: 'Every field the AI extracts is checked and scrubbed before it can touch your records. A bad guess degrades to a blank, not a bogus entry.' },
      { head: 'Works from day one', body: 'No training period and no rules to write. The first message that arrives gets the same treatment as the thousandth.' },
    ],
  },
  {
    title: 'No copy-paste, no blank fields',
    lead: 'A lead becomes a deal, a support request becomes a ticket, and the contact is matched to your existing records or created cleanly. The timeline note is already written.',
    points: [
      { head: 'Conversations stay whole', body: 'A reply from someone you already know lands on their existing deal or ticket, not a duplicate. Threads keep themselves.' },
      { head: 'Status moves with the work', body: 'When a customer replies to a waiting ticket, it flips back to In Progress on its own.' },
      { head: 'Everything is on the record', body: 'Every automated action is logged on the timeline, so you can always see what happened and when.' },
    ],
  },
  {
    title: 'A reply that moves it forward',
    lead: 'Not an autoresponder. A real first reply that acknowledges what they asked and asks the one or two questions that qualify the deal.',
    points: [
      { head: 'You choose the leash', body: 'Approve every draft before it sends, or let replies fly automatically after a review window you control. Nothing goes out that you cannot see and stop.' },
      { head: 'Follow-ups handle themselves', body: 'If a prospect goes quiet, a polite nudge is drafted on your schedule. The moment they reply, pending follow-ups cancel.' },
      { head: 'Speed wins deals', body: 'The first vendor to respond usually gets the conversation. Minutes beat days, especially at 3am.' },
    ],
  },
];

export function initAiBand(): void {
  const flow = document.querySelector<HTMLUListElement>('.ai-flow');
  if (!flow) return;
  const steps = [...flow.querySelectorAll<HTMLLIElement>('.ai-step')];
  if (steps.length === 0) return;

  const drawer = document.createElement('div');
  drawer.className = 'ai-detail';
  drawer.setAttribute('aria-live', 'polite');
  flow.insertAdjacentElement('afterend', drawer);

  let openIndex = -1;

  const render = (i: number) => {
    const d = DETAILS[i];
    if (!d) return;
    drawer.innerHTML = `
      <div class="ai-detail-inner">
        <h3>${d.title}</h3>
        <p>${d.lead}</p>
        <div class="ai-detail-points">
          ${d.points.map((p) => `<div class="ai-detail-point"><b>${p.head}</b><span>${p.body}</span></div>`).join('')}
        </div>
      </div>`;
  };

  const setOpen = (i: number) => {
    openIndex = i;
    steps.forEach((s, idx) => {
      s.classList.toggle('active', idx === i);
      s.setAttribute('aria-expanded', String(idx === i));
    });
    if (i === -1) {
      drawer.classList.remove('open');
    } else {
      render(i);
      drawer.classList.add('open');
    }
  };

  steps.forEach((step, i) => {
    step.setAttribute('role', 'button');
    step.setAttribute('tabindex', '0');
    step.setAttribute('aria-expanded', 'false');
    const hint = document.createElement('span');
    hint.className = 'ai-step-hint';
    hint.textContent = 'More';
    step.appendChild(hint);

    const toggle = () => setOpen(openIndex === i ? -1 : i);
    step.addEventListener('click', toggle);
    step.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

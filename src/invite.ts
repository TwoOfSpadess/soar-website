/* Invite acceptance page (soar-crm.com/invite/?t=<token>).

   The token arrives as a query parameter rather than a path segment because
   the site is served statically by GitHub Pages, which will happily serve
   /invite/ but cannot route /invite/<token>.

   Everything here talks to the API directly; the marketing site has no
   backend of its own. */
import './invite.css';

/* Production talks to the live API. VITE_API_BASE overrides it so the flow can
   be exercised against a local or staging server without issuing real
   invitations against production. */
const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://api.soar-crm.com';
/** Set once installers are hosted publicly; empty hides the download step. */
const DOWNLOAD_URL = '';

interface InvitePreview {
  email: string;
  role: string;
  orgName: string;
  invitedBy: string | null;
  hasAccount: boolean;
  expiresAt: string;
}

const card = document.getElementById('card') as HTMLElement;

function escapeHtml(value: string): string {
  const el = document.createElement('div');
  el.textContent = value;
  return el.innerHTML;
}

function render(html: string): void {
  card.innerHTML = html;
}

function problem(title: string, detail: string): void {
  render(`
    <div class="invite-state">
      <h1 class="invite-title">${escapeHtml(title)}</h1>
      <p class="invite-muted">${escapeHtml(detail)}</p>
      <a class="invite-btn invite-btn-ghost" href="/">Back to soar-crm.com</a>
    </div>
  `);
}

function success(orgName: string, email: string): void {
  const download = DOWNLOAD_URL
    ? `<a class="invite-btn" href="${DOWNLOAD_URL}">Download SOAR for Windows</a>`
    : '';
  render(`
    <div class="invite-state">
      <div class="invite-check" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5.5 5.5L20 7" /></svg>
      </div>
      <h1 class="invite-title">You're in</h1>
      <p class="invite-muted">
        Your account for <strong>${escapeHtml(orgName)}</strong> is ready. Open SOAR and sign in with
        <strong>${escapeHtml(email)}</strong> and the password you just chose.
      </p>
      ${download}
      <p class="invite-fineprint">
        Don't have the app yet? Ask whoever invited you to send the SOAR installer — your login already works.
      </p>
    </div>
  `);
}

/** Existing accounts join the org on the spot and just sign in as themselves. */
function renderExistingAccount(invite: InvitePreview, token: string): void {
  render(`
    <div class="invite-state">
      <h1 class="invite-title">Join ${escapeHtml(invite.orgName)}</h1>
      <p class="invite-muted">
        You already have a SOAR account for <strong>${escapeHtml(invite.email)}</strong>. Accept the invitation and
        it will be waiting the next time you sign in.
      </p>
      <button class="invite-btn" id="accept">Accept invitation</button>
      <p class="invite-error" id="error" hidden></p>
    </div>
  `);

  const button = document.getElementById('accept') as HTMLButtonElement;
  const error = document.getElementById('error') as HTMLElement;

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Joining…';
    error.hidden = true;
    try {
      await accept({ token });
      success(invite.orgName, invite.email);
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : 'Something went wrong.';
      error.hidden = false;
      button.disabled = false;
      button.textContent = 'Accept invitation';
    }
  });
}

function renderNewAccount(invite: InvitePreview, token: string): void {
  const from = invite.invitedBy ? `${escapeHtml(invite.invitedBy)} invited you to ` : 'You have been invited to ';
  render(`
    <div class="invite-state">
      <h1 class="invite-title">${from}<strong>${escapeHtml(invite.orgName)}</strong></h1>
      <p class="invite-muted">Choose a password and your account is ready. This takes about a minute.</p>
      <form class="invite-form" id="form" novalidate>
        <label class="invite-field">
          <span>Email</span>
          <input type="email" value="${escapeHtml(invite.email)}" disabled />
        </label>
        <label class="invite-field">
          <span>Your name</span>
          <input type="text" id="name" autocomplete="name" required autofocus />
        </label>
        <label class="invite-field">
          <span>Create a password</span>
          <input type="password" id="password" autocomplete="new-password" minlength="8" required />
          <small>At least 8 characters.</small>
        </label>
        <button class="invite-btn" type="submit" id="submit">Create my account</button>
        <p class="invite-error" id="error" hidden></p>
      </form>
    </div>
  `);

  const form = document.getElementById('form') as HTMLFormElement;
  const submit = document.getElementById('submit') as HTMLButtonElement;
  const error = document.getElementById('error') as HTMLElement;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = (document.getElementById('name') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password') as HTMLInputElement).value;

    error.hidden = true;
    if (!name) return showError(error, 'Please enter your name.');
    if (password.length < 8) return showError(error, 'Passwords need at least 8 characters.');

    submit.disabled = true;
    submit.textContent = 'Creating your account…';
    try {
      await accept({ token, name, password });
      success(invite.orgName, invite.email);
    } catch (err) {
      showError(error, err instanceof Error ? err.message : 'Something went wrong.');
      submit.disabled = false;
      submit.textContent = 'Create my account';
    }
  });
}

function showError(el: HTMLElement, message: string): void {
  el.textContent = message;
  el.hidden = false;
}

async function accept(body: { token: string; name?: string; password?: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/accept-invite`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.message ?? `Could not accept the invitation (HTTP ${res.status}).`);
  }
}

async function main(): Promise<void> {
  const token = new URLSearchParams(window.location.search).get('t');
  if (!token) {
    problem('That link looks incomplete', 'Open the link from your invitation email again, or ask for a new one.');
    return;
  }

  let invite: InvitePreview;
  try {
    const res = await fetch(`${API_BASE}/api/auth/invite/${encodeURIComponent(token)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.invite) {
      problem(
        'This invitation is no longer valid',
        'It may have expired, already been used, or been cancelled. Ask your teammate to send a new one.',
      );
      return;
    }
    invite = json.invite as InvitePreview;
  } catch {
    problem('Could not reach SOAR', 'Check your connection and refresh the page.');
    return;
  }

  if (invite.hasAccount) renderExistingAccount(invite, token);
  else renderNewAccount(invite, token);
}

void main();

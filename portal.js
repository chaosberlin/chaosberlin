import { validateRequest } from './src/validation.ts';

const panels = [...document.querySelectorAll('[data-panel]')];
function showView() {
  const requested = location.hash.slice(1) || 'namespace';
  const view = panels.some(p => p.dataset.panel === requested) ? requested : 'namespace';
  panels.forEach(p => p.hidden = p.dataset.panel !== view);
  document.querySelectorAll('[data-view]').forEach(a => {
    const active = a.dataset.view === view;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
window.addEventListener('hashchange', showView);
showView();
let requestText = '', requestName = '';
let knownNames = new Set();
const status = document.querySelector('#form-status');
document.querySelector('#claim-form').addEventListener('submit', event => {
  event.preventDefault();
  document.querySelector('#request-output').hidden = true;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const result = validateRequest(data);
  if (!result.ok) { status.textContent = result.errors.join(' · '); return; }
  if (knownNames.has(result.value.subdomain)) { status.textContent = 'A request already exists for this name. Check the registry before opening a PR.'; return; }
  const { subdomain, type, content, owner } = result.value;
  requestName = subdomain;
  requestText = JSON.stringify({ subdomain, type, content, owner }, null, 2) + '\n';
  document.querySelector('#request-path').textContent = `requests/${subdomain}.json`;
  document.querySelector('#request-json').textContent = requestText;
  document.querySelector('#request-output').hidden = false;
  status.textContent = 'Request generated locally. Review it before submitting.';
});
document.querySelector('#copy-request').addEventListener('click', async event => {
  const button = event.currentTarget;
  try { await navigator.clipboard.writeText(requestText); button.textContent = '[ copied ]'; }
  catch { status.textContent = 'Clipboard unavailable. Download the JSON instead.'; }
});
document.querySelector('#download-request').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([requestText], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${requestName}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const samples = [
  { from: 'postmaster', time: '09:41', subject: 'Welcome to the node.', text: 'This is your space on the network.\n\nA place for correspondence, patches, and ideas that deserve more than a notification.\n\nThis message is sample content for the mailbox design.' },
  { from: 'maintainer', time: '08:12', subject: 'Your namespace request', text: 'Thanks for the patch.\n\nIn the finished service, namespace reviews happen in the public pull request. Mailbox credentials stay private.\n\nThis is a preview, not a real provisioning notification.' }
];
function selectMessage(index) {
  const message = samples[index];
  document.querySelector('#message-meta').textContent = `FROM ${message.from} · ${message.time} · SAMPLE`;
  document.querySelector('#message-subject').textContent = message.subject;
  document.querySelector('#message-text').textContent = message.text;
  document.querySelectorAll('[data-message]').forEach(button => {
    const selected = Number(button.dataset.message) === index;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
}
document.querySelectorAll('[data-message]').forEach(button => button.addEventListener('click', () => selectMessage(Number(button.dataset.message))));
selectMessage(0);
async function loadRegistry() {
  const body = document.querySelector('#registry');
  const state = document.querySelector('#registry-state');
  try {
    const response = await fetch('./registry.json');
    if (!response.ok) throw new Error('Registry unavailable');
    const entries = await response.json();
    if (!Array.isArray(entries)) throw new Error('Invalid registry');
    knownNames = new Set(entries.map(entry => entry.subdomain));
    state.textContent = `${entries.length} request${entries.length === 1 ? '' : 's'}`;
    body.replaceChildren();
    if (!entries.length) {
      const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 4;
      cell.textContent = 'No published requests yet. Start with # claim.';
    }
    for (const entry of entries) {
      const row = body.insertRow();
      for (const value of [entry.subdomain, entry.type, entry.content, `@${entry.owner}`]) row.insertCell().textContent = value;
    }
  } catch {
    state.textContent = 'unavailable';
    const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 4;
    cell.textContent = 'Could not load the registry. Check the public repository.';
  }
}
loadRegistry();

const $ = s => document.querySelector(s);
let actorId = 'user-business', tasks = [];

// API URL
const API = 'http://localhost:3001';

async function call(path, opts = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const r = await fetch(API + path, {
    ...opts,
    headers
  });
  
  const d = await r.json();
  if (!r.ok) {
    if (r.status === 401) {
      throw new Error('Authentication required. Please login to the main application.');
    }
    throw new Error(d.error || 'Request failed');
  }
  return d;
}

async function getAuthToken() {
  const result = await chrome.storage.local.get(['auth_token']);
  return result.auth_token || null;
}

async function load() {
  const d = await call('/api/bootstrap');
  // Set current user from authenticated session
  actorId = d.actor.id;
  $('#user').innerHTML = `<option value="${d.actor.id}" selected>${d.actor.display_name}</option>`;
  $('#user').disabled = true; // Disable user switching with JWT auth
  tasks = [];
  for (const m of d.matters) {
    const info = await call('/api/matters/' + m.id);
    tasks.push(...info.tasks.filter(t => t.assignee_id === actorId && t.status !== 'closed').map(t => ({ ...t, matterTitle: m.title })));
  }
  $('#task').innerHTML = '<option value="">Select a task</option>' + tasks.map(t => `<option value="${t.id}">${t.matterTitle}: ${t.title}</option>`).join('');
}

$('#send').onclick = async () => {
  const taskId = $('#task').value;
  if (!taskId) return $('#result').textContent = 'Choose an assigned task first.';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url || '');
    const payload = {
      taskId,
      action: $('#action').value,
      recordRef: $('#record').value,
      attestation: $('#attestation').value,
      destination: url.origin + url.pathname,
      connector: /axon/i.test(url.hostname) ? 'axon' : 'generic'
    };
    await call('/api/extension/events', { method: 'POST', body: JSON.stringify(payload) });
    $('#result').textContent = 'Activity logged.';
  } catch (e) {
    $('#result').textContent = e.message;
  }
};

load().catch(e => $('#result').textContent = e.message);
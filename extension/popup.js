const API = 'http://localhost:3001';
const $ = s => document.querySelector(s);
let actorId = 'user-business', tasks = [];

async function call(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': actorId
    }
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Request failed');
  return d;
}

async function load() {
  const d = await call('/api/bootstrap');
  $('#user').innerHTML = d.users.map(u => `<option value="${u.id}" ${u.id === actorId ? 'selected' : ''}>${u.display_name}</option>`).join('');
  tasks = [];
  for (const m of d.matters) {
    const info = await call('/api/matters/' + m.id);
    tasks.push(...info.tasks.filter(t => t.assignee_id === actorId && t.status !== 'closed').map(t => ({ ...t, matterTitle: m.title })));
  }
  $('#task').innerHTML = '<option value="">Select a task</option>' + tasks.map(t => `<option value="${t.id}">${t.matterTitle}: ${t.title}</option>`).join('');
}

$('#user').onchange = async e => {
  actorId = e.target.value;
  await load();
};

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
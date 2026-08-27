let state = { actor: null, users: [], matters: [], selected: null };
const $ = s => document.querySelector(s);
const api = async (path, opts = {}) => {
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(opts.headers || {})
  };

  const r = await fetch(window.API + path, {
    ...opts,
    headers
  });
  
  const d = await r.json();
  if (!r.ok) {
    if (r.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/docs/role-login.html';
    }
    throw new Error(d.error || 'Request failed');
  }
  return d;
};
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => new Date(s).toLocaleString();

async function boot() {
  const d = await api('/api/bootstrap');
  state = { ...state, ...d };
  $('#who').textContent = `${d.actor.display_name} · ${d.actor.role.replace('_', ' ')}`;
  $('#user-switch').innerHTML = d.users.map(u => `<option value="${u.id}" ${u.id === d.actor.id ? 'selected' : ''}>${esc(u.display_name)} (${u.role.replace('_', ' ')})</option>`).join('');
  $('#member-select').innerHTML = '<option value="">No additional member</option>' + d.users.filter(u => u.role === 'business_user').map(u => `<option value="${u.id}">${esc(u.display_name)}</option>`).join('');
  $('#assignee-select').innerHTML = d.users.filter(u => u.role === 'business_user').map(u => `<option value="${u.id}">${esc(u.display_name)}</option>`).join('');
  renderList();
  if (state.selected) await selectMatter(state.selected);
}

function renderList() {
  $('#matter-list').innerHTML = state.matters.length ? state.matters.map(m => `<button class="matter-item ${m.id === state.selected ? 'active' : ''}" data-id="${m.id}"><b>${esc(m.title)}</b><br><small>${esc(m.created_at.slice(0, 10))}</small></button>`).join('') : '<p class="hint">No matters yet.</p>';
  document.querySelectorAll('.matter-item').forEach(b => b.onclick = () => selectMatter(b.dataset.id));
}

async function selectMatter(id) {
  state.selected = id;
  renderList();
  const d = await api(`/api/matters/${id}`);
  $('#empty').hidden = true;
  $('#detail').hidden = false;
  const m = d.matter;
  $('#matter-title').textContent = m.title;
  $('#matter-description').textContent = m.description;
  $('#labels').innerHTML = [m.privilege_label && 'Attorney-client privilege', m.work_product_label && 'Work product', m.self_analysis_label && 'Critical self-analysis'].filter(Boolean).map(x => `<span class="tag">${x}</span>`).join('');
  $('#tasks').innerHTML = d.tasks.length ? d.tasks.map(t => `<article class="task"><div><b>${esc(t.title)}</b><p>${esc(t.instructions)}</p><small>${esc(t.assignee_name || 'Unassigned')}${t.due_at ? ' · due ' + esc(t.due_at) : ''}</small></div><button class="status" data-task="${t.id}" data-status="${t.status}">${t.status.replace('_', ' ')}</button></article>`).join('') : '<p class="hint">No tasks assigned.</p>';
  document.querySelectorAll('[data-task]').forEach(b => b.onclick = () => advance(b.dataset.task, b.dataset.status));
  $('#messages').innerHTML = d.messages.map(x => `<div class="message"><b>${esc(x.author_name)}</b><time>${fmt(x.created_at)}</time><br>${esc(x.body)}</div>`).join('') || '<p class="hint">No conversation yet.</p>';
  $('#events').innerHTML = d.events.map(e => `<div class="event"><b>${esc(e.event_type.replaceAll('.', ' · '))}</b><time>${fmt(e.occurred_at)}</time><p>${esc(e.actor_name)} · ${esc(e.source)}</p></div>`).join('') || '<p class="hint">No audit events yet.</p>';
}

async function advance(id, status) {
  const flow = { open: 'in_progress', in_progress: 'submitted', submitted: 'closed', changes_requested: 'in_progress', closed: 'closed' };
  if (flow[status] === status) return;
  try {
    await api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status: flow[status] }) });
    await selectMatter(state.selected);
  } catch (e) {
    alert(e.message);
  }
}

$('#user-switch').onchange = async e => {
  state.actor = { id: e.target.value };
  state.selected = null;
  await boot();
};

$('#new-matter').onclick = () => $('#matter-dialog').showModal();
$('#new-task').onclick = () => $('#task-dialog').showModal();

$('#matter-form').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const d = await api('/api/matters', {
      method: 'POST',
      body: JSON.stringify({
        title: f.get('title'),
        description: f.get('description'),
        privilegeLabel: f.has('privilegeLabel'),
        workProductLabel: f.has('workProductLabel'),
        selfAnalysisLabel: f.has('selfAnalysisLabel'),
        memberIds: f.get('memberId') ? [f.get('memberId')] : []
      })
    });
    $('#matter-dialog').close();
    e.target.reset();
    state.selected = d.id;
    await boot();
  } catch (x) {
    alert(x.message);
  }
};

$('#task-form').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api(`/api/matters/${state.selected}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        title: f.get('title'),
        instructions: f.get('instructions'),
        assigneeId: f.get('assigneeId'),
        dueAt: f.get('dueAt') || null
      })
    });
    $('#task-dialog').close();
    e.target.reset();
    await selectMatter(state.selected);
  } catch (x) {
    alert(x.message);
  }
};

$('#message-form').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api(`/api/matters/${state.selected}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: f.get('body') })
    });
    e.target.reset();
    await selectMatter(state.selected);
  } catch (x) {
    alert(x.message);
  }
};

$('#logout-btn').onclick = () => {
  localStorage.removeItem('auth_token');
  window.location.href = '/docs/role-login.html';
};

// Check authentication before booting
if (!localStorage.getItem('auth_token')) {
  window.location.href = '/docs/role-login.html';
} else {
  boot().catch(e => alert(e.message));
}
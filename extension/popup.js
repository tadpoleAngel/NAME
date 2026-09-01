const $ = s => document.querySelector(s);
let actorId = 'user-business', tasks = [];

// API URL - dynamically detect environment
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname === '';

const API = isLocalhost ? 'http://localhost:3001' : 'https://name-ray5.onrender.com';

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
  // Just check extension storage - this persists across all sites
  const result = await chrome.storage.local.get(['auth_token']);
  return result.auth_token || null;
}

// Manual sync function for the sync button
async function syncTokenFromMainApp() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      $('#syncStatus').textContent = 'No active tab found';
      return;
    }
    
    $('#syncStatus').textContent = 'Syncing...';
    
    // Use Chrome scripting API for Manifest V3
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return localStorage.getItem('auth_token');
      }
    });
    
    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
      const token = injectionResults[0].result;
      // Store it in extension storage
      await chrome.storage.local.set({ auth_token: token });
      $('#syncStatus').textContent = 'Token synced successfully!';
      // Reload the data (this will hide the sync section)
      load();
    } else {
      $('#syncStatus').textContent = 'No token found in current tab. Please login to the main app first.';
    }
  } catch (e) {
    console.log('Sync failed:', e);
    $('#syncStatus').textContent = 'Sync failed: ' + e.message;
  }
}

async function load() {
  // Check if user is authenticated first
  const token = await getAuthToken();
  if (!token) {
    // Show sync section if no token
    $('#syncSection').style.display = 'block';
    $('#result').textContent = 'Please sync token from main app first';
    return;
  }
  
  // Hide sync section if authenticated
  $('#syncSection').style.display = 'none';
  
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

$('#syncToken').onclick = async () => {
  await syncTokenFromMainApp();
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
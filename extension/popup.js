const $ = s => document.querySelector(s);
let actorId = 'user-business', tasks = [];
let pendingActivities = [];

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
  const result = await chrome.storage.local.get(['auth_token']);
  return result.auth_token || null;
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
  
  // Load pending activities
  loadPendingActivities();
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

// Load pending activities from storage
async function loadPendingActivities() {
  chrome.runtime.sendMessage({ action: 'getPendingActivities' }, (response) => {
    if (response && response.activities) {
      pendingActivities = response.activities;
      renderPendingActivities();
    }
  });
}

// Render pending activities
function renderPendingActivities() {
  const container = $('#activities-container');
  const clearAllBtn = $('#clearAll');
  
  if (pendingActivities.length === 0) {
    container.innerHTML = '<div class="no-activities">No pending activities detected yet.</div>';
    clearAllBtn.style.display = 'none';
    return;
  }
  
  clearAllBtn.style.display = 'block';
  
  container.innerHTML = pendingActivities.map(activity => {
    const statusClass = activity.status;
    const time = new Date(activity.detectedAt).toLocaleTimeString();
    
    let activityDetails = '';
    if (activity.activity.type === 'button_click') {
      activityDetails = `Clicked: ${activity.activity.buttonText}`;
    } else if (activity.activity.type === 'form_submission') {
      activityDetails = `Form submitted: ${activity.activity.formId}`;
    } else if (activity.activity.type === 'navigation') {
      activityDetails = `Navigated to: ${activity.activity.url.substring(0, 50)}...`;
    }
    
    let editForm = '';
    if (activity.status === 'pending') {
      editForm = `
        <div class="edit-form" id="edit-form-${activity.id}" style="display: none;">
          <label>Task:</label>
          <select class="edit-task" data-activity-id="${activity.id}">
            <option value="">Select a task</option>
            ${tasks.map(t => `<option value="${t.id}">${t.matterTitle}: ${t.title}</option>`).join('')}
          </select>
          <label>Action:</label>
          <select class="edit-action" data-activity-id="${activity.id}">
            <option value="opened">Opened</option>
            <option value="updated">Updated</option>
            <option value="reviewed">Reviewed</option>
            <option value="submitted">Submitted</option>
            <option value="completed">Completed</option>
          </select>
          <label>Record Reference:</label>
          <input class="edit-record" type="text" placeholder="Optional record ID" data-activity-id="${activity.id}">
          <label>Attestation:</label>
          <textarea class="edit-attestation" placeholder="Optional attestation" data-activity-id="${activity.id}"></textarea>
          <button class="submit-edit" data-activity-id="${activity.id}">Submit Edited</button>
        </div>
      `;
    }
    
    let actionButtons = '';
    if (activity.status === 'pending') {
      actionButtons = `
        <button class="approve-btn" data-activity-id="${activity.id}">Approve</button>
        <button class="edit-btn" data-activity-id="${activity.id}">Edit</button>
        <button class="discard-btn" data-activity-id="${activity.id}">Discard</button>
      `;
    } else if (activity.status === 'approved') {
      actionButtons = `<span>✓ Approved</span>`;
    } else if (activity.status === 'discarded') {
      actionButtons = `<span>✗ Discarded</span>`;
    }
    
    return `
      <div class="activity-item ${statusClass}" data-activity-id="${activity.id}">
        <div class="activity-header">
          <span class="activity-type">${activity.activity.type.replace('_', ' ')}</span>
          <span class="activity-time">${time}</span>
        </div>
        <div class="activity-details">${activityDetails}</div>
        <div class="activity-actions">
          ${actionButtons}
        </div>
        ${editForm}
      </div>
    `;
  }).join('');
  
  // Add event listeners for activity actions
  setupActivityListeners();
}

// Setup event listeners for activity actions
function setupActivityListeners() {
  // Approve buttons
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.onclick = () => handleActivityAction(btn.dataset.activityId, 'approve');
  });
  
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = () => toggleEditForm(btn.dataset.activityId);
  });
  
  // Discard buttons
  document.querySelectorAll('.discard-btn').forEach(btn => {
    btn.onclick = () => handleActivityAction(btn.dataset.activityId, 'discard');
  });
  
  // Submit edit buttons
  document.querySelectorAll('.submit-edit').forEach(btn => {
    btn.onclick = () => submitEditedActivity(btn.dataset.activityId);
  });
}

// Toggle edit form visibility
function toggleEditForm(activityId) {
  const form = document.getElementById(`edit-form-${activityId}`);
  if (form) {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }
}

// Handle activity actions (approve/discard)
async function handleActivityAction(activityId, action) {
  const activity = pendingActivities.find(a => a.id === activityId);
  if (!activity) return;
  
  if (action === 'approve') {
    // Auto-fill with default values and submit
    const payload = {
      taskId: tasks[0]?.id || '', // Use first task as default
      action: 'updated', // Default action
      recordRef: '',
      attestation: JSON.stringify(activity.activity).substring(0, 200),
      destination: activity.activity.pageUrl,
      connector: /axon/i.test(activity.activity.pageUrl) ? 'axon' : 'generic'
    };
    
    try {
      await call('/api/extension/events', { method: 'POST', body: JSON.stringify(payload) });
      chrome.runtime.sendMessage({ 
        action: 'updateActivityStatus', 
        activityId, 
        status: 'approved' 
      });
      loadPendingActivities();
    } catch (e) {
      alert('Failed to log activity: ' + e.message);
    }
  } else if (action === 'discard') {
    chrome.runtime.sendMessage({ 
      action: 'updateActivityStatus', 
      activityId, 
      status: 'discarded' 
    });
    loadPendingActivities();
  }
}

// Submit edited activity
async function submitEditedActivity(activityId) {
  const activity = pendingActivities.find(a => a.id === activityId);
  if (!activity) return;
  
  const taskId = document.querySelector(`.edit-task[data-activity-id="${activityId}"]`).value;
  const action = document.querySelector(`.edit-action[data-activity-id="${activityId}"]`).value;
  const recordRef = document.querySelector(`.edit-record[data-activity-id="${activityId}"]`).value;
  const attestation = document.querySelector(`.edit-attestation[data-activity-id="${activityId}"]`).value;
  
  if (!taskId) {
    alert('Please select a task');
    return;
  }
  
  const payload = {
    taskId,
    action,
    recordRef,
    attestation,
    destination: activity.activity.pageUrl,
    connector: /axon/i.test(activity.activity.pageUrl) ? 'axon' : 'generic'
  };
  
  try {
    await call('/api/extension/events', { method: 'POST', body: JSON.stringify(payload) });
    chrome.runtime.sendMessage({ 
      action: 'updateActivityStatus', 
      activityId, 
      status: 'approved',
      editedActivity: { selectedTask: taskId, selectedAction: action, recordRef, attestation }
    });
    loadPendingActivities();
  } catch (e) {
    alert('Failed to log activity: ' + e.message);
  }
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
  };
});

// Sync token button
$('#syncToken').onclick = async () => {
  await syncTokenFromMainApp();
};

// Manual send button
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

// Clear all activities
$('#clearAll').onclick = () => {
  if (confirm('Are you sure you want to clear all pending activities?')) {
    chrome.runtime.sendMessage({ action: 'clearPendingActivities' }, () => {
      loadPendingActivities();
    });
  }
};

// Initialize
load().catch(e => $('#result').textContent = e.message);
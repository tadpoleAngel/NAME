// Extension background script to handle authentication and activity monitoring
// This script listens for login events from the main application and activity from content scripts

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setAuthToken') {
    chrome.storage.local.set({ auth_token: request.token }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getAuthToken') {
    chrome.storage.local.get(['auth_token'], (result) => {
      sendResponse({ token: result.auth_token || null });
    });
    return true;
  }
  
  if (request.action === 'clearAuthToken') {
    chrome.storage.local.remove(['auth_token'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Handle activity detection from content scripts
  if (request.action === 'activityDetected') {
    handleActivityDetection(request.activity, sender.tab?.id);
    sendResponse({ success: true });
    return true;
  }
  
  // Get pending activities for review
  if (request.action === 'getPendingActivities') {
    chrome.storage.local.get(['pending_activities'], (result) => {
      sendResponse({ activities: result.pending_activities || [] });
    });
    return true;
  }
  
  // Update activity status (approve/edit/discard)
  if (request.action === 'updateActivityStatus') {
    updateActivityStatus(request.activityId, request.status, request.editedActivity);
    sendResponse({ success: true });
    return true;
  }
  
  // Clear all pending activities
  if (request.action === 'clearPendingActivities') {
    chrome.storage.local.set({ pending_activities: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Listen for external messages from web pages (like GitHub Pages)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // Verify the sender is from our allowed origins
  const allowedOrigins = [
    'http://localhost:3001',
    'https://tadpoleangel.github.io'
  ];
  
  if (!allowedOrigins.includes(sender.origin)) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return;
  }
  
  if (request.action === 'setAuthToken') {
    chrome.storage.local.set({ auth_token: request.token }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getAuthToken') {
    chrome.storage.local.get(['auth_token'], (result) => {
      sendResponse({ token: result.auth_token || null });
    });
    return true;
  }
  
  if (request.action === 'clearAuthToken') {
    chrome.storage.local.remove(['auth_token'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle activity detection from content scripts
function handleActivityDetection(activity, tabId) {
  chrome.storage.local.get(['pending_activities'], (result) => {
    const pendingActivities = result.pending_activities || [];
    
    // Create a new activity entry
    const newActivity = {
      id: generateActivityId(),
      detectedAt: new Date().toISOString(),
      activity: activity,
      tabId: tabId,
      status: 'pending', // pending, approved, edited, discarded
      selectedTask: null, // Will be set by user
      selectedAction: null, // Will be set by user
      recordRef: '',
      attestation: ''
    };
    
    // Add to pending activities (limit to last 50)
    pendingActivities.unshift(newActivity);
    if (pendingActivities.length > 50) {
      pendingActivities.pop();
    }
    
    chrome.storage.local.set({ pending_activities: pendingActivities });
    
    // Show notification (optional - could be annoying)
    // chrome.notifications.create({
    //   type: 'basic',
    //   iconUrl: 'icon.png',
    //   title: 'Activity Detected',
    //   message: `New ${activity.type} detected on Axon`
    // });
  });
}

// Generate unique activity ID
function generateActivityId() {
  return 'activity_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update activity status
function updateActivityStatus(activityId, status, editedActivity = null) {
  chrome.storage.local.get(['pending_activities'], (result) => {
    const pendingActivities = result.pending_activities || [];
    
    const activityIndex = pendingActivities.findIndex(a => a.id === activityId);
    if (activityIndex !== -1) {
      pendingActivities[activityIndex].status = status;
      
      if (editedActivity) {
        pendingActivities[activityIndex].selectedTask = editedActivity.selectedTask;
        pendingActivities[activityIndex].selectedAction = editedActivity.selectedAction;
        pendingActivities[activityIndex].recordRef = editedActivity.recordRef;
        pendingActivities[activityIndex].attestation = editedActivity.attestation;
      }
      
      chrome.storage.local.set({ pending_activities: pendingActivities });
    }
  });
}
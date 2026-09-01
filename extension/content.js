// Content script to monitor Axon page activities
// This script runs on all pages but specifically targets Axon domains

let isAxonSite = window.location.hostname.includes('axon');
let activityDetected = false;
let currentActivity = null;

// Detect if we're on an Axon site
function checkAxonSite() {
  isAxonSite = window.location.hostname.includes('axon');
  if (isAxonSite) {
    console.log('Axon site detected - monitoring activities');
    setupActivityMonitors();
  }
}

// Set up activity monitors for Axon sites
function setupActivityMonitors() {
  // Monitor form submissions
  document.addEventListener('submit', (event) => {
    if (isAxonSite) {
      detectFormActivity(event);
    }
  });

  // Monitor button clicks
  document.addEventListener('click', (event) => {
    if (isAxonSite) {
      detectClickActivity(event);
    }
  });

  // Monitor URL changes (SPA navigation)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    if (isAxonSite) {
      detectNavigationActivity('pushState', args[2]);
    }
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    if (isAxonSite) {
      detectNavigationActivity('replaceState', args[2]);
    }
  };

  window.addEventListener('popstate', () => {
    if (isAxonSite) {
      detectNavigationActivity('popstate', window.location.href);
    }
  });
}

// Detect form-based activities
function detectFormActivity(event) {
  const form = event.target;
  const formData = new FormData(form);
  const formAction = form.action || window.location.href;
  const formMethod = form.method || 'POST';

  // Create activity detection
  const activity = {
    type: 'form_submission',
    action: formAction,
    method: formMethod,
    formId: form.id || form.name || 'unknown',
    timestamp: new Date().toISOString(),
    pageUrl: window.location.href,
    pageTitle: document.title
  };

  // Try to capture form data (non-sensitive fields only)
  const safeFields = {};
  for (let [key, value] of formData.entries()) {
    // Skip password fields and sensitive-looking data
    if (!key.toLowerCase().includes('password') && 
        !key.toLowerCase().includes('secret') &&
        !key.toLowerCase().includes('token') &&
        !key.toLowerCase().includes('credit')) {
      safeFields[key] = typeof value === 'string' ? value.substring(0, 100) : value;
    }
  }
  activity.fields = safeFields;

  sendActivityToBackground(activity);
}

// Detect click-based activities
function detectClickActivity(event) {
  const button = event.target.closest('button, a, [role="button"]');
  if (!button) return;

  const buttonText = button.textContent?.trim().substring(0, 50) || 'unknown';
  const buttonId = button.id || '';
  const buttonClass = button.className || '';

  // Filter out insignificant clicks
  if (buttonText.length < 2 && !buttonId) return;

  const activity = {
    type: 'button_click',
    buttonText,
    buttonId,
    buttonClass,
    timestamp: new Date().toISOString(),
    pageUrl: window.location.href,
    pageTitle: document.title
  };

  sendActivityToBackground(activity);
}

// Detect navigation activities
function detectNavigationActivity(method, url) {
  const activity = {
    type: 'navigation',
    method,
    url: url || window.location.href,
    timestamp: new Date().toISOString(),
    pageUrl: window.location.href,
    pageTitle: document.title
  };

  sendActivityToBackground(activity);
}

// Send activity to background script
function sendActivityToBackground(activity) {
  // Only send if we have meaningful activity
  if (isMeaningfulActivity(activity)) {
    chrome.runtime.sendMessage({
      action: 'activityDetected',
      activity: activity
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Failed to send activity to background:', chrome.runtime.lastError);
      }
    });
  }
}

// Filter out insignificant activities
function isMeaningfulActivity(activity) {
  // Filter out navigation to same page
  if (activity.type === 'navigation' && activity.url === activity.pageUrl) {
    return false;
  }

  // Filter out empty button clicks
  if (activity.type === 'button_click' && !activity.buttonText && !activity.buttonId) {
    return false;
  }

  // Filter out forms with no meaningful fields
  if (activity.type === 'form_submission' && Object.keys(activity.fields).length === 0) {
    return false;
  }

  return true;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      isAxon: isAxonSite
    });
  }
  
  if (request.action === 'getRecentActivity') {
    sendResponse({
      activity: currentActivity,
      detected: activityDetected
    });
  }
  
  if (request.action === 'getAuthToken') {
    // Get auth token from localStorage if it exists
    const token = localStorage.getItem('auth_token');
    sendResponse({ token: token || null });
  }
});

// Initialize on page load
checkAxonSite();
console.log('Content script loaded, monitoring for activities');
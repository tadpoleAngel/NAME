// Extension background script to handle authentication
// This script listens for login events from the main application

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
});
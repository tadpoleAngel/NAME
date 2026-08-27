window.API = 'http://localhost:3001';

// Token management
function getToken() {
  return localStorage.getItem('auth_token');
}

function setToken(token) {
  localStorage.setItem('auth_token', token);
}

function removeToken() {
  localStorage.removeItem('auth_token');
}

function isAuthenticated() {
  return !!getToken();
}

// API calls with authentication
async function api(path, opts = {}) {
  const token = getToken();
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
      // Token expired or invalid, clear it
      removeToken();
      window.location.href = '/role-login.html';
    }
    throw Error(d.error || 'Request failed');
  }
  return d;
}

// Authentication functions
async function login(email) {
  const d = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
  setToken(d.token);
  
  // Also set token in extension if available
  try {
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'setAuthToken',
        token: d.token
      });
    }
  } catch (e) {
    // Extension not available, that's fine
    console.log('Extension not available:', e);
  }
  
  return d.user;
}

async function getCurrentUser() {
  return api('/api/auth/me');
}

async function logout() {
  removeToken();
  window.location.href = '/role-login.html';
}

// Make functions available globally
window.authAPI = {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  api,
  login,
  getCurrentUser,
  logout
};
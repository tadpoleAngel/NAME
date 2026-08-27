import test from 'node:test';
import assert from 'node:assert/strict';

test('Health check endpoint', async () => {
  const response = await fetch('http://localhost:3001/health');
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.equal(data.status, 'ok');
  assert.ok(data.timestamp);
});

test('Login with valid email', async () => {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'amaya.chen@northwind.test' })
  });
  
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.ok(data.token);
  assert.ok(data.user);
  assert.equal(data.user.email, 'amaya.chen@northwind.test');
  assert.equal(data.user.role, 'attorney');
});

test('Login with invalid email', async () => {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid@example.com' })
  });
  
  const data = await response.json();
  
  assert.equal(response.status, 401);
  assert.ok(data.error);
});

test('Protected endpoint without token', async () => {
  const response = await fetch('http://localhost:3001/api/auth/me');
  const data = await response.json();
  
  assert.equal(response.status, 401);
  assert.ok(data.error);
});

test('Protected endpoint with valid token', async () => {
  // First login to get token
  const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'amaya.chen@northwind.test' })
  });
  
  const loginData = await loginResponse.json();
  
  // Use token to access protected endpoint
  const response = await fetch('http://localhost:3001/api/auth/me', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  
  const data = await response.json();
  
  assert.equal(response.status, 200);
  assert.equal(data.email, 'amaya.chen@northwind.test');
  assert.equal(data.role, 'attorney');
});
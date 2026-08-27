import test from 'node:test';
import assert from 'node:assert/strict';

let authToken = null;
let userId = null;

test('Complete authentication and API workflow', async (t) => {
  // Step 1: Login
  await t.test('Login as attorney', async () => {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amaya.chen@northwind.test' })
    });
    
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.ok(data.token);
    authToken = data.token;
    userId = data.user.id;
  });
  
  // Step 2: Get bootstrap data
  await t.test('Get bootstrap data', async () => {
    const response = await fetch('http://localhost:3001/api/matters/bootstrap', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.ok(data.actor);
    assert.ok(Array.isArray(data.users));
    assert.ok(Array.isArray(data.matters));
    assert.equal(data.actor.role, 'attorney');
  });
  
  // Step 3: Create a matter
  await t.test('Create a matter', async () => {
    const response = await fetch('http://localhost:3001/api/matters', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Matter',
        description: 'Integration test matter',
        privilegeLabel: true,
        workProductLabel: false,
        selfAnalysisLabel: false
      })
    });
    
    const data = await response.json();
    assert.equal(response.status, 201);
    assert.ok(data.id);
  });
  
  // Step 4: Test unauthorized access
  await t.test('Unauthorized access without token', async () => {
    const response = await fetch('http://localhost:3001/api/matters/bootstrap');
    const data = await response.json();
    
    assert.equal(response.status, 401);
    assert.ok(data.error);
  });
});
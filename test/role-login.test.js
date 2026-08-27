import test from 'node:test';
import assert from 'node:assert/strict';

test('Role-based login functionality', async (t) => {
  // Test attorney login
  await t.test('Attorney can login', async () => {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amaya.chen@northwind.test' })
    });
    
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.ok(data.token);
    assert.equal(data.user.role, 'attorney');
    assert.equal(data.user.email, 'amaya.chen@northwind.test');
  });
  
  // Test business user login
  await t.test('Business user can login', async () => {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jordan.lee@northwind.test' })
    });
    
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.ok(data.token);
    assert.equal(data.user.role, 'business_user');
    assert.equal(data.user.email, 'jordan.lee@northwind.test');
  });
  
  // Test auditor login
  await t.test('Auditor can login', async () => {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auditor@northwind.test' })
    });
    
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.ok(data.token);
    assert.equal(data.user.role, 'auditor');
    assert.equal(data.user.email, 'auditor@northwind.test');
  });
  
  // Test role-based permissions
  await t.test('Attorney can create matters', async () => {
    // Login as attorney
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amaya.chen@northwind.test' })
    });
    const loginData = await loginResponse.json();
    
    // Try to create matter
    const response = await fetch('http://localhost:3001/api/matters', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Matter from Role Login',
        description: 'Testing role-based permissions',
        privilegeLabel: true
      })
    });
    
    const data = await response.json();
    assert.equal(response.status, 201);
    assert.ok(data.id);
  });
  
  // Test business user cannot create matters
  await t.test('Business user cannot create matters', async () => {
    // Login as business user
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jordan.lee@northwind.test' })
    });
    const loginData = await loginResponse.json();
    
    // Try to create matter
    const response = await fetch('http://localhost:3001/api/matters', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Unauthorized Matter',
        description: 'This should fail'
      })
    });
    
    const data = await response.json();
    assert.equal(response.status, 403);
    assert.ok(data.error);
  });
});
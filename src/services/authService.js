import { getConnection } from '../config/database.js';

export async function checkMatterAccess(userId, matterId) {
  const connection = getConnection();
  
  // Check if user has admin roles
  const userResult = await connection.runAndReadAll(
    `SELECT role FROM main.users WHERE id='${userId}'`
  );
  const user = userResult.getRowObjects()[0];
  
  if (!user) return false;
  
  if (['platform_admin', 'tenant_admin', 'auditor'].includes(user.role)) {
    return true;
  }
  
  // Check if user is a member of the matter
  const memberResult = await connection.runAndReadAll(
    `SELECT 1 FROM main.matter_members WHERE matter_id='${matterId}' AND user_id='${userId}'`
  );
  
  return memberResult.getRowObjects().length > 0;
}

export async function verifyTenantAccess(userId, tenantId) {
  const connection = getConnection();
  
  const result = await connection.runAndReadAll(
    `SELECT tenant_id FROM main.users WHERE id='${userId}'`
  );
  const user = result.getRowObjects()[0];
  
  return user && user.tenant_id === tenantId;
}
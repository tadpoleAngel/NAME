import { createHash, randomUUID } from 'node:crypto';
import { getConnection } from '../config/database.js';

export async function writeAudit({ tenantId, matterId = null, taskId = null, actor, eventType, source, payload = {} }) {
  const connection = getConnection();
  const now = new Date().toISOString();
  
  // Get previous hash for chain
  const previousResult = await connection.runAndReadAll(
    `SELECT event_hash FROM main.audit_events WHERE tenant_id='${tenantId}' ORDER BY occurred_at DESC, id DESC LIMIT 1`
  );
  const previous = previousResult.getRowObjects()[0]?.event_hash || 'GENESIS';
  
  const id = randomUUID();
  const canonical = JSON.stringify({ 
    id, tenantId, matterId, taskId, actorId: actor.id, eventType, source, payload, occurredAt: now, previous 
  });
  const hash = createHash('sha256').update(canonical).digest('hex');
  
  await connection.run(
    `INSERT INTO main.audit_events VALUES ('${id}', '${tenantId}', ${matterId ? `'${matterId}'` : 'NULL'}, ${taskId ? `'${taskId}'` : 'NULL'}, '${actor.id}', '${eventType}', '${source}', '${JSON.stringify(payload).replace(/'/g, "''")}', '${now}', '${previous}', '${hash}')`
  );
  
  return { id, hash };
}
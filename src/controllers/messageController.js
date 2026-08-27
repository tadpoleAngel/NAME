import { randomUUID } from 'node:crypto';
import { getConnection } from '../config/database.js';
import { writeAudit } from '../services/auditService.js';
import { checkMatterAccess } from '../services/authService.js';

export async function createMessage(req, res) {
  try {
    const { matterId } = req.params;
    const connection = getConnection();
    const user = req.user;
    const { body } = req.body;

    if (!body?.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Verify matter access
    const matterResult = await connection.runAndReadAll(
      `SELECT id FROM main.matters WHERE id='${matterId}' AND tenant_id='${user.tenant_id}'`
    );
    const matter = matterResult.getRowObjects()[0];

    if (!matter || !(await checkMatterAccess(user.id, matterId))) {
      return res.status(403).json({ error: 'Matter access denied' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await connection.run(
      `INSERT INTO main.messages VALUES ('${id}', '${user.tenant_id}', '${matterId}', '${user.id}', '${body.trim()}', '${now}')`
    );

    await writeAudit({
      tenantId: user.tenant_id,
      matterId,
      actor: user,
      eventType: 'message.sent',
      source: 'web',
      payload: { messageId: id }
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
}
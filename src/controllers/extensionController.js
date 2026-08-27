import { getConnection } from '../config/database.js';
import { writeAudit } from '../services/auditService.js';
import { checkMatterAccess } from '../services/authService.js';

export async function logExtensionEvent(req, res) {
  try {
    const connection = getConnection();
    const user = req.user;
    const { taskId, action, recordRef, attestation, destination, connector } = req.body;

    // Get task details
    const taskResult = await connection.runAndReadAll(
      `SELECT * FROM main.tasks WHERE id='${taskId}' AND tenant_id='${user.tenant_id}'`
    );
    const task = taskResult.getRowObjects()[0];

    if (!task || task.assignee_id !== user.id || !(await checkMatterAccess(user.id, task.matter_id))) {
      return res.status(403).json({ error: 'Select a task assigned to you' });
    }

    const actions = ['opened', 'updated', 'reviewed', 'submitted', 'completed'];
    if (!actions.includes(action)) {
      return res.status(400).json({ error: 'Invalid declared action' });
    }

    const destinationClean = String(destination || '').slice(0, 512);
    const recordRefClean = String(recordRef || '').slice(0, 256);
    const attestationClean = String(attestation || '').slice(0, 1000);

    await writeAudit({
      tenantId: user.tenant_id,
      matterId: task.matter_id,
      taskId: task.id,
      actor: user,
      eventType: `activity.${action}`,
      source: connector === 'axon' ? 'extension.axon' : 'extension.generic',
      payload: {
        destination: destinationClean,
        recordRef: recordRefClean,
        attestation: attestationClean
      }
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Extension event error:', error);
    res.status(500).json({ error: 'Failed to log extension event' });
  }
}
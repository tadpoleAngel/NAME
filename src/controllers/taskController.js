import { randomUUID } from 'node:crypto';
import { getConnection } from '../config/database.js';
import { writeAudit } from '../services/auditService.js';
import { checkMatterAccess } from '../services/authService.js';

export async function createTask(req, res) {
  try {
    const { matterId } = req.params;
    const connection = getConnection();
    const user = req.user;
    const { title, instructions, assigneeId, dueAt } = req.body;

    // Verify matter access
    const matterResult = await connection.runAndReadAll(
      `SELECT id FROM main.matters WHERE id='${matterId}' AND tenant_id='${user.tenant_id}'`
    );
    const matter = matterResult.getRowObjects()[0];

    if (!matter || !(await checkMatterAccess(user.id, matterId))) {
      return res.status(403).json({ error: 'Matter access denied' });
    }

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    // Verify assignee exists
    let assignee = null;
    if (assigneeId) {
      const assigneeResult = await connection.runAndReadAll(
        `SELECT id FROM main.users WHERE id='${assigneeId}' AND tenant_id='${user.tenant_id}'`
      );
      assignee = assigneeResult.getRowObjects()[0];
    }

    await connection.run(
      `INSERT INTO main.tasks VALUES ('${id}', '${user.tenant_id}', '${matterId}', '${title.trim()}', '${instructions || ''}', ${assignee?.id ? `'${assignee.id}'` : 'NULL'}, ${dueAt ? `'${dueAt}'` : 'NULL'}, 'open', '${user.id}', '${now}', '${now}')`
    );

    await writeAudit({
      tenantId: user.tenant_id,
      matterId,
      taskId: id,
      actor: user,
      eventType: 'task.created',
      source: 'web',
      payload: { title, assigneeId: assignee?.id || null }
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function updateTask(req, res) {
  try {
    const { taskId } = req.params;
    const connection = getConnection();
    const user = req.user;
    const { status, note } = req.body;

    const taskResult = await connection.runAndReadAll(
      `SELECT * FROM main.tasks WHERE id='${taskId}' AND tenant_id='${user.tenant_id}'`
    );
    const task = taskResult.getRowObjects()[0];

    if (!task || !(await checkMatterAccess(user.id, task.matter_id))) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const permitted = ['open', 'in_progress', 'submitted', 'changes_requested', 'closed'];
    if (!permitted.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const attorneyAction = ['changes_requested', 'closed'].includes(status);
    if (attorneyAction && !['attorney', 'tenant_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Attorney review required' });
    }

    if (!attorneyAction && task.assignee_id !== user.id && !['attorney', 'tenant_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Only assignee may update task' });
    }

    const now = new Date().toISOString();
    await connection.run(
      `UPDATE main.tasks SET status='${status}',updated_at='${now}' WHERE id='${task.id}'`
    );

    await writeAudit({
      tenantId: user.tenant_id,
      matterId: task.matter_id,
      taskId: task.id,
      actor: user,
      eventType: `task.${status}`,
      source: 'web',
      payload: { note: note || '' }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
}
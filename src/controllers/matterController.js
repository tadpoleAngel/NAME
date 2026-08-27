import { randomUUID } from 'node:crypto';
import { getConnection } from '../config/database.js';
import { writeAudit } from '../services/auditService.js';
import { checkMatterAccess } from '../services/authService.js';

export async function getBootstrap(req, res) {
  try {
    const connection = getConnection();
    const user = req.user;

    const mattersResult = await connection.runAndReadAll(
      `SELECT m.* FROM main.matters m WHERE m.tenant_id='${user.tenant_id}' AND ('${user.role}' IN ('platform_admin','tenant_admin','auditor') OR EXISTS(SELECT 1 FROM main.matter_members mm WHERE mm.matter_id=m.id AND mm.user_id='${user.id}')) ORDER BY m.created_at DESC`
    );
    
    const usersResult = await connection.runAndReadAll(
      `SELECT id,display_name,role FROM main.users WHERE tenant_id='${user.tenant_id}'`
    );

    res.json({
      actor: user,
      users: usersResult.getRowObjects(),
      matters: mattersResult.getRowObjects()
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Failed to load bootstrap data' });
  }
}

export async function getMatter(req, res) {
  try {
    const { id } = req.params;
    const connection = getConnection();
    const user = req.user;

    const matterResult = await connection.runAndReadAll(
      `SELECT * FROM main.matters WHERE id='${id}' AND tenant_id='${user.tenant_id}'`
    );
    const matter = matterResult.getRowObjects()[0];

    if (!matter || !(await checkMatterAccess(user.id, matter.id))) {
      return res.status(404).json({ error: 'Matter not found' });
    }

    const tasksResult = await connection.runAndReadAll(
      `SELECT t.*, u.display_name assignee_name FROM main.tasks t LEFT JOIN main.users u ON u.id=t.assignee_id WHERE t.matter_id='${matter.id}' ORDER BY t.updated_at DESC`
    );
    
    const messagesResult = await connection.runAndReadAll(
      `SELECT ms.*, u.display_name author_name FROM main.messages ms JOIN main.users u ON u.id=ms.author_id WHERE ms.matter_id='${matter.id}' ORDER BY ms.created_at`
    );
    
    const eventsResult = await connection.runAndReadAll(
      `SELECT ae.*,u.display_name actor_name FROM main.audit_events ae JOIN main.users u ON u.id=ae.actor_id WHERE ae.matter_id='${matter.id}' ORDER BY ae.occurred_at DESC,ae.id DESC`
    );
    
    const events = eventsResult.getRowObjects().map(e => ({ 
      ...e, 
      payload: JSON.parse(e.payload) 
    }));

    res.json({
      matter,
      tasks: tasksResult.getRowObjects(),
      messages: messagesResult.getRowObjects(),
      events
    });
  } catch (error) {
    console.error('Get matter error:', error);
    res.status(500).json({ error: 'Failed to load matter' });
  }
}

export async function createMatter(req, res) {
  try {
    const connection = getConnection();
    const user = req.user;
    const { title, description, privilegeLabel, workProductLabel, selfAnalysisLabel, memberIds } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await connection.run(
      `INSERT INTO main.matters VALUES ('${id}', '${user.tenant_id}', '${title.trim()}', '${description || ''}', ${+!!privilegeLabel}, ${+!!workProductLabel}, ${+!!selfAnalysisLabel}, '${user.id}', '${now}')`
    );

    await connection.run(`INSERT INTO main.matter_members VALUES ('${id}', '${user.id}')`);

    // Add additional members
    for (const memberId of (memberIds || [])) {
      const userCheck = await connection.runAndReadAll(
        `SELECT 1 FROM main.users WHERE id='${memberId}' AND tenant_id='${user.tenant_id}'`
      );
      if (userCheck.getRowObjects().length > 0) {
        await connection.run(`INSERT OR IGNORE INTO main.matter_members VALUES ('${id}', '${memberId}')`);
      }
    }

    await writeAudit({
      tenantId: user.tenant_id,
      matterId: id,
      actor: user,
      eventType: 'matter.created',
      source: 'web',
      payload: { title }
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('Create matter error:', error);
    res.status(500).json({ error: 'Failed to create matter' });
  }
}
import { getConnection } from '../config/database.js';

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
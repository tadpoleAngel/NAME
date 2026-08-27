import { DuckDBInstance } from '@duckdb/node-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.MOTHERDUCK_API_KEY;
const database = process.env.MOTHERDUCK_DATABASE || 'privileged_matter_workflow';

let instance = null;
let connection = null;

export async function initializeDatabase() {
  if (instance && connection) {
    return connection;
  }

  instance = await DuckDBInstance.fromCache(`md:${database}`, {
    motherduck_token: token,
  });
  connection = await instance.connect();

  // Initialize database schema
  await connection.run(`
    CREATE SCHEMA IF NOT EXISTS main;

    CREATE TABLE IF NOT EXISTS main.tenants(
      id TEXT PRIMARY KEY, 
      name TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS main.users(
      id TEXT PRIMARY KEY, 
      tenant_id TEXT NOT NULL, 
      email TEXT NOT NULL, 
      display_name TEXT NOT NULL, 
      role TEXT NOT NULL,
      google_id TEXT UNIQUE,
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS main.matters(
      id TEXT PRIMARY KEY, 
      tenant_id TEXT NOT NULL, 
      title TEXT NOT NULL, 
      description TEXT NOT NULL DEFAULT '', 
      privilege_label INTEGER NOT NULL, 
      work_product_label INTEGER NOT NULL, 
      self_analysis_label INTEGER NOT NULL, 
      created_by TEXT NOT NULL, 
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS main.matter_members(
      matter_id TEXT NOT NULL, 
      user_id TEXT NOT NULL, 
      PRIMARY KEY(matter_id,user_id)
    );
    
    CREATE TABLE IF NOT EXISTS main.tasks(
      id TEXT PRIMARY KEY, 
      tenant_id TEXT NOT NULL, 
      matter_id TEXT NOT NULL, 
      title TEXT NOT NULL, 
      instructions TEXT NOT NULL, 
      assignee_id TEXT, 
      due_at TEXT, 
      status TEXT NOT NULL, 
      created_by TEXT NOT NULL, 
      created_at TEXT NOT NULL, 
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS main.messages(
      id TEXT PRIMARY KEY, 
      tenant_id TEXT NOT NULL, 
      matter_id TEXT NOT NULL, 
      author_id TEXT NOT NULL, 
      body TEXT NOT NULL, 
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS main.audit_events(
      id TEXT PRIMARY KEY, 
      tenant_id TEXT NOT NULL, 
      matter_id TEXT, 
      task_id TEXT, 
      actor_id TEXT NOT NULL, 
      event_type TEXT NOT NULL, 
      source TEXT NOT NULL, 
      payload TEXT NOT NULL, 
      occurred_at TEXT NOT NULL, 
      previous_hash TEXT NOT NULL, 
      event_hash TEXT NOT NULL UNIQUE
    );
  `);

  // Seed demo data if tenant doesn't exist
  const ids = { 
    tenant: 'tenant-demo', 
    attorney: 'user-attorney', 
    user: 'user-business', 
    auditor: 'user-auditor' 
  };
  
  const tenantCheck = await connection.runAndReadAll(
    `SELECT id FROM main.tenants WHERE id='${ids.tenant}'`
  );
  
  if (tenantCheck.getRowObjects().length === 0) {
    await connection.run(`INSERT INTO main.tenants VALUES ('${ids.tenant}', 'Northwind Claims')`);
    
    for (const [id, email, name, role] of [
      [ids.attorney, 'amaya.chen@northwind.test', 'Amaya Chen', 'attorney'], 
      [ids.user, 'jordan.lee@northwind.test', 'Jordan Lee', 'business_user'], 
      [ids.auditor, 'auditor@northwind.test', 'Morgan Hall', 'auditor']
    ]) {
      await connection.run(
        `INSERT INTO main.users VALUES ('${id}', '${ids.tenant}', '${email}', '${name}', '${role}', NULL, '${new Date().toISOString()}')`
      );
    }
  }

  return connection;
}

export function getConnection() {
  if (!connection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return connection;
}

export async function closeDatabase() {
  if (connection) {
    await connection.close();
    connection = null;
  }
  if (instance) {
    await instance.close();
    instance = null;
  }
}
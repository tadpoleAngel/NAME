-- Production PostgreSQL schema. Tenant predicates are mandatory on every access path.
CREATE TYPE app_role AS ENUM ('platform_admin', 'tenant_admin', 'attorney', 'business_user', 'auditor');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'submitted', 'changes_requested', 'closed');

CREATE TABLE tenants (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE users (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), email text NOT NULL, display_name text NOT NULL, role app_role NOT NULL, UNIQUE (tenant_id, email));
CREATE TABLE matters (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), title text NOT NULL, description text NOT NULL DEFAULT '', privilege_label boolean NOT NULL DEFAULT false, work_product_label boolean NOT NULL DEFAULT false, self_analysis_label boolean NOT NULL DEFAULT false, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE matter_members (matter_id uuid NOT NULL REFERENCES matters(id), user_id uuid NOT NULL REFERENCES users(id), PRIMARY KEY (matter_id, user_id));
CREATE TABLE tasks (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), matter_id uuid NOT NULL REFERENCES matters(id), title text NOT NULL, instructions text NOT NULL DEFAULT '', assignee_id uuid REFERENCES users(id), due_at timestamptz, status task_status NOT NULL DEFAULT 'open', created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE messages (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), matter_id uuid NOT NULL REFERENCES matters(id), author_id uuid NOT NULL REFERENCES users(id), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_events (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), matter_id uuid REFERENCES matters(id), task_id uuid REFERENCES tasks(id), actor_id uuid NOT NULL REFERENCES users(id), event_type text NOT NULL, source text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now(), previous_hash text NOT NULL, event_hash text NOT NULL, UNIQUE (tenant_id, event_hash));
CREATE INDEX audit_events_tenant_time_idx ON audit_events (tenant_id, occurred_at, id);

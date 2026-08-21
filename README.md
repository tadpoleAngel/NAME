# Privileged Matter Workflow

A runnable v1 prototype for privileged matter collaboration: matter-scoped chat, structured tasks, auditable workflows, and a Chrome/Edge extension for explicit, metadata-only activity capture.

## Run locally

Requires Node 24. Run `npm start`, then open `http://localhost:3000`. The local demo uses Node's built-in SQLite database at `data/workflow.sqlite`; it is seeded with a tenant, an attorney, a business user, and an auditor. Use **Switch user** to exercise role-based access.

The local demo's identity header/user switch exists solely to make role testing easy. Production authentication must derive identity and tenant claims from a verified session or SSO token; never accept a user identity from a browser-controlled header.

## Browser extension

In Chrome or Edge, open the extensions page, enable Developer mode, choose **Load unpacked**, and select `extension/`. Start the web app first. The extension talks only to `http://localhost:3000` in development and records a user-selected task plus a declared action. It never reads page contents, keypresses, passwords, or screenshots.

## Production shape

`db/postgres-schema.sql` is the PostgreSQL migration contract. In production, replace the local SQLite connection in `server.js` with the approved Postgres driver/repository, enable TLS and enterprise SSO, use an external secrets manager, and replicate the approved `audit_events` projection to MotherDuck. SQLite is deliberately a local demonstration adapter, not a production storage recommendation.

## Security boundary

Classification flags are workflow labels controlled by attorneys; this application does not determine legal privilege. Validate retention, e-discovery, monitoring, and integration rules with counsel before deploying with live matters.

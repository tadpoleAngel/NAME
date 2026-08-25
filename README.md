# Privileged Matter Workflow

A runnable v1 prototype for privileged matter collaboration: matter-scoped chat, structured tasks, auditable workflows, and a Chrome/Edge extension for explicit, metadata-only activity capture.

## Publish the interactive demo with GitHub Pages

The deployable static demo is in `docs/`. It is intentionally separate from the live local prototype: GitHub Pages cannot run Node, SQLite, authentication, or the browser-extension API.

1. Create a GitHub repository and push this project to its default branch.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose the default branch and the **`/docs`** folder, then save.
5. GitHub will publish the site at the URL shown on that page.

The Pages version is a presentation/demo only. It stores matter, task, chat, and audit-timeline interactions in the visitor's browser `localStorage`; it never sends them anywhere. Use the **Reset demo data** control to clear that local data.

## Run locally

Requires Node 24. Run `npm start`, then open `http://localhost:3001`. The local demo uses Node's built-in SQLite database at `data/workflow.sqlite`; it is seeded with a tenant, an attorney, a business user, and an auditor. Use **Switch user** to exercise role-based access.

The local demo's identity header/user switch exists solely to make role testing easy. Production authentication must derive identity and tenant claims from a verified session or SSO token; never accept a user identity from a browser-controlled header.

## Browser extension

In Chrome or Edge, open the extensions page, enable Developer mode, choose **Load unpacked**, and select `extension/`. Start the web app first. The extension talks only to `http://localhost:3001` in development and records a user-selected task plus a declared action. It never reads page contents, keypresses, passwords, or screenshots.

## Production shape

The application now uses MotherDuck as its database backend. For production deployment:

1. Enable TLS and enterprise SSO for authentication
2. Use an external secrets manager for the MotherDuck API key
3. Consider implementing connection pooling for high-traffic scenarios
4. The audit_events table provides an immutable, hash-chained audit trail

`db/postgres-schema.sql` is the PostgreSQL migration contract if you need to migrate to PostgreSQL for specific compliance requirements.

## Security boundary

Classification flags are workflow labels controlled by attorneys; this application does not determine legal privilege. Validate retention, e-discovery, monitoring, and integration rules with counsel before deploying with live matters.

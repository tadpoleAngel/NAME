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

Requires Node 24. Run `npm start`, then open `http://localhost:3000`. The local demo uses Node's built-in SQLite database at `data/workflow.sqlite`; it is seeded with a tenant, an attorney, a business user, and an auditor. Use **Switch user** to exercise role-based access.

The local demo's identity header/user switch exists solely to make role testing easy. Production authentication must derive identity and tenant claims from a verified session or SSO token; never accept a user identity from a browser-controlled header.

## Browser extension

In Chrome or Edge, open the extensions page, enable Developer mode, choose **Load unpacked**, and select `extension/`. Start the web app first. The extension talks only to `http://localhost:3000` in development and records a user-selected task plus a declared action. It never reads page contents, keypresses, passwords, or screenshots.

## Production shape

`db/postgres-schema.sql` is the PostgreSQL migration contract. In production, replace the local SQLite connection in `server.js` with the approved Postgres driver/repository, enable TLS and enterprise SSO, use an external secrets manager, and replicate the approved `audit_events` projection to MotherDuck. SQLite is deliberately a local demonstration adapter, not a production storage recommendation.

## Security boundary

Classification flags are workflow labels controlled by attorneys; this application does not determine legal privilege. Validate retention, e-discovery, monitoring, and integration rules with counsel before deploying with live matters.

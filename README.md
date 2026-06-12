# Secure Serverless Incident Portal

Secure Serverless Incident Portal, or SSIP, is a cloud-native incident reporting and triage platform built on Azure.

I built this project to explore what a realistic, security-focused serverless application looks like beyond a simple CRUD demo. The goal was to create a system where public users can submit and track security reports, while administrators can review, classify, assign, comment on, and update incidents through a protected internal console.

The project is intentionally designed around practical security and cloud engineering concerns: hashed tracking tokens, admin session cookies, Azure Functions, Azure SQL, CORS, deployment packaging, operational scripts, and a frontend that separates public workflows from internal SOC-style workflows.

I suggest having a look at the docs/images folders as it contains pictures of the Azure portal and the frontend itself.

---

## Table of contents

- why-this-project-exists
- what-the-application-does
- screenshots
- what-makes-it-interesting
- current-architecture
- security-model
- main-features
- tech-stack
- deployment-overview
- admin-key-rotation
- current-status
- why-anyone-should-care

---

## Why this project exists

Security incident reporting is one of those workflows that looks simple from the outside but becomes more interesting once real-world constraints are considered.

A useful reporting portal needs to handle questions like:

- How can someone submit an incident without needing an account?
- How can that same person track the report later without exposing internal data?
- How should administrators authenticate securely?
- How should internal comments and reviewer assignments be separated from public tracking?
- How can the system stay cheap to run while still being cloud-native?
- How can the whole environment be rebuilt if the Azure resources disappear?

SSIP is my answer to those questions in the form of a working Azure application.

---

## What the application does

SSIP has two main sides: a public reporting side and a protected admin side.

### Public side

Public users can:

- Submit a security incident, vulnerability, or suspicious activity report.
- Choose a report type, category, and severity.
- Submit anonymously or provide contact details.
- Receive a public incident ID.
- Receive a one-time tracking token.
- Track the status of the submitted report later.

The tracking token is not stored in plaintext. The backend stores only a hash, so the token cannot simply be recovered from the database.

### Admin side

Administrators can:

- Sign in through a protected admin login.
- View all submitted incidents in a dashboard.
- Filter incidents by status, severity, category, and search text.
- Quickly move incidents through statuses such as triage, investigating, resolved, closed, and rejected.
- Open a detailed case view.
- Assign a reviewer by display name.
- Add internal comments.
- View an internal comments timeline.
- Log out and revoke the browser-side admin session.

The admin interface is designed to feel closer to a lightweight SOC console than a default web form.

---
## Screenshots

./docs/images/01-home.png
docs/images/02-submit-incident.png
docs/images/03-track-incident.png
docs/images/04-admin-login.png
docs/images/05-admin-dashboard.png
---
## What makes it interesting

This project is not only about building forms and tables. The important part is the security and infrastructure work behind those forms.

Some of the more interesting parts are:

- The frontend doesn´t store the admin password or admin key.
- Admin authentication now uses a backend-issued `HttpOnly`, `Secure`, `SameSite=None` session cookie.
- Admin sessions are stored server-side in Azure SQL using a hashed session token.
- The admin key itself is stored only as `ADMIN_SHARED_KEY_HASH` in the Azure Function App configuration.
- Public tracking tokens are returned once and stored only as hashes.
- Internal comments use the authenticated admin session identity.
- Admin routes verify the backend session with `/internal/auth/me`.
- CORS is configured to support credentialed requests from the frontend origin.
- Deployment scripts package the frontend and backend separately.
- The project is being prepared for full infrastructure recreation using Infrastructure as Code (IaC).

---

## Current architecture

The application uses:

- **Azure App Service** for the React/Vite frontend.
- **Azure Functions** for public and internal APIs.
- **Azure SQL Database** for incidents, comments, tracking metadata, and admin sessions.
- **Azure Storage** for runtime/deployment storage and planned evidence storage.
- **Application Insights** for logs, traces, errors, and correlation IDs.

The runtime flow is roughly:

```text
Browser
  → Azure App Service frontend
  → Azure Functions API
  → Azure SQL Database
  → Application Insights
```

For admin authentication:

```text
Admin enters key once
  → POST /internal/auth/login
  → Backend validates SHA-256(adminKey) against ADMIN_SHARED_KEY_HASH
  → Backend creates AdminSession in Azure SQL
  → Backend returns HttpOnly session cookie
  → Admin requests use credentials: include
  → Backend validates the session cookie against AdminSession
```

---

## Security model

The current admin security model is intentionally more advanced than a basic shared-key frontend implementation.

### Previous approach

Originally, the admin key was stored in browser `sessionStorage` and sent with every admin request as `x-admin-key`.

That worked for an MVP, but it was not ideal because browser JavaScript could access the admin key.

### Current approach

The current model is:

1. The admin enters the key once.
2. The frontend sends the key only to `/internal/auth/login`.
3. The backend hashes the submitted key and compares it with `ADMIN_SHARED_KEY_HASH`.
4. If the key is valid, the backend creates an admin session in SQL.
5. The backend returns a secure HttpOnly cookie.
6. The frontend uses `credentials: include` for admin API calls.
7. Internal APIs validate the cookie session server-side.

This means the frontend no longer stores the plaintext admin key.

### Admin session table

The `AdminSession` table stores:

```text
SessionId
SessionTokenHash
PrincipalId
PrincipalName
IdentityProvider
CreatedUtc
ExpiresUtc
RevokedUtc
LastSeenUtc
```

Only the hash of the session token is stored.

### Token handling

Public tracking tokens and admin session tokens follow the same security principle:

```text
Return the plaintext token once.
Store only the hash.
Validate later by hashing the submitted token and comparing hashes.
```

This keeps sensitive tokens out of the database in plaintext form.

---

## Main features

### Incident submission

- Public incident form.
- Anonymous or identified submission.
- Report type, category, and severity.
- Public ID generation.
- One-time tracking token generation.
- Tracking token hash storage.

### Incident tracking

- Public tracking using public ID and tracking token.
- No administrator login required.
- Limited public-facing incident status view.

### Admin dashboard

- Protected admin login.
- Incident list with filters.
- KPI cards.
- Status and severity badges.
- Quick status actions.
- Loading message for Azure cold starts.

### Admin case view

- Full incident details.
- Status and severity update.
- Reviewer assignment.
- Reporter information.
- Internal comments timeline.
- Add internal comments.
- Session-aware logout.

### Security operations

- Admin key rotation through script.
- Optional SQL revocation of active sessions.
- CORS configured for credentialed requests.
- No plaintext admin key stored in frontend storage.

---

## Tech stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Azure App Service

### Backend

- Azure Functions
- Node.js
- TypeScript
- Azure SQL
- mssql
- Application settings for secrets/configuration

### Infrastructure and operations

- Azure CLI
- Bash deployment scripts
- ZIP deployment
- Application Insights
- Azure Storage
- Planned Bicep-based recreation

---

## Deployment overview

The frontend and backend are deployed separately.

### Backend

The backend deployment script builds the Azure Functions app, packages the compiled output and production dependencies, and creates a ZIP file for deployment.

```bash
./infra/scripts/deploy-api.sh
```

The generated ZIP is deployed to the Azure Function App.

### Frontend

The frontend deployment script builds the Vite app in deployment mode and packages the contents of `dist`.

```bash
./infra/scripts/deploy-frontend.sh
```

The generated ZIP is deployed to the Azure Web App.

Important: the frontend ZIP must contain the built production files, not the development source files. A correct deployment should serve assets from:

```text
/assets/index-xxxxx.js
```

not:

```text
/src/main.tsx
```

---

## Admin key rotation

The admin key can be rotated without changing source code.

The application uses:

```text
ADMIN_SHARED_KEY_HASH
```

inside the Azure Function App settings.

To rotate the key:

```bash
./infra/scripts/rotate-admin-key.sh
```

The script:

1. Prompts for a new admin key.
2. Hashes it with SHA-256.
3. Updates `ADMIN_SHARED_KEY_HASH`.
4. Restarts the Function App.

Rotating the admin key prevents future logins with the old key. Existing admin sessions can remain valid until expiry unless the `AdminSession` rows are revoked.

To revoke active admin sessions manually:

```sql
UPDATE dbo.AdminSession
SET RevokedUtc = SYSUTCDATETIME()
WHERE RevokedUtc IS NULL;
```

---

## Running locally

The frontend and backend are separate workspaces.

### Frontend build

```bash
cd src/frontend
npm run build -- --mode deployment
```

### Backend build

```bash
cd src/api
npm run build
```

Do not run the deployment-mode frontend build from the repository root, because the `--mode deployment` argument can be passed incorrectly to all workspaces.

---

## Current status

Implemented:

- Public incident submission.
- Public incident tracking.
- Admin login with backend-issued session cookies.
- Admin incident dashboard.
- Admin incident detail view.
- Internal comments.
- Reviewer assignment.
- Admin key rotation.
- Azure-style UI redesign.
- Frontend and backend deployment scripts.

In progress / planned:

- Full infrastructure recreation using Bicep.
- SQL schema initialization scripts.
- Better smoke tests.
- Login rate limiting.
- Admin audit logging.
- Evidence upload hardening.
- Improved documentation and diagrams.

---

## Why anyone should care

This project shows more than a basic serverless app.

It demonstrates how a small cloud application can handle realistic concerns:

- separating public and internal workflows,
- protecting administrative access,
- avoiding frontend secret storage,
- using hashed tokens,
- dealing with CORS and cookies,
- handling Azure cold starts,
- deploying frontend and backend independently,
- preparing infrastructure for recreation,
- and documenting the system like something that could be handed over.

For me, SSIP is a practical cloud security engineering project: small enough to understand, but complete enough to show real architecture, security decisions, and operational thinking.


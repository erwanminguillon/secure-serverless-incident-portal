# SSIP Skeleton Restore Checklist

This checklist explains how to recreate the SSIP Azure skeleton from the repository.

The restore process recreates the Azure resources and SQL structure, but it does not restore old data.

---

## What this restores

- Resource group resources
- Azure App Service frontend
- Azure Functions backend
- Azure SQL Server
- Azure SQL Database
- Storage accounts
- Blob containers
- Application Insights
- Function App CORS configuration
- Required application setting names
- SQL schema and reference data

---

## What this does not restore

- Existing incidents
- Existing comments
- Existing tracking tokens
- Existing admin sessions
- Historical user data

---

## Prerequisites

Before starting, make sure you have:

- Access to the Azure subscription.
- Access to Azure Cloud Shell.
- The repository cloned locally.
- The frontend and backend source code available.
- The SQL admin password available.
- The admin key hash available, or the plaintext admin key so you can generate the hash.
- The session signing secret available, or permission to generate a new one.

---

## Step 1 — Package the infrastructure locally

Run this from the repository root:

```bash
SKIP_BICEP_VALIDATION=true ./infra/scripts/package-infra.sh
```

This creates:

```text
infra/ssip-infra.zip
```

Use `SKIP_BICEP_VALIDATION=true` if local Azure CLI has certificate or corporate proxy issues.

---

## Step 2 — Upload the restore package to Azure Cloud Shell

Upload these file to Azure Cloud Shell:

```text
infra/ssip-infra.zip
```

and

```text
ssip-restore.sh
```

---

## Step 3 — Run the restore script in Cloud Shell


Using the manual ZIP workflow:

```bash
rm -rf infra
unzip -o ssip-infra.zip
chmod +x infra/scripts/restore-skeleton.sh
./infra/scripts/restore-skeleton.sh
```

The restore script will:

- Validate the Bicep files.
- Create the resource group if needed.
- Run a `what-if` preview.
- Ask for confirmation before deployment.
- Deploy the Azure skeleton.
- Initialize the SQL schema.

---

## Step 4 — Provide required secrets when prompted

The restore script may ask for:

```text
SQL admin password
ADMIN_SHARED_KEY_HASH
ADMIN_SESSION_SIGNING_SECRET
```

If `ADMIN_SESSION_SIGNING_SECRET` is not provided, the script can generate a new one.

Important:

```text
Do not commit these values to Git.
```

---

## Step 5 — Review the Bicep what-if output

Before continuing, carefully review the `what-if` output.

Acceptable changes usually include:

- Creating missing resources.
- Creating missing blob containers.
- Adding tags.
- Applying expected App Service or Function App configuration.
- Creating an empty SQL database.

Do not continue if the preview shows:

- Deleting important resources.
- Repointing the Function App to the wrong deployment storage container.
- Removing required Application Insights links.
- Changing unexpected SKUs.
- Removing required app settings.

When the preview looks correct, type:

```text
yes
```

to continue.

---

## Step 6 — Wait for Azure resource deployment

The restore script deploys the Azure skeleton with Bicep.

This may take several minutes.

Expected result:

```text
Azure skeleton deployed.
```

---

## Step 7 — SQL schema initialization

The restore script initializes the database structure automatically.

It runs:

```text
infra/sql/001_schema.sql
infra/sql/002_reference_data.sql
infra/sql/004_admin_sessions.sql
```

This creates the empty SSIP database structure.

The script does not run:

```text
infra/sql/005_revoke_admin_sessions.sql
```

That file is only for manually revoking active admin sessions.

---

## Step 8 — Build and package the backend locally

Run from the repository root:

```bash
./infra/scripts/deploy-api.sh
```

This creates:

```text
src/api/backend.zip
```

Upload `backend.zip` to Azure Cloud Shell.

---

## Step 9 — Deploy the backend in Cloud Shell

Run:

```bash
az functionapp deployment source config-zip   --resource-group rg-ssip-dev-frc-01   --name func-ssip-dev-frc-01   --src ./backend.zip
```

Verify the functions:

```bash
az functionapp function list   --resource-group rg-ssip-dev-frc-01   --name func-ssip-dev-frc-01   --output table
```

Expected functions include:

```text
SubmitIncident
TrackIncident
AdminAuthLogin
AdminAuthLogout
GetAdminMe
ListIncidents
GetIncidentById
UpdateIncidents
AddIncidentComment
ListIncidentComments
GetReferenceData
UploadEvidence
```

---

## Step 10 — Build and package the frontend locally

Run from the repository root:

```bash
./infra/scripts/deploy-frontend.sh
```

This creates:

```text
src/frontend/frontend.zip
```

Upload `frontend.zip` to Azure Cloud Shell.

---

## Step 11 — Deploy the frontend in Cloud Shell

Run:

```bash
az webapp deploy   --resource-group rg-ssip-dev-frc-01   --name web-ssip-dev-frc-01   --src-path ./frontend.zip   --type zip
```

Restart the Web App:

```bash
az webapp restart   --resource-group rg-ssip-dev-frc-01   --name web-ssip-dev-frc-01
```

---

## Step 12 — Verify the frontend deployment

Open the website and check that the app loads.

In browser DevTools, the frontend should load production files like:

```text
/assets/index-xxxxx.js
```

It should not load:

```text
/src/main.tsx
```

If `/src/main.tsx` appears, the wrong frontend files were deployed.

---

## Step 13 — Test public workflow

Test:

```text
/
```

Then test incident submission:

```text
/submit
```

Expected result:

- Incident is submitted.
- Public ID is returned.
- Tracking token is returned once.

Then test tracking:

```text
/track
```

Expected result:

- Public ID and tracking token return the public incident status.

---

## Step 14 — Test admin workflow

Open:

```text
/admin
```

Expected result:

- Admin login page loads.
- Random admin key fails.
- Valid admin key succeeds.
- Admin dashboard opens.

Then test:

```text
/admin/incidents
```

Expected result:

- Incident dashboard loads.
- Filters work.
- Status changes work.

Then open an incident detail page.

Expected result:

- Case details load.
- Reviewer assignment works.
- Internal comments work.

---

## Step 15 — Confirm frontend does not store the admin key

In browser DevTools:

```text
Application → Session Storage
```

Confirm there is no:

```text
ssip.adminKey
```

The frontend may store:

```text
ssip.adminName
ssip.adminAuthenticated
```

These are only frontend hints and are not proof of authorization.

Admin authorization is verified server-side through the HttpOnly cookie session.

---

## Step 16 — Confirm admin cookie exists

In browser DevTools:

```text
Application → Cookies
```

Confirm the backend domain has:

```text
ssip_admin_session
```

Expected cookie properties:

```text
HttpOnly
Secure
SameSite=None
```

---

## Step 17 — Test logout

Click logout in the admin UI.

Expected result:

- User returns to `/admin`.
- Admin dashboard is no longer accessible without logging in again.

---

## Step 18 — Optional admin key rotation

To rotate the admin key:

```bash
./infra/scripts/rotate-admin-key.sh
```

The script will:

- Prompt for a new admin key.
- Hash it with SHA-256.
- Update `ADMIN_SHARED_KEY_HASH` in the Function App.
- Restart the Function App.

After rotation:

- Old admin key should fail.
- New admin key should work.

---

## Step 19 — Final smoke test checklist

Confirm all of these work:

- Home page loads.
- Submit incident works.
- Track incident works.
- Admin login works.
- Random admin key fails.
- Admin dashboard loads.
- Incident status update works.
- Reviewer assignment works.
- Internal comment creation works.
- Logout works.
- No admin key is stored in browser session storage.
- Function App logs show no leaked admin key values.
- CORS works for credentialed admin requests.

---

## Normal restore command summary

Local machine:

```bash
SKIP_BICEP_VALIDATION=true ./infra/scripts/package-infra.sh
./infra/scripts/deploy-api.sh
./infra/scripts/deploy-frontend.sh
```

Upload to Cloud Shell:

```text
ssip-restore.sh
backend.zip
frontend.zip
```

Cloud Shell:

```bash
chmod +x ssip-restore.sh
./ssip-restore.sh
```

Deploy backend:

```bash
az functionapp deployment source config-zip   --resource-group rg-ssip-dev-frc-01   --name func-ssip-dev-frc-01   --src ./backend.zip
```

Deploy frontend:

```bash
az webapp deploy   --resource-group rg-ssip-dev-frc-01   --name web-ssip-dev-frc-01   --src-path ./frontend.zip   --type zip
```

Restart frontend:

```bash
az webapp restart   --resource-group rg-ssip-dev-frc-01   --name web-ssip-dev-frc-01
```

---

## Script summary

```text
package-infra.sh — Creates the Cloud Shell restore package from local Bicep, SQL, and script files.

restore-skeleton.sh — Restores the Azure resource skeleton, prompts for required secrets, deploys Bicep, and initializes the SQL schema.

deploy-api.sh — Builds and packages the Azure Functions backend into backend.zip.

deploy-frontend.sh — Builds and packages the React/Vite frontend into frontend.zip.

rotate-admin-key.sh — Rotates the admin key by updating ADMIN_SHARED_KEY_HASH in the Function App.

export-current-azure-state.sh — Optional diagnostic script for comparing live Azure resources with the Bicep skeleton.

configure-function-cors.sh — Legacy fallback for manually repairing Function App CORS if needed.
```

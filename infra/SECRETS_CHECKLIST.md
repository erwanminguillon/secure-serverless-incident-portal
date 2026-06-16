# SSIP Secret Recovery Checklist

This file lists the secrets and sensitive configuration values required to recreate or operate SSIP.


The purpose of this checklist is to explain:

- what each secret is used for,
- whether it must be preserved or can be regenerated,
- where it should be stored,
- and how to recreate it if needed.

---

## Secret storage rule

Never commit the following to Git:

- SQL passwords
- Admin keys
- Admin key hashes
- Session signing secrets
- Azure connection strings
- Storage account keys
- Publish profiles
- `.env` files
- `*.local.json` parameter files

Store real values in a secure location such as:

- Password manager
- Secure company vault
- Azure Key Vault
- Encrypted private notes
- Secure OneDrive location with access control

---

## Required secrets checklist

### 1. SQL admin password

**Name used by scripts:**

```text
SQL_ADMIN_PASSWORD
```

**Used for:**

- Creating or updating the Azure SQL Server through Bicep.
- Connecting to Azure SQL during skeleton restore.
- Running SQL schema scripts.
- Initializing empty database structure.

**Needed when running:**

```bash
./infra/scripts/restore-skeleton.sh
```

**Can it be regenerated?**

Not directly.

If lost, reset it from Azure Portal or Azure CLI.

**How to reset if lost:**

```bash
az sql server update   --resource-group rg-ssip-dev-frc-01   --name sqldb-ssip-dev-frc-01   --admin-password "<NEW_SQL_PASSWORD>"
```

**Store where:**

```text
Password manager / secure vault
```

**Checklist:**

```text
[ ] SQL admin username is known.
[ ] SQL admin password is stored securely.
[ ] Password is not committed to Git.
```

---

### 2. Admin plaintext key

**Name used conceptually:**

```text
SSIP admin key
```

**Used for:**

- Human admin login at `/admin`.
- Generating `ADMIN_SHARED_KEY_HASH`.

**Needed when:**

- Logging in as an admin.
- Rotating the admin key.
- Regenerating `ADMIN_SHARED_KEY_HASH`.

**Can it be regenerated?**

Yes.

A new admin key can be chosen and a new hash can be generated.

**How to generate hash from plaintext key:**

```bash
node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update(process.argv[1]).digest('hex'))" "YOUR_ADMIN_KEY"
```

**Store where:**

```text
Password manager / secure vault
```

**Checklist:**

```text
[ ] Plaintext admin key is stored securely.
[ ] Plaintext admin key is not committed to Git.
[ ] Plaintext admin key is not stored in frontend code.
```

---

### 3. Admin shared key hash

**App setting name:**

```text
ADMIN_SHARED_KEY_HASH
```

**Used for:**

- Backend admin key validation.
- Comparing `SHA-256(adminKey)` during `/internal/auth/login`.

**Needed when running:**

```bash
./infra/scripts/restore-skeleton.sh
./infra/scripts/rotate-admin-key.sh
```

**Can it be regenerated?**

Yes, if the plaintext admin key is known.

If the plaintext admin key is lost, choose a new admin key and generate a new hash.

**How to set it manually in Azure:**

```bash
az functionapp config appsettings set   --resource-group rg-ssip-dev-frc-01   --name func-ssip-dev-frc-01   --settings ADMIN_SHARED_KEY_HASH="<ADMIN_SHARED_KEY_HASH>"
```

**Store where:**

```text
Password manager / secure vault
```

**Checklist:**

```text
[ ] ADMIN_SHARED_KEY_HASH is stored securely or can be regenerated.
[ ] Hash value is not committed to Git.
[ ] Function App has ADMIN_SHARED_KEY_HASH configured.
```

---

### 4. Admin session signing secret

**App setting name:**

```text
ADMIN_SESSION_SIGNING_SECRET
```

**Used for:**

- Signing stateless admin session cookies if stateless sessions are enabled.
- Verifying that admin session cookies were issued by the backend.

**Needed when running:**

```bash
./infra/scripts/restore-skeleton.sh
```

**Can it be regenerated?**

Yes.

If regenerated, existing admin sessions become invalid and admins must log in again.

**How to generate a new value:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**How to set it manually in Azure:**

```bash
az functionapp config appsettings set   --resource-group rg-ssip-dev-frc-01   --name func-ssip-dev-frc-01   --settings ADMIN_SESSION_SIGNING_SECRET="<ADMIN_SESSION_SIGNING_SECRET>"
```

**Store where:**

```text
Password manager / secure vault
```

**Checklist:**

```text
[ ] ADMIN_SESSION_SIGNING_SECRET is stored securely.
[ ] If lost, a new value can be generated.
[ ] Existing sessions are expected to become invalid after regeneration.
```

---

### 5. SQL connection string

**Possible app setting name:**

```text
SQL_CONNECTION_STRING
```

**Used for:**

- Backend API database access.
- Reading and writing incidents, comments, reference data, and admin sessions.

**Needed by:**

```text
Azure Functions backend
```

**Can it be regenerated?**

Yes, if these are known:

- SQL server name
- SQL database name
- SQL admin username
- SQL admin password

**Connection string format:**

```text
Server=tcp:<SQL_SERVER_NAME>.database.windows.net,1433;
Initial Catalog=<SQL_DATABASE_NAME>;
Persist Security Info=False;
User ID=<SQL_ADMIN_USERNAME>;
Password=<SQL_ADMIN_PASSWORD>;
MultipleActiveResultSets=False;
Encrypt=True;
TrustServerCertificate=False;
Connection Timeout=30;
```

**Store where:**

Usually not stored directly if Bicep can generate it from parameters.

If stored, use:

```text
Azure Function App settings / Key Vault / password manager
```

**Checklist:**

```text
[ ] SQL server name is known.
[ ] SQL database name is known.
[ ] SQL username is known.
[ ] SQL password is stored securely.
[ ] SQL connection string is not committed to Git.
```

---

### 6. Azure Storage connection strings

**Possible app setting names:**

```text
AzureWebJobsStorage
DEPLOYMENT_STORAGE_CONNECTION_STRING
EVIDENCE_STORAGE_CONNECTION_STRING
```

**Used for:**

- Azure Functions runtime/deployment storage.
- Function App package deployment storage.
- Future evidence/image upload storage.

**Needed by:**

```text
Azure Functions
Azure Blob Storage
Evidence upload feature
```

**Can it be regenerated?**

Yes, if the storage account exists and access keys are available.

**How to get a storage key:**

```bash
az storage account keys list   --resource-group rg-ssip-dev-frc-01   --account-name "<STORAGE_ACCOUNT_NAME>"   --query "[0].value"   --output tsv
```

**Connection string format:**

```text
DefaultEndpointsProtocol=https;
AccountName=<STORAGE_ACCOUNT_NAME>;
AccountKey=<STORAGE_ACCOUNT_KEY>;
EndpointSuffix=core.windows.net
```

**Store where:**

```text
Azure Function App settings / Key Vault
```

**Checklist:**

```text
[ ] Deployment storage account name is known.
[ ] Evidence storage account name is known.
[ ] Storage keys can be regenerated or retrieved.
[ ] Storage connection strings are not committed to Git.
```

---

### 7. Frontend API base URL

**Frontend app setting name:**

```text
VITE_API_BASE_URL
```

**Used for:**

- Telling the frontend where the Azure Functions API is hosted.

**Example format:**

```text
https://func-ssip-dev-frc-01-xxxxx.francecentral-01.azurewebsites.net/api
```

**Can it be regenerated?**

Yes.

It comes from the Function App default hostname.

**How to retrieve Function App hostname:**

```bash
az functionapp show   --resource-group rg-ssip-dev-frc-01   --name func-ssip-dev-frc-01   --query "defaultHostName"   --output tsv
```

**Checklist:**

```text
[ ] Function App default hostname is known.
[ ] Frontend VITE_API_BASE_URL points to the correct /api URL.
[ ] Frontend was rebuilt after changing VITE_API_BASE_URL.
```

---

### 8. CORS allowed frontend origin

**Used for:**

- Allowing browser requests from the frontend Web App to the backend Function App.
- Allowing admin cookie sessions with `credentials: include`.

**Expected values:**

```text
https://web-ssip-dev-frc-01.azurewebsites.net
https://web-ssip-dev-frc-01-xxxxx.francecentral-01.azurewebsites.net
http://localhost:5173
```

**Can it be regenerated?**

Yes.

It comes from the Web App hostname.

**How to retrieve Web App hostname:**

```bash
az webapp show   --resource-group rg-ssip-dev-frc-01   --name web-ssip-dev-frc-01   --query "defaultHostName"   --output tsv
```

**Checklist:**

```text
[ ] Function App CORS includes deployed frontend origin.
[ ] supportCredentials is enabled.
[ ] No wildcard origin is used with credentials.
```

---

### 9. Azure subscription and resource names

**Used for:**

- Running restore scripts.
- Running deployment scripts.
- Recreating the correct Azure resource structure.

**Required values:**

```text
Azure subscription ID or subscription name
Resource group name
Azure region
Function App name
Web App name
SQL server name
SQL database name
Storage account names
Application Insights name
```

**Can it be regenerated?**

Names can be changed, but restore scripts expect known names unless parameters are updated.

**Current expected defaults:**

```text
Resource group: rg-ssip-dev-frc-01
Region: francecentral
Function App: func-ssip-dev-frc-01
Web App: web-ssip-dev-frc-01
SQL Server: sqldb-ssip-dev-frc-01
SQL Database: sqldb-ssip-dev-frc-01
```

**Checklist:**

```text
[ ] Azure subscription is known.
[ ] Resource group name is known.
[ ] Region is known.
[ ] Resource names match parameters.dev.json.
```

---

## Restore readiness checklist

Before restoring SSIP from a fresh clone, make sure these are available:

```text
[ ] SQL admin password
[ ] Plaintext admin key or ADMIN_SHARED_KEY_HASH
[ ] ADMIN_SESSION_SIGNING_SECRET, or permission to generate a new one
[ ] Azure subscription access
[ ] Resource group name
[ ] Azure region
[ ] Function App name
[ ] Web App name
[ ] SQL server name
[ ] SQL database name
[ ] Storage account names
[ ] Bicep parameters file with placeholders
[ ] SQL schema scripts
[ ] Backend deployment package or source code
[ ] Frontend deployment package or source code
```

---

## What can be safely regenerated

These can be recreated if lost:

```text
ADMIN_SHARED_KEY_HASH, if the plaintext admin key is known
ADMIN_SESSION_SIGNING_SECRET
SQL connection string, if SQL credentials are known
Storage connection strings, if storage keys are accessible
Frontend API base URL
CORS origins
```

---

## What must be preserved or reset manually

These should be stored safely:

```text
SQL admin password
Plaintext admin key
Azure subscription access
Any production-grade storage keys or connection strings
```

If lost, these must be reset:

```text
SQL admin password
Plaintext admin key
Storage account keys if compromised
```

---

## Recommended secure storage

Use one of:

```text
Password manager
Azure Key Vault
Encrypted recovery note
Secure company vault
```

Do not rely on:

```text
Git
local-only ignored files
browser storage
screenshots
chat history
```

---

## Important note

A fresh Git clone should restore the SSIP code, infrastructure definition, scripts, SQL schema, documentation, and deployment process.

A fresh Git clone should not contain the secrets required to operate the environment.

The correct recovery model is:

```text
Git repository + secure secret inventory = restorable SSIP environment
```

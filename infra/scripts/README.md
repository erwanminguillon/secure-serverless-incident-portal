package-infra.sh — Creates the Cloud Shell restore package from local Bicep, SQL, and script files.

restore-skeleton.sh — Restores the Azure resource skeleton, prompts for required secrets, deploys Bicep, and initializes the SQL schema.

deploy-api.sh — Builds and packages the Azure Functions backend into backend.zip.

deploy-frontend.sh — Builds and packages the React/Vite frontend into frontend.zip.

rotate-admin-key.sh — Rotates the admin key by updating ADMIN_SHARED_KEY_HASH in the Function App.

export-current-azure-state.sh — Optional diagnostic script for comparing live Azure resources with the Bicep skeleton.

configure-function-cors.sh — Legacy fallback for manually repairing Function App CORS if needed.
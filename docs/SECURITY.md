SSIP is composed of a static Vite frontend hosted on Azure App Service, a Node.js/TypeScript Azure Functions backend, Azure SQL Database for incident persistence, Azure Storage for deployment/runtime and likely evidence blobs, and Application Insights for observability.

Public users interact with the frontend to submit and track incidents. The frontend calls public Azure Function endpoints. Administrators use internal endpoints protected by a shared admin key. The backend validates the supplied key by hashing it and comparing it to the `ADMIN_SHARED_KEY_HASH` Azure Function App setting.

The project uses separate App Service plans for the frontend Web App and backend Function App. Azure SQL stores incident data. 

The resource group contains two user-assigned managed identities.

`oidc-msi-8731` targets the backend Function App `func-ssip-dev-frc-01` and has the `Website Contributor` role. It is used for backend Function App deployment or management operations.

`oidc-msi-9e84` targets the frontend Web App `web-ssip-dev-frc-01` and has the `Website Contributor` role. It is used for frontend Web App deployment or management operations.

These managed identities are NOT part of the application runtime data path. Runtime traffic flows from the frontend to the backend API, then to Azure SQL and supporting storage/monitoring services.


## Local vs Azure app settings

`src/api/local.settings.json` is used only when running the Azure Functions backend locally with `func start`.

The deployed Azure Function App does not read `local.settings.json`. It reads its own app settings from Azure.

Therefore, values such as `ADMIN_SHARED_KEY_HASH`, `SQL_CONNECTION_STRING`, and `ADMIN_SESSION_SIGNING_SECRET` can be different locally and in Azure.

This is expected.

Local backend:

src/api/local.settings.json

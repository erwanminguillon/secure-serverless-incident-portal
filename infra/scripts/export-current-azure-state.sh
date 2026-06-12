#!/usr/bin/env bash
set -euo pipefail

# NOT REQUIRED BUT HELPFUL IF SOMETHING IS NOT WORKING


RESOURCE_GROUP="${RESOURCE_GROUP:-rg-ssip-dev-frc-01}"
FUNCTION_APP_NAME="${FUNCTION_APP_NAME:-func-ssip-dev-frc-01}"
WEB_APP_NAME="${WEB_APP_NAME:-web-ssip-dev-frc-01}"
SQL_SERVER_NAME="${SQL_SERVER_NAME:-sqldb-ssip-dev-frc-01}"
SQL_DATABASE_NAME="${SQL_DATABASE_NAME:-sqldb-ssip-dev-frc-01}"

OUTPUT_DIR="${OUTPUT_DIR:-docs/azure-current-state}"

mkdir -p "${OUTPUT_DIR}"

echo "Exporting Azure current state to ${OUTPUT_DIR}"
echo "Resource group: ${RESOURCE_GROUP}"
echo

echo "1. Resource list"
az resource list \
  --resource-group "${RESOURCE_GROUP}" \
  --output json > "${OUTPUT_DIR}/resources.json"

az resource list \
  --resource-group "${RESOURCE_GROUP}" \
  --output table > "${OUTPUT_DIR}/resources.txt"

echo "2. Resource group metadata"
az group show \
  --name "${RESOURCE_GROUP}" \
  --output json > "${OUTPUT_DIR}/resource-group.json"

echo "3. Function App overview"
az functionapp show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --output json > "${OUTPUT_DIR}/function-app.json"

echo "4. Function App config"
az functionapp config show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --output json > "${OUTPUT_DIR}/function-app-config.json"

echo "5. Function App app setting names only"
az functionapp config appsettings list \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --query "[].name" \
  --output json > "${OUTPUT_DIR}/function-app-appsetting-names.json"

az functionapp config appsettings list \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --query "[].name" \
  --output table > "${OUTPUT_DIR}/function-app-appsetting-names.txt"

echo "6. Function App CORS"
az functionapp cors show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --output json > "${OUTPUT_DIR}/function-app-cors.json"

echo "7. Function list"
az functionapp function list \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --output json > "${OUTPUT_DIR}/function-list.json"

az functionapp function list \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --output table > "${OUTPUT_DIR}/function-list.txt"

echo "8. Frontend Web App overview"
az webapp show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${WEB_APP_NAME}" \
  --output json > "${OUTPUT_DIR}/web-app.json"

echo "9. Frontend Web App config"
az webapp config show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${WEB_APP_NAME}" \
  --output json > "${OUTPUT_DIR}/web-app-config.json"

echo "10. Frontend Web App app setting names only"
az webapp config appsettings list \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${WEB_APP_NAME}" \
  --query "[].name" \
  --output json > "${OUTPUT_DIR}/web-app-appsetting-names.json"

az webapp config appsettings list \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${WEB_APP_NAME}" \
  --query "[].name" \
  --output table > "${OUTPUT_DIR}/web-app-appsetting-names.txt"

echo "11. SQL server"
az sql server show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${SQL_SERVER_NAME}" \
  --output json > "${OUTPUT_DIR}/sql-server.json"

echo "12. SQL database"
az sql db show \
  --resource-group "${RESOURCE_GROUP}" \
  --server "${SQL_SERVER_NAME}" \
  --name "${SQL_DATABASE_NAME}" \
  --output json > "${OUTPUT_DIR}/sql-database.json"

echo "13. App Service plans"
az appservice plan list \
  --resource-group "${RESOURCE_GROUP}" \
  --output json > "${OUTPUT_DIR}/app-service-plans.json"

az appservice plan list \
  --resource-group "${RESOURCE_GROUP}" \
  --output table > "${OUTPUT_DIR}/app-service-plans.txt"

echo "14. Storage accounts"
az storage account list \
  --resource-group "${RESOURCE_GROUP}" \
  --output json > "${OUTPUT_DIR}/storage-accounts.json"

az storage account list \
  --resource-group "${RESOURCE_GROUP}" \
  --output table > "${OUTPUT_DIR}/storage-accounts.txt"

echo "15. Application Insights components"
az monitor app-insights component show \
  --resource-group "${RESOURCE_GROUP}" \
  --app "${FUNCTION_APP_NAME}" \
  --output json > "${OUTPUT_DIR}/app-insights-function-named.json" 2>/dev/null || true

az resource list \
  --resource-group "${RESOURCE_GROUP}" \
  --resource-type "microsoft.insights/components" \
  --output json > "${OUTPUT_DIR}/app-insights-components.json"

echo
echo "Export complete."
echo "Review files in: ${OUTPUT_DIR}"
echo
echo "Important: app setting VALUES were intentionally not exported."
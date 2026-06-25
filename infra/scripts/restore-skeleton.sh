#!/usr/bin/env bash
set -euo pipefail

# Restores the SSIP Azure skeleton.
#
# This restores:
# - Azure resource skeleton through Bicep
# - SQL database structure through infra/sql/*.sql
#
# This does not restore:
# - old incidents
# - old comments
# - old tracking tokens
# - old admin sessions
# - old uploaded evidence files
# - historical user data

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-ssip-dev-frc-01}"
LOCATION="${LOCATION:-francecentral}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-ssip-skeleton-$(date +%Y%m%d%H%M%S)}"

TEMPLATE_FILE="${TEMPLATE_FILE:-infra/bicep/main.bicep}"
PARAMETERS_FILE="${PARAMETERS_FILE:-infra/bicep/parameters.dev.json}"

SQL_SERVER_NAME="${SQL_SERVER_NAME:-sqldb-ssip-dev-frc-01}"
SQL_DATABASE_NAME="${SQL_DATABASE_NAME:-sqldb-ssip-dev-frc-01}"
SQL_ADMIN_USERNAME="${SQL_ADMIN_USERNAME:-ssipadmin}"
SQL_SERVER_FQDN="${SQL_SERVER_NAME}.database.windows.net"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SQL_DIR="${REPO_ROOT}/infra/sql"

echo "SSIP skeleton restore"
echo "Resource group: ${RESOURCE_GROUP}"
echo "Location: ${LOCATION}"
echo "Template: ${TEMPLATE_FILE}"
echo "Parameters: ${PARAMETERS_FILE}"
echo "SQL server: ${SQL_SERVER_FQDN}"
echo "SQL database: ${SQL_DATABASE_NAME}"
echo ""

if [[ ! -f "${TEMPLATE_FILE}" ]]; then
  echo "ERROR: Bicep template not found: ${TEMPLATE_FILE}"
  exit 1
fi

if [[ ! -f "${PARAMETERS_FILE}" ]]; then
  echo "ERROR: Bicep parameters file not found: ${PARAMETERS_FILE}"
  exit 1
fi

required_sql_files=(
  "001_schema.sql"
  "002_reference_data.sql"
  "003_indexes.sql"
  "004_admin_sessions.sql"
  "006_incident_evidence.sql"
)

for file in "${required_sql_files[@]}"; do
  if [[ ! -f "${SQL_DIR}/${file}" ]]; then
    echo "ERROR: missing SQL file: ${SQL_DIR}/${file}"
    exit 1
  fi
done

if [[ -z "${SQL_ADMIN_PASSWORD:-}" ]]; then
  read -rsp "SQL admin password: " SQL_ADMIN_PASSWORD
  echo
fi

if [[ -z "${ADMIN_SHARED_KEY_HASH:-}" ]]; then
  read -rsp "ADMIN_SHARED_KEY_HASH: " ADMIN_SHARED_KEY_HASH
  echo
fi

if [[ -z "${ADMIN_SESSION_SIGNING_SECRET:-}" ]]; then
  echo "ADMIN_SESSION_SIGNING_SECRET was not provided."
  echo "Generating a new random signing secret for this restored environment."

  ADMIN_SESSION_SIGNING_SECRET="$(
    node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  )"

  echo "Generated ADMIN_SESSION_SIGNING_SECRET."
fi

echo ""
echo "Step 1/6: Validating Bicep..."
az bicep build --file "${TEMPLATE_FILE}" >/dev/null
rm -f infra/bicep/main.json
echo "Bicep validation passed."

echo ""
echo "Step 2/6: Creating resource group if needed..."
az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --only-show-errors 1>/dev/null

echo "Resource group ready."

echo ""
echo "Step 3/6: Running what-if preview..."
az deployment group what-if \
  --resource-group "${RESOURCE_GROUP}" \
  --template-file "${TEMPLATE_FILE}" \
  --parameters "@${PARAMETERS_FILE}" \
  --parameters \
    sqlAdminPassword="${SQL_ADMIN_PASSWORD}" \
    adminSharedKeyHash="${ADMIN_SHARED_KEY_HASH}" \
    adminSessionSigningSecret="${ADMIN_SESSION_SIGNING_SECRET}"

echo ""
read -rp "Continue with deployment? Type 'yes' to proceed: " CONFIRM_DEPLOY

if [[ "${CONFIRM_DEPLOY}" != "yes" ]]; then
  echo "Deployment cancelled."
  exit 0
fi

echo ""
echo "Step 4/6: Deploying Azure skeleton..."
az deployment group create \
  --name "${DEPLOYMENT_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --template-file "${TEMPLATE_FILE}" \
  --parameters "@${PARAMETERS_FILE}" \
  --parameters \
    sqlAdminPassword="${SQL_ADMIN_PASSWORD}" \
    adminSharedKeyHash="${ADMIN_SHARED_KEY_HASH}" \
    adminSessionSigningSecret="${ADMIN_SESSION_SIGNING_SECRET}" \
  --only-show-errors

echo "Azure skeleton deployed."

echo ""
echo "Step 5/6: Initializing SQL schema..."

if ! command -v sqlcmd >/dev/null 2>&1; then
  echo "ERROR: sqlcmd is not installed or not available in PATH."
  echo ""
  echo "Azure Cloud Shell usually includes SQL tooling, but if sqlcmd is unavailable,"
  echo "run the SQL files manually from Azure Data Studio or install sqlcmd."
  exit 1
fi

CURRENT_IP="$(curl -s https://api.ipify.org || true)"
RULE_NAME=""

if [[ -n "${CURRENT_IP}" ]]; then
  RULE_NAME="ssip-restore-sql-$(date +%Y%m%d%H%M%S)"

  echo "Adding temporary SQL firewall rule for ${CURRENT_IP}..."

  az sql server firewall-rule create \
    --resource-group "${RESOURCE_GROUP}" \
    --server "${SQL_SERVER_NAME}" \
    --name "${RULE_NAME}" \
    --start-ip-address "${CURRENT_IP}" \
    --end-ip-address "${CURRENT_IP}" \
    --only-show-errors 1>/dev/null || true
else
  echo "Could not detect current public IP. Continuing without temporary SQL firewall rule."
fi

cleanup() {
  if [[ -n "${RULE_NAME:-}" ]]; then
    echo "Removing temporary SQL firewall rule: ${RULE_NAME}"

    az sql server firewall-rule delete \
      --resource-group "${RESOURCE_GROUP}" \
      --server "${SQL_SERVER_NAME}" \
      --name "${RULE_NAME}" \
      --only-show-errors 1>/dev/null || true
  fi
}

trap cleanup EXIT

run_sql_file() {
  local file="$1"

  echo ""
  echo "Running ${file}..."

  sqlcmd \
    -S "${SQL_SERVER_FQDN}" \
    -d "${SQL_DATABASE_NAME}" \
    -U "${SQL_ADMIN_USERNAME}" \
    -P "${SQL_ADMIN_PASSWORD}" \
    -N \
    -i "${SQL_DIR}/${file}"

  echo "${file}: OK"
}

run_sql_file "001_schema.sql"
run_sql_file "002_reference_data.sql"
run_sql_file "003_indexes.sql"
run_sql_file "004_admin_sessions.sql"
run_sql_file "006_incident_evidence.sql"

echo ""
echo "SQL schema initialized."

echo ""
echo "Step 6/6: Restore completed."
echo ""
echo "SSIP skeleton restore completed successfully."
echo ""
echo "Restored SQL structure:"
echo ""
echo "  001_schema.sql"
echo "  002_reference_data.sql"
echo "  003_indexes.sql"
echo "  004_admin_sessions.sql"
echo "  006_incident_evidence.sql"
echo ""
echo "Not run automatically:"
echo ""
echo "  005_revoke_admin_sessions.sql"
echo ""
echo "Next steps:"
echo ""
echo "1. Deploy backend:"
echo ""
echo "   az functionapp deployment source config-zip \\"
echo "     --resource-group ${RESOURCE_GROUP} \\"
echo "     --name func-ssip-dev-frc-01 \\"
echo "     --src ./backend.zip"
echo ""
echo "2. Deploy frontend:"
echo ""
echo "   az webapp deploy \\"
echo "     --resource-group ${RESOURCE_GROUP} \\"
echo "     --name web-ssip-dev-frc-01 \\"
echo "     --src-path ./frontend.zip \\"
echo "     --type zip"
echo ""
echo "   az webapp restart \\"
echo "     --resource-group ${RESOURCE_GROUP} \\"
echo "     --name web-ssip-dev-frc-01"
echo ""
echo "3. Test:"
echo ""
echo "   /"
echo "   /submit"
echo "   /track"
echo "   /admin"
echo "   /admin/incidents"
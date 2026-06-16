#!/usr/bin/env bash
set -euo pipefail

# Creates local development configuration files for SSIP.
#
# This script does not commit secrets.
# It writes:
# - src/api/local.settings.json
# - src/frontend/.env.development

API_SETTINGS_FILE="src/api/local.settings.json"
FRONTEND_ENV_FILE="src/frontend/.env.development"

echo "SSIP local development setup"
echo ""

if [[ -f "${API_SETTINGS_FILE}" ]]; then
  echo "${API_SETTINGS_FILE} already exists."
  read -rp "Overwrite it? Type 'yes' to overwrite: " OVERWRITE_API

  if [[ "${OVERWRITE_API}" != "yes" ]]; then
    echo "Keeping existing ${API_SETTINGS_FILE}."
    SKIP_API="true"
  else
    SKIP_API="false"
  fi
else
  SKIP_API="false"
fi

if [[ -f "${FRONTEND_ENV_FILE}" ]]; then
  echo "${FRONTEND_ENV_FILE} already exists."
  read -rp "Overwrite it? Type 'yes' to overwrite: " OVERWRITE_FRONTEND

  if [[ "${OVERWRITE_FRONTEND}" != "yes" ]]; then
    echo "Keeping existing ${FRONTEND_ENV_FILE}."
    SKIP_FRONTEND="true"
  else
    SKIP_FRONTEND="false"
  fi
else
  SKIP_FRONTEND="false"
fi

echo ""

if [[ "${SKIP_API}" != "true" ]]; then
  echo "Backend configuration"
  echo ""

  echo "Choose SQL configuration mode:"
  echo "1. Paste full SQL_CONNECTION_STRING"
  echo "2. Build SQL_CONNECTION_STRING from parts"
  read -rp "Choice [1/2]: " SQL_MODE

  if [[ "${SQL_MODE}" == "2" ]]; then
    read -rp "SQL server name [sqldb-ssip-dev-frc-01]: " SQL_SERVER_NAME
    SQL_SERVER_NAME="${SQL_SERVER_NAME:-sqldb-ssip-dev-frc-01}"

    read -rp "SQL database name [sqldb-ssip-dev-frc-01]: " SQL_DATABASE_NAME
    SQL_DATABASE_NAME="${SQL_DATABASE_NAME:-sqldb-ssip-dev-frc-01}"

    read -rp "SQL admin username " SQL_ADMIN_USERNAME
    SQL_ADMIN_USERNAME="${SQL_ADMIN_USERNAME:-ssipadmin}"

    read -rsp "SQL admin password: " SQL_ADMIN_PASSWORD
    echo ""

    SQL_CONNECTION_STRING="Server=tcp:${SQL_SERVER_NAME}.database.windows.net,1433;Initial Catalog=${SQL_DATABASE_NAME};Persist Security Info=False;User ID=${SQL_ADMIN_USERNAME};Password=${SQL_ADMIN_PASSWORD};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  else
    read -rsp "SQL_CONNECTION_STRING: " SQL_CONNECTION_STRING
    echo ""
  fi

  echo ""
  echo "Admin key configuration"
  echo ""

  echo "Choose admin key mode:"
  echo "1. Paste existing ADMIN_SHARED_KEY_HASH"
  echo "2. Enter plaintext admin key and generate hash"
  read -rp "Choice [1/2]: " ADMIN_MODE

  if [[ "${ADMIN_MODE}" == "2" ]]; then
    read -rsp "Plaintext admin key: " ADMIN_KEY
    echo ""

    ADMIN_SHARED_KEY_HASH="$(
      node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update(process.argv[1]).digest('hex'))" "${ADMIN_KEY}"
    )"

    echo "Generated ADMIN_SHARED_KEY_HASH."
  else
    read -rsp "ADMIN_SHARED_KEY_HASH: " ADMIN_SHARED_KEY_HASH
    echo ""
  fi

  echo ""
  echo "Session signing secret"
  echo ""

  read -rp "Generate new ADMIN_SESSION_SIGNING_SECRET? [Y/n]: " GENERATE_SESSION_SECRET
  GENERATE_SESSION_SECRET="${GENERATE_SESSION_SECRET:-Y}"

  if [[ "${GENERATE_SESSION_SECRET}" == "n" || "${GENERATE_SESSION_SECRET}" == "N" ]]; then
    read -rsp "ADMIN_SESSION_SIGNING_SECRET: " ADMIN_SESSION_SIGNING_SECRET
    echo ""
  else
    ADMIN_SESSION_SIGNING_SECRET="$(
      node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
    )"

    echo "Generated ADMIN_SESSION_SIGNING_SECRET."
  fi

  cat > "${API_SETTINGS_FILE}" <<EOF
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "SQL_CONNECTION_STRING": "${SQL_CONNECTION_STRING}",
    "ADMIN_SHARED_KEY_HASH": "${ADMIN_SHARED_KEY_HASH}",
    "ADMIN_SESSION_SIGNING_SECRET": "${ADMIN_SESSION_SIGNING_SECRET}"
  }
}
EOF

  echo ""
  echo "Created ${API_SETTINGS_FILE}"
fi

if [[ "${SKIP_FRONTEND}" != "true" ]]; then
  echo ""
  echo "Frontend configuration"
  echo ""

  read -rp "Frontend API base URL [http://localhost:7071/api]: " VITE_API_BASE_URL
  VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:7071/api}"

  cat > "${FRONTEND_ENV_FILE}" <<SQL_SERVER_NAME>.database.windows.net,1433;Initial Catalog=<SQL_DATABASE_NAME>;Persist Security Info=False;User ID=<SQL_ADMIN_USERNAME>;Password=<SQL_ADMIN_PASSWORD>;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;",
    "ADMIN_SHARED_KEY_HASH": "<ADMIN_SHARED_KEY_HASH>",
    "ADMIN_SESSION_SIGNING_SECRET": "<ADMIN_SESSION_SIGNING_SECRET>"
  }
}
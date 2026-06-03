#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-ssip-dev-frc-01}"
FUNCTION_APP_NAME="${FUNCTION_APP_NAME:-func-ssip-dev-frc-01}"

echo "Rotating SSIP admin key for Function App: ${FUNCTION_APP_NAME}"
echo "Resource group: ${RESOURCE_GROUP}"
echo

read -rsp "Enter new admin key: " ADMIN_KEY_ONE
echo
read -rsp "Confirm new admin key: " ADMIN_KEY_TWO
echo

if [[ -z "${ADMIN_KEY_ONE}" ]]; then
  echo "Admin key cannot be empty."
  exit 1
fi

if [[ "${ADMIN_KEY_ONE}" != "${ADMIN_KEY_TWO}" ]]; then
  echo "Admin keys do not match."
  exit 1
fi

ADMIN_KEY_HASH="$(node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update(process.argv[1]).digest('hex'))" "${ADMIN_KEY_ONE}")"

echo
echo "Updating ADMIN_SHARED_KEY_HASH in Azure Function App..."

az functionapp config appsettings set \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --settings ADMIN_SHARED_KEY_HASH="${ADMIN_KEY_HASH}" \
  --only-show-errors 1>/dev/null

echo "Restarting Function App..."

az functionapp restart \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --only-show-errors

echo
echo "Admin key rotated successfully."
echo "Existing admin sessions may remain valid until they expire unless revoked in SQL."
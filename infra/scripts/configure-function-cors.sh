#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-ssip-dev-frc-01}"
FUNCTION_APP_NAME="${FUNCTION_APP_NAME:-func-ssip-dev-frc-01}"

AZURE_FRONTEND_ORIGIN="${AZURE_FRONTEND_ORIGIN:-https://web-ssip-dev-frc-01-ggf2befba7bzgtgq.francecentral-01.azurewebsites.net}"
LOCAL_FRONTEND_ORIGIN="${LOCAL_FRONTEND_ORIGIN:-http://localhost:5173}"

echo "Configuring CORS for Function App: ${FUNCTION_APP_NAME}"
echo "Resource group: ${RESOURCE_GROUP}"

echo "Removing wildcard origin if present..."
az functionapp cors remove \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --allowed-origins "*" \
  --only-show-errors || true

echo "Adding Azure frontend origin..."
az functionapp cors add \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --allowed-origins "${AZURE_FRONTEND_ORIGIN}" \
  --only-show-errors || true

echo "Adding local development origin..."
az functionapp cors add \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --allowed-origins "${LOCAL_FRONTEND_ORIGIN}" \
  --only-show-errors || true

echo "Enabling CORS credentials support..."
az functionapp cors credentials \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --enable true \
  --only-show-errors

echo "Current CORS configuration:"
az functionapp cors show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${FUNCTION_APP_NAME}" \
  --output json
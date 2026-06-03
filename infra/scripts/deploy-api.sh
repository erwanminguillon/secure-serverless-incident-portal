#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="rg-ssip-dev-frc-01"
FUNCTION_APP="func-ssip-dev-frc-01"
ZIP_NAME="backend.zip"
DEPLOY_DIR="deploy_pkg"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
API_DIR="${REPO_ROOT}/src/api"

echo "Repo root: ${REPO_ROOT}"
echo "API directory: ${API_DIR}"

if [ ! -d "${API_DIR}" ]; then
  echo "ERROR: API directory not found: ${API_DIR}"
  exit 1
fi

echo "Building API..."
cd "${API_DIR}"

npm run build

echo "Preparing clean deployment package..."
rm -rf "${DEPLOY_DIR}" "${ZIP_NAME}"
mkdir "${DEPLOY_DIR}"

cp -r dist "${DEPLOY_DIR}/"
cp package.json "${DEPLOY_DIR}/"
cp host.json "${DEPLOY_DIR}/"

echo "Installing production dependencies inside deployment package..."
cd "${DEPLOY_DIR}"
npm install --omit=dev
cd ..

echo "Creating ZIP (for linux)..."
python - <<'PY'
import os
import zipfile

source = "deploy_pkg"
out = "backend.zip"

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(source):
        for file in files:
            full = os.path.join(root, file)
            arc = os.path.relpath(full, source).replace(os.sep, "/")
            z.write(full, arc)

print(f"Created {out}")
PY

echo "Validating ZIP contents..."
python - <<'PY'
import zipfile
import sys

required = [
    "host.json",
    "package.json",
    "dist/src/index.js",
    "node_modules/@azure/functions/package.json",
    "node_modules/mssql/package.json",
]

with zipfile.ZipFile("backend.zip") as z:
    names = set(z.namelist())

missing = []

for r in required:
    if r not in names:
        missing.append(r)
        print(f"{r}: MISSING")
    else:
        print(f"{r}: OK")

if missing:
    print("Deployment package validation failed.")
    sys.exit(1)

print("Deployment package validation passed.")
PY

echo ""
echo "API package created successfully:"
echo "${API_DIR}/${ZIP_NAME}"
echo ""
echo "Upload backend.zip to Azure Cloud Shell, then run:"
echo ""
echo "az functionapp deployment source config-zip \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --name ${FUNCTION_APP} \\"
echo "  --src ./backend.zip"
echo ""
echo "Then verify:"
echo ""
echo "az functionapp function list \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --name ${FUNCTION_APP} \\"
echo "  --output table"

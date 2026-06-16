#!/usr/bin/env bash

# FALLBACK SCRIPT, NOW OBSOLETE
set -euo pipefail

RESOURCE_GROUP="rg-ssip-dev-frc-01"
WEB_APP="web-ssip-dev-frc-01"
ZIP_NAME="frontend.zip"
EXPECTED_API_HOST="func-ssip-dev-frc-01"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/src/frontend"

echo "Repo root: ${REPO_ROOT}"
echo "Frontend directory: ${FRONTEND_DIR}"

if [ ! -d "${FRONTEND_DIR}" ]; then
  echo "ERROR: Frontend directory not found: ${FRONTEND_DIR}"
  exit 1
fi

echo "Building frontend for Azure deployment..."
cd "${FRONTEND_DIR}"

npm install
npm run build -- --mode deployment

echo "Verifying API URL is baked into the built assets..."
if ! grep -R "${EXPECTED_API_HOST}" dist >/dev/null; then
  echo "ERROR: Expected Function App hostname was not found in dist."
  echo "Check src/frontend/.env.deployment and VITE_API_BASE_URL."
  exit 1
fi

echo "Creating frontend ZIP from dist contents..."
rm -f "${ZIP_NAME}"

python - <<'PY'
import os
import zipfile

with zipfile.ZipFile("frontend.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk("dist"):
        for file in files:
            full = os.path.join(root, file)
            arc = os.path.relpath(full, "dist").replace(os.sep, "/")
            z.write(full, arc)

print("Created frontend.zip")
PY

echo ""
echo "Frontend package created successfully:"
echo "${FRONTEND_DIR}/${ZIP_NAME}"
echo ""
echo "Upload frontend.zip to Azure Cloud Shell, then run:"
echo ""
echo "az webapp deploy \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --name ${WEB_APP} \\"
echo "  --src-path ./frontend.zip \\"
echo "  --type zip"
echo ""
echo "If needed, ensure startup command is:"
echo ""
echo "az webapp config set \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --name ${WEB_APP} \\"
echo "  --startup-file \"pm2 serve /home/site/wwwroot --spa --no-daemon\""
echo "Validating frontend.zip contents..."

if unzip -l frontend.zip | grep -q "src/main.tsx"; then
  echo "ERROR: frontend.zip contains src/main.tsx. This means source files were zipped instead of dist output."
  exit 1
fi

if unzip -l frontend.zip | grep -q "package.json"; then
  echo "ERROR: frontend.zip contains package.json. This likely means the project root was zipped instead of dist."
  exit 1
fi

if ! unzip -l frontend.zip | grep -q "index.html"; then
  echo "ERROR: frontend.zip does not contain index.html."
  exit 1
fi

if ! unzip -l frontend.zip | grep -q "assets/.*\\.js"; then
  echo "ERROR: frontend.zip does not contain built JS assets under assets/."
  exit 1
fi

if unzip -p frontend.zip index.html | grep -q "/src/main.tsx"; then
  echo "ERROR: index.html references /src/main.tsx. This is a development index.html, not a production build."
  exit 1
fi

if ! unzip -p frontend.zip index.html | grep -q "/assets/"; then
  echo "ERROR: index.html does not reference /assets/. Production Vite build is missing."
  exit 1
fi

echo "frontend.zip validation passed."
cat > scripts/deploy-frontend.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="rg-ssip-dev-frc-01"
WEB_APP="web-ssip-dev-frc-01"
ZIP_NAME="frontend.zip"
EXPECTED_API_HOST="func-ssip-dev-frc-01"

echo "Building frontend for Azure deployment..."
cd src/frontend

npm install
npm run build -- --mode deployment

echo "Verifying API URL is baked into the built assets..."
if ! grep -R "$EXPECTED_API_HOST" dist >/dev/null; then
  echo "ERROR: Expected Function App hostname was not found in dist."
  echo "Check .env.deployment and VITE_API_BASE_URL."
  exit 1
fi

echo "Creating frontend ZIP from dist contents..."
rm -f "$ZIP_NAME"

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
echo "Upload src/frontend/${ZIP_NAME} to Azure Cloud Shell, then run:"
echo ""
echo "az webapp deploy \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --name ${WEB_APP} \\"
echo "  --src-path ./${ZIP_NAME} \\"
echo "  --type zip"
echo ""
echo "If needed, ensure startup command is:"
echo ""
echo "az webapp config set \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --name ${WEB_APP} \\"
echo "  --startup-file \"pm2 serve /home/site/wwwroot --spa --no-daemon\""
EOF

chmod +x scripts/deploy-frontend.sh
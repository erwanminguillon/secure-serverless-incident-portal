cat > scripts/deploy-api.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="rg-ssip-dev-frc-01"
FUNCTION_APP="func-ssip-dev-frc-01"
ZIP_NAME="built.zip"
DEPLOY_DIR="deploy_pkg"

echo "Building API..."
cd src/api

npm run build

echo "Preparing clean deployment package..."
rm -rf "$DEPLOY_DIR" "$ZIP_NAME"
mkdir "$DEPLOY_DIR"

cp -r dist "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp host.json "$DEPLOY_DIR/"

echo "Installing production dependencies inside deployment package..."
cd "$DEPLOY_DIR"
npm install --omit=dev
cd ..

echo "Creating ZIP with Linux-compatible paths..."
python - <<'PY'
import os
import zipfile

source = "deploy_pkg"
out = "built.zip"

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

with zipfile.ZipFile("built.zip") as z:
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
PY

echo ""
echo "Upload src/api/${ZIP_NAME} to Azure Cloud Shell, then run:"
echo ""
echo "az functionapp deployment source config-zip \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --name ${FUNCTION_APP} \\"
echo "  --src ./${ZIP_NAME}"
echo ""
echo "Then verify:"
echo ""
echo "az functionapp function list \\"
echo "  --resource-group ${RESOURCE_GROUP} \\"
echo "  --name ${FUNCTION_APP} \\"
echo "  --output table"
EOF

chmod +x scripts/deploy-api.sh
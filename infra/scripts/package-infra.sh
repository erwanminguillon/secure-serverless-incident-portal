#!/usr/bin/env bash
set -euo pipefail

# Packages SSIP infrastructure files for upload to Azure Cloud Shell.
#
# This script does NOT deploy anything.
# It creates one ZIP file containing infra/bicep, infra/scripts, and infra/sql.
#
# Local Bicep validation can be skipped when Azure CLI has corporate proxy /
# certificate issues:
#
# SKIP_BICEP_VALIDATION=true ./infra/scripts/package-infra.sh
#
# The real validation should then be done in Azure Cloud Shell.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

OUTPUT_ZIP="${OUTPUT_ZIP:-${REPO_ROOT}/infra/ssip-infra.zip}"
STAGING_DIR="${REPO_ROOT}/infra/.infra_pkg"

cd "${REPO_ROOT}"

echo "Packaging SSIP infrastructure bundle"
echo "Repo root: ${REPO_ROOT}"
echo "Output ZIP: ${OUTPUT_ZIP}"
echo ""

required_paths=(
  "infra/bicep/main.bicep"
  "infra/bicep/parameters.dev.json"
  "infra/bicep/modules/storage.bicep"
  "infra/bicep/modules/app-insights.bicep"
  "infra/bicep/modules/sql.bicep"
  "infra/bicep/modules/function-app.bicep"
  "infra/bicep/modules/web-app.bicep"
  "infra/scripts/restore-skeleton.sh"
  "infra/sql/001_schema.sql"
  "infra/sql/002_reference_data.sql"
  "infra/sql/004_admin_sessions.sql"
)

echo "Checking required files..."

for path in "${required_paths[@]}"; do
  if [ ! -e "${path}" ]; then
    echo "ERROR: required path is missing: ${path}"
    exit 1
  fi
done

echo "Required files found."
echo ""

echo "Checking parameters.dev.json uses placeholder secrets..."

if grep -q "REPLACE_AT_DEPLOY_TIME" "infra/bicep/parameters.dev.json"; then
  echo "parameters.dev.json uses placeholder values. Good."
else
  echo "WARNING: parameters.dev.json does not appear to contain placeholder values."
  echo "Make sure no real secrets are committed."
fi

echo ""

if [ "${SKIP_BICEP_VALIDATION:-false}" = "true" ]; then
  echo "Skipping local Bicep validation because SKIP_BICEP_VALIDATION=true."
  echo "You must validate in Azure Cloud Shell after upload."
elif command -v az >/dev/null 2>&1; then
  echo "Validating Bicep syntax locally..."

  if az bicep build --file infra/bicep/main.bicep >/dev/null; then
    rm -f infra/bicep/main.json
    echo "Local Bicep validation passed."
  else
    echo "WARNING: Local Bicep validation failed."
    echo "This may be caused by Azure CLI certificate/proxy issues."
    echo "Continuing package creation."
    echo "You must validate in Azure Cloud Shell after upload."
    rm -f infra/bicep/main.json
  fi
else
  echo "WARNING: Azure CLI not found. Skipping local Bicep validation."
  echo "You must validate in Azure Cloud Shell after upload."
fi

echo ""

echo "Preparing clean infrastructure package..."
rm -rf "${STAGING_DIR}" "${OUTPUT_ZIP}"
mkdir -p "${STAGING_DIR}/infra"

cp -R infra/bicep "${STAGING_DIR}/infra/"
cp -R infra/scripts "${STAGING_DIR}/infra/"

if [ -d "infra/sql" ]; then
  cp -R infra/sql "${STAGING_DIR}/infra/"
fi

echo "Removing local, generated, and sensitive files from package..."

find "${STAGING_DIR}" -name "*.local.json" -delete
find "${STAGING_DIR}" -name "main.json" -delete
find "${STAGING_DIR}" -name ".DS_Store" -delete
find "${STAGING_DIR}" -type d -name "node_modules" -prune -exec rm -rf {} +
find "${STAGING_DIR}" -type d -name ".git" -prune -exec rm -rf {} +

echo "Creating ZIP..."

export STAGING_DIR
export OUTPUT_ZIP

python - <<'PY'
import os
import zipfile
from pathlib import Path

source = Path(os.environ["STAGING_DIR"])
out = Path(os.environ["OUTPUT_ZIP"])

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(source):
        dirs[:] = [
            d for d in dirs
            if d not in {".git", "node_modules", "__pycache__"}
        ]

        for file in files:
            full = Path(root) / file
            arc = full.relative_to(source).as_posix()
            z.write(full, arc)

print(f"Created {out}")
PY

echo ""
echo "Validating ZIP contents..."

python - <<'PY'
import os
import sys
import zipfile
from pathlib import Path

zip_path = Path(os.environ["OUTPUT_ZIP"])

required = [
    "infra/bicep/main.bicep",
    "infra/bicep/parameters.dev.json",
    "infra/bicep/modules/storage.bicep",
    "infra/bicep/modules/app-insights.bicep",
    "infra/bicep/modules/sql.bicep",
    "infra/bicep/modules/function-app.bicep",
    "infra/bicep/modules/web-app.bicep",
    "infra/scripts/restore-skeleton.sh",
    "infra/sql/001_schema.sql",
    "infra/sql/002_reference_data.sql",
    "infra/sql/004_admin_sessions.sql",
]

with zipfile.ZipFile(zip_path) as z:
    names = set(z.namelist())

missing = []

for item in required:
    if item not in names:
        missing.append(item)
        print(f"{item}: MISSING")
    else:
        print(f"{item}: OK")

for name in names:
    if name.endswith(".local.json"):
        print(f"ERROR: ZIP contains local secret parameter file: {name}")
        sys.exit(1)

    if name == "infra/bicep/main.json":
        print(f"ERROR: ZIP contains generated Bicep JSON: {name}")
        sys.exit(1)

if missing:
    print("Infrastructure package validation failed.")
    sys.exit(1)

print("Infrastructure package validation passed.")
PY

rm -rf "${STAGING_DIR}"

echo ""
echo "Infrastructure ZIP created successfully:"
echo "${OUTPUT_ZIP}"
echo ""
echo "Upload this file to Azure Cloud Shell:"
echo ""
echo "  infra/ssip-infra.zip"
echo ""
echo "Then run in Azure Cloud Shell:"
echo ""
echo "  unzip -o ssip-infra.zip"
echo "  chmod +x infra/scripts/restore-skeleton.sh"
echo "  az bicep build --file infra/bicep/main.bicep && echo \"Bicep build passed.\""
echo ""
echo "If Bicep build passes, run a safe what-if dry run:"
echo ""
echo "  az deployment group what-if \\"
echo "    --resource-group rg-ssip-dev-frc-01 \\"
echo "    --template-file infra/bicep/main.bicep \\"
echo "    --parameters @infra/bicep/parameters.dev.json \\"
echo "    --parameters \\"
echo "      sqlAdminPassword=\"<SQL_PASSWORD>\" \\"
echo "      adminSharedKeyHash=\"<ADMIN_HASH>\" \\"
echo "      adminSessionSigningSecret=\"<SESSION_SECRET>\""
echo ""
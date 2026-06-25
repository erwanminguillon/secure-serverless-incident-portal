#!/usr/bin/env bash
set -euo pipefail

# Packages SSIP infrastructure files for upload to Azure Cloud Shell.
#
# This script does NOT deploy anything.
# It creates a restore package containing:
# - infra/bicep
# - infra/sql
# - infra/scripts
# - infra/RESTORE.md if present
# - infra/SECRETS_CHECKLIST.md if present
#
# Local Bicep validation can be skipped when Azure CLI has corporate proxy /
# certificate issues:
#
#   SKIP_BICEP_VALIDATION=true ./infra/scripts/package-infra.sh
#
# The real validation should then be done in Azure Cloud Shell.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

OUTPUT_ZIP="${OUTPUT_ZIP:-${REPO_ROOT}/infra/ssip-infra.zip}"
OUTPUT_RESTORE_SCRIPT="${OUTPUT_RESTORE_SCRIPT:-${REPO_ROOT}/infra/ssip-restore.sh}"
STAGING_DIR="${REPO_ROOT}/infra/.infra_pkg"

cd "${REPO_ROOT}"

echo "Packaging SSIP infrastructure bundle"
echo "Repo root: ${REPO_ROOT}"
echo "Output ZIP: ${OUTPUT_ZIP}"
echo "Output restore launcher: ${OUTPUT_RESTORE_SCRIPT}"
echo ""

required_paths=(
  "infra/bicep/main.bicep"
  "infra/bicep/parameters.dev.json"
  "infra/bicep/modules/storage.bicep"
  "infra/bicep/modules/app-insights.bicep"
  "infra/bicep/modules/sql.bicep"
  "infra/bicep/modules/function-app.bicep"
  "infra/bicep/modules/web-app.bicep"

  "infra/sql/001_schema.sql"
  "infra/sql/002_reference_data.sql"
  "infra/sql/003_indexes.sql"
  "infra/sql/004_admin_sessions.sql"
  "infra/sql/005_revoke_admin_sessions.sql"
  "infra/sql/006_incident_evidence.sql"

  "infra/scripts/restore-skeleton.sh"
  "infra/scripts/package-infra.sh"
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
rm -rf "${STAGING_DIR}" "${OUTPUT_ZIP}" "${OUTPUT_RESTORE_SCRIPT}"
mkdir -p "${STAGING_DIR}/infra"

cp -R infra/bicep "${STAGING_DIR}/infra/"
cp -R infra/sql "${STAGING_DIR}/infra/"
cp -R infra/scripts "${STAGING_DIR}/infra/"

if [ -f "infra/RESTORE.md" ]; then
  cp infra/RESTORE.md "${STAGING_DIR}/infra/"
fi

if [ -f "infra/SECRETS_CHECKLIST.md" ]; then
  cp infra/SECRETS_CHECKLIST.md "${STAGING_DIR}/infra/"
fi

echo "Removing local, generated, and sensitive files from package..."

find "${STAGING_DIR}" -name "*.local.json" -delete
find "${STAGING_DIR}" -name "main.json" -delete
find "${STAGING_DIR}" -name ".DS_Store" -delete
find "${STAGING_DIR}" -name "*.zip" -delete
find "${STAGING_DIR}" -name "ssip-restore.sh" -delete
find "${STAGING_DIR}" -type d -name "node_modules" -prune -exec rm -rf {} +
find "${STAGING_DIR}" -type d -name ".git" -prune -exec rm -rf {} +
find "${STAGING_DIR}" -type d -name "deploy_pkg" -prune -exec rm -rf {} +

echo "Creating ZIP with Python..."

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
            if d not in {".git", "node_modules", "__pycache__", "deploy_pkg"}
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

    "infra/sql/001_schema.sql",
    "infra/sql/002_reference_data.sql",
    "infra/sql/003_indexes.sql",
    "infra/sql/004_admin_sessions.sql",
    "infra/sql/005_revoke_admin_sessions.sql",
    "infra/sql/006_incident_evidence.sql",

    "infra/scripts/package-infra.sh",
    "infra/scripts/restore-skeleton.sh",
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

    if name.endswith(".zip"):
        print(f"ERROR: ZIP contains nested ZIP file: {name}")
        sys.exit(1)

    if "/node_modules/" in name or name.startswith("node_modules/"):
        print(f"ERROR: ZIP contains node_modules: {name}")
        sys.exit(1)

    if "/deploy_pkg/" in name or name.startswith("deploy_pkg/"):
        print(f"ERROR: ZIP contains deploy_pkg: {name}")
        sys.exit(1)

if missing:
    print("Infrastructure package validation failed.")
    sys.exit(1)

print("Infrastructure package validation passed.")
PY

echo ""
echo "Creating self-extracting restore script..."

export OUTPUT_RESTORE_SCRIPT

python - <<'PY'
import base64
import os
import textwrap
from pathlib import Path

zip_path = Path(os.environ["OUTPUT_ZIP"])
restore_script_path = Path(os.environ["OUTPUT_RESTORE_SCRIPT"])

payload = base64.b64encode(zip_path.read_bytes()).decode("ascii")
wrapped_payload = "\n".join(textwrap.wrap(payload, 76))

script = f'''#!/usr/bin/env bash
set -euo pipefail

# Self-extracting SSIP skeleton restore launcher.
#
# This script contains ssip-infra.zip embedded as base64.
# Upload this single file to Azure Cloud Shell and run:
#
#   chmod +x ssip-restore.sh
#   ./ssip-restore.sh
#
# It extracts the infrastructure bundle and runs:
#
#   infra/scripts/restore-skeleton.sh

WORKDIR="${{SSIP_RESTORE_WORKDIR:-$HOME/ssip-restore-$(date +%Y%m%d%H%M%S)}}"

echo "SSIP self-extracting restore launcher"
echo "Working directory: $WORKDIR"
echo ""

mkdir -p "$WORKDIR"
cd "$WORKDIR"

PYTHON_BIN="$(command -v python3 || command -v python || true)"

if [[ -z "$PYTHON_BIN" ]]; then
  echo "ERROR: Python is required to extract the embedded ZIP payload."
  exit 1
fi

echo "Extracting embedded ssip-infra.zip..."

"$PYTHON_BIN" - <<'PY_PAYLOAD'
import base64
from pathlib import Path

payload = """
{wrapped_payload}
"""

Path("ssip-infra.zip").write_bytes(base64.b64decode(payload))
print("Created ssip-infra.zip")
PY_PAYLOAD

echo "Unzipping infrastructure package..."
unzip -o ssip-infra.zip >/dev/null

chmod +x infra/scripts/restore-skeleton.sh

echo ""
echo "Starting SSIP skeleton restore..."
echo ""

exec ./infra/scripts/restore-skeleton.sh "$@"
'''

restore_script_path.write_text(script, encoding="utf-8")
restore_script_path.chmod(0o755)

print(f"Created {restore_script_path}")
PY

rm -rf "${STAGING_DIR}"

echo ""
echo "Infrastructure package created successfully:"
echo "${OUTPUT_ZIP}"
echo ""
echo "Self-extracting restore script created successfully:"
echo "${OUTPUT_RESTORE_SCRIPT}"
echo ""
echo "Recommended Cloud Shell workflow:"
echo ""
echo "  Upload: infra/ssip-restore.sh"
echo ""
echo "  chmod +x ssip-restore.sh"
echo "  ./ssip-restore.sh"
echo ""
echo "Alternative manual workflow:"
echo ""
echo "  Upload: infra/ssip-infra.zip"
echo ""
echo "  rm -rf infra"
echo "  unzip -o ssip-infra.zip"
echo "  chmod +x infra/scripts/restore-skeleton.sh"
echo "  az bicep build --file infra/bicep/main.bicep && echo \"Bicep build passed.\""
echo "  ./infra/scripts/restore-skeleton.sh"
echo ""
echo "Note:"
echo "  SKIP_BICEP_VALIDATION=true skips local Bicep validation during packaging only."
echo "  Bicep must still be validated in Azure Cloud Shell before deployment."
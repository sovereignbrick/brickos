#!/bin/bash
# Seed demo profiles from CSV fixtures via the API.
# Usage: bash ops/seed-demo-profiles.sh <environment>
#   environment: staging | production
#
# Prerequisites:
# - Demo user accounts must exist (optimized@, average@, atrisk@sovereignhealth.io)
# - CSV files in ops/demo-data/

set -e

ENV="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/demo-data"

# API base URLs
if [ "$ENV" = "production" ]; then
    API="https://api.sovereignhealth.io"
else
    API="https://api-demo.sovereignhealth.io"
fi

# Demo profiles mapping
declare -A PROFILES
PROFILES[optimized]="optimized@sovereignhealth.io"
PROFILES[average]="average@sovereignhealth.io"
PROFILES[at_risk]="atrisk@sovereignhealth.io"

DEMO_PASSWORD="${DEMO_PASSWORD:-SovereignDemo2026!}"

echo "=== Seeding demo profiles ($ENV) ==="

for profile in optimized average at_risk; do
    email="${PROFILES[$profile]}"
    csv="$DATA_DIR/${profile}_decrypted.csv"

    if [ ! -f "$csv" ]; then
        echo "SKIP: $csv not found"
        continue
    fi

    echo ""
    echo "--- Profile: $profile ($email) ---"

    # Login to get token
    TOKEN=$(curl -s "$API/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$DEMO_PASSWORD\"}" \
        | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)

    if [ -z "$TOKEN" ]; then
        echo "  WARN: Could not login as $email -- account may not exist yet"
        echo "  Create account first: POST $API/auth/signup"
        continue
    fi

    # Count existing measurements
    EXISTING=$(curl -s "$API/measurements?limit=1" \
        -H "Authorization: Bearer $TOKEN" \
        | python3 -c "import json,sys; print(json.load(sys.stdin).get('meta',{}).get('total',0))" 2>/dev/null)
    echo "  Existing measurements: $EXISTING"

    if [ "$EXISTING" -gt 0 ] 2>/dev/null; then
        echo "  SKIP: Profile already has data. Reset first if re-seeding."
        continue
    fi

    # Import measurements from CSV via the measurements upload endpoint
    LINES=$(($(wc -l < "$csv") - 1))
    echo "  Importing $LINES measurements from $csv..."

    # Upload CSV via the import endpoint
    RESULT=$(curl -s "$API/import/upload-measurements" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@$csv;type=text/csv" \
        | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('session_id','ERROR: ' + str(d.get('error',{}))))" 2>/dev/null)

    echo "  Import session: $RESULT"

    if [[ "$RESULT" == ERROR* ]]; then
        echo "  FAILED: $RESULT"
        continue
    fi

    # Auto-confirm the import
    CONFIRM=$(curl -s "$API/import/$RESULT/confirm" \
        -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('imported_count', d.get('error',{})))" 2>/dev/null)

    echo "  Confirmed: $CONFIRM measurements imported"
done

echo ""
echo "=== Done ==="

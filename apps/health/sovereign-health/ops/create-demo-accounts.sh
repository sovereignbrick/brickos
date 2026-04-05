#!/bin/bash
# Create the 3 demo profile accounts via the API.
# Usage: bash ops/create-demo-accounts.sh <api_base_url>
# Example: bash ops/create-demo-accounts.sh https://api-demo.sovereignhealth.io

set -e

API="${1:-https://api-demo.sovereignhealth.io}"

echo "=== Creating demo accounts on $API ==="

declare -A ACCOUNTS
ACCOUNTS[optimized]="optimized@sovereignhealth.io|SovereignOptimal2026!"
ACCOUNTS[average]="average@sovereignhealth.io|SovereignAverage2026!"
ACCOUNTS[at_risk]="atrisk@sovereignhealth.io|SovereignAtRisk2026!"

for profile in optimized average at_risk; do
    IFS='|' read -r EMAIL PASSWORD <<< "${ACCOUNTS[$profile]}"

    echo ""
    echo "--- Creating: $EMAIL ($profile) ---"

    # Try signup
    RESULT=$(curl -s "$API/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"display_name\":\"Demo $profile\",\"tos_accepted\":true,\"locale\":\"en\"}" 2>/dev/null)

    ERROR=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('code','none'))" 2>/dev/null)

    if [ "$ERROR" = "none" ] || [ "$ERROR" = "null" ]; then
        echo "  Created successfully"
    elif [ "$ERROR" = "duplicate_email" ] || [ "$ERROR" = "email_exists" ]; then
        echo "  Already exists (OK)"
    else
        echo "  Result: $RESULT"
    fi

    # Try login to verify
    TOKEN=$(curl -s "$API/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
        | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)

    if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
        echo "  Login verified (token: ${TOKEN:0:10}...)"
    else
        echo "  Login FAILED -- account may need email verification"
        echo "  Verify manually or set email_verified=true in DB"
    fi
done

echo ""
echo "=== Done ==="
echo ""
echo "Next steps:"
echo "  1. If accounts need email verification, run on VPS:"
echo "     docker exec <db> psql -U sovereign_health -d <db_name> -c"
echo "     \"UPDATE users SET email_verified = true WHERE email LIKE '%@sovereignhealth.io';\""
echo "  2. Then import data: bash ops/seed-demo-profiles.sh <staging|production>"

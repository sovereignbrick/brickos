#!/bin/bash
# Cleanup failed GitLab pipelines for sovereign-health/core-backend
#
# Usage:
#   GITLAB_TOKEN=glpat-xxxx ./ops/cleanup-pipelines.sh
#
# Create a token at: https://gitlab.com/-/user_settings/personal_access_tokens
# Required scope: api

set -e

TOKEN="${GITLAB_TOKEN:?Set GITLAB_TOKEN environment variable (GitLab Personal Access Token with api scope)}"
PROJECT_ID="sovereign-health%2Fcore-backend"
API="https://gitlab.com/api/v4"

echo "=== Fetching failed pipelines ==="

# Fetch all failed pipelines (paginated)
PAGE=1
TOTAL_DELETED=0

while true; do
  PIPELINES=$(curl -s --header "PRIVATE-TOKEN: $TOKEN" \
    "$API/projects/$PROJECT_ID/pipelines?status=failed&per_page=100&page=$PAGE")

  COUNT=$(echo "$PIPELINES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)

  if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
    break
  fi

  echo "Page $PAGE: $COUNT failed pipelines"

  # Extract IDs and delete each
  IDS=$(echo "$PIPELINES" | python3 -c "import sys,json; [print(p['id']) for p in json.load(sys.stdin)]" 2>/dev/null)

  for ID in $IDS; do
    echo -n "  Deleting pipeline $ID... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --request DELETE \
      --header "PRIVATE-TOKEN: $TOKEN" \
      "$API/projects/$PROJECT_ID/pipelines/$ID")
    echo "$HTTP_CODE"
    TOTAL_DELETED=$((TOTAL_DELETED + 1))
  done

  PAGE=$((PAGE + 1))
done

# Also clean canceled pipelines
echo ""
echo "=== Fetching canceled pipelines ==="
PAGE=1

while true; do
  PIPELINES=$(curl -s --header "PRIVATE-TOKEN: $TOKEN" \
    "$API/projects/$PROJECT_ID/pipelines?status=canceled&per_page=100&page=$PAGE")

  COUNT=$(echo "$PIPELINES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)

  if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
    break
  fi

  echo "Page $PAGE: $COUNT canceled pipelines"

  IDS=$(echo "$PIPELINES" | python3 -c "import sys,json; [print(p['id']) for p in json.load(sys.stdin)]" 2>/dev/null)

  for ID in $IDS; do
    echo -n "  Deleting pipeline $ID... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --request DELETE \
      --header "PRIVATE-TOKEN: $TOKEN" \
      "$API/projects/$PROJECT_ID/pipelines/$ID")
    echo "$HTTP_CODE"
    TOTAL_DELETED=$((TOTAL_DELETED + 1))
  done

  PAGE=$((PAGE + 1))
done

echo ""
echo "=== Done: $TOTAL_DELETED pipelines deleted ==="

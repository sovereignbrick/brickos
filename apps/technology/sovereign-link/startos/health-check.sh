#!/bin/bash
# Health check for Start9 - verifies Sovereign Link is running and responsive

RESULT=$(curl -sf http://localhost:8080/ -o /dev/null -w "%{http_code}" 2>/dev/null)

if [ "$RESULT" = "200" ] || [ "$RESULT" = "302" ]; then
    echo '{"result": "starting"}'
    exit 0
fi

# Check if the redirect handler works (core functionality)
REDIRECT=$(curl -sf http://localhost:8080/r/health-check -o /dev/null -w "%{http_code}" 2>/dev/null)
if [ "$REDIRECT" = "301" ] || [ "$REDIRECT" = "404" ]; then
    # 404 is fine - means the server is responding, just no link with that code
    echo '{"result": "running"}'
    exit 0
fi

echo '{"result": "failing", "error": "Sovereign Link is not responding"}'
exit 1

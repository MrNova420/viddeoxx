#!/bin/bash
# Restart API server to apply schema changes

cd ~/public-site
source venv/bin/activate

echo "Stopping API server..."
API_PID=$(cat logs/api.pid 2>/dev/null)
if [ -n "$API_PID" ]; then
  kill $API_PID 2>/dev/null || true
  sleep 2
fi

echo "Starting API server..."
nohup python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --workers 2 --log-level warning > logs/api.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > logs/api.pid

sleep 3

echo "Testing API..."
curl -sf http://localhost:8000/health && echo "" && echo "✅ API restarted successfully (PID: $NEW_PID)" || echo "❌ API failed to start"

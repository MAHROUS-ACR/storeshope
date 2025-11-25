#!/bin/bash

# Kill any existing processes on ports 3001 and 5000
pkill -f "node.*server" 2>/dev/null || true
pkill -f "vite.*dev" 2>/dev/null || true
sleep 1

# Start Express server (notifications API)
echo "🚀 Starting Express Notification Server on port 3001..."
npx tsx server/index.ts > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for Express to start
for i in {1..10}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Express server running"
    break
  fi
  sleep 1
done

# Start Vite dev server
echo "🎨 Starting Vite Dev Server on port 5000..."
vite dev --port 5000

trap 'kill $SERVER_PID 2>/dev/null' EXIT

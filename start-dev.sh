#!/bin/bash

echo "🚀 Starting Flux Wallet Development Server..."
echo ""

# Kill any existing processes
pkill -f "node.*server" 2>/dev/null || true
pkill -f "vite.*dev" 2>/dev/null || true
sleep 1

# Export ENV vars
export PORT=3001

# Start Express server in background
echo "📱 Starting Express Notification Server on port 3001..."
node --import tsx server/index.ts > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 2

# Check if Express started
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "❌ Express server failed to start"
  cat /tmp/server.log
  exit 1
fi
echo "✅ Express server running (PID: $SERVER_PID)"

# Start Vite
echo "🎨 Starting Vite Dev Server on port 5000..."
PORT=5000 vite dev --port 5000 &
VITE_PID=$!
sleep 3

echo ""
echo "========================================="
echo "✅ All servers running!"
echo "========================================="
echo "📱 Frontend: http://localhost:5000/storeshope/"
echo "🔔 API: http://localhost:3001/api/notifications"
echo ""
echo "Servers PIDs:"
echo "  Express: $SERVER_PID"
echo "  Vite: $VITE_PID"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "========================================="

# Trap Ctrl+C to kill both processes
trap 'kill $SERVER_PID $VITE_PID 2>/dev/null; exit 0' INT

# Wait for processes
wait

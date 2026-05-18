#!/bin/bash
echo "========================================"
echo "  Mashroom Magic - Starting App..."
echo "========================================"

DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "[1/4] Installing backend dependencies..."
cd "$DIR/backend" && npm install --silent
if [ $? -ne 0 ]; then echo "ERROR: Backend install failed"; exit 1; fi

echo "[2/4] Installing frontend dependencies..."
cd "$DIR/frontend" && npm install --silent
if [ $? -ne 0 ]; then echo "ERROR: Frontend install failed"; exit 1; fi

echo "[3/4] Starting backend API on port 3001..."
cd "$DIR/backend" && node src/server.js &
BACKEND_PID=$!
sleep 2

echo "[4/4] Starting frontend on port 5000..."
cd "$DIR/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  App is running!"
echo "  Open: http://localhost:5000"
echo "  Press Ctrl+C to stop both servers"
echo "========================================"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

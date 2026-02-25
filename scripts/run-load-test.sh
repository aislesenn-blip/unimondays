#!/bin/bash
set -e

echo "🚀 PREPARING LOAD TEST ENVIRONMENT..."

# Start worker in background
echo "[Run] Starting Worker Process..."
npx tsx scripts/start-worker.ts > worker.log 2>&1 &
WORKER_PID=$!

echo "[Run] Worker started with PID $WORKER_PID. Logs redirected to worker.log."

# Ensure cleanup on exit
cleanup() {
    echo ""
    echo "[Cleanup] Killing worker process $WORKER_PID..."
    kill $WORKER_PID || true
    echo "[Cleanup] Done."
}
trap cleanup EXIT

# Wait for worker to initialize
sleep 5

# Run load test
echo "[Run] Executing Load Test Script..."
npx tsx scripts/load-test.ts

echo "✅ Load Test Completed."

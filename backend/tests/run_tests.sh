#!/bin/bash
# run_tests.sh - Run all API tests

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  SmAIrt Mobility API - Test Suite Runner                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"

echo ""
echo "Starting FastAPI server in background..."
cd "$(dirname "$0")/.."

# Start server in background
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo "✓ Server started (PID: $SERVER_PID)"
echo ""
echo "Running test suite..."
echo ""

# Run tests
python tests/test_endpoints.py
TEST_EXIT=$?

# Kill server
echo ""
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo "✓ Server stopped"
echo ""

exit $TEST_EXIT

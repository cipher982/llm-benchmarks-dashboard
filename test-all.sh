#!/bin/bash

# LLM Benchmarks - Complete Test Suite Runner
# Run this before and after making optimization changes to ensure no regressions

set -e  # Exit on any error

echo "🧪 LLM Benchmarks - Full Test Suite"
echo "=================================="

# Set API URL for testing (default to production)
export TEST_API_URL="${TEST_API_URL:-https://api.llm-benchmarks.com}"
echo "Testing against: $TEST_API_URL"
echo ""

# Backend Tests
echo "🔧 Running Backend Tests..."
echo "----------------------------"
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

echo "Running API baseline tests..."
npm run test:baseline

echo ""
echo "Running performance tests..."
npm run test:performance

echo ""
echo "Running data snapshot tests..."
npm run test:snapshots

cd ..

# Frontend Tests
echo ""
echo "🎨 Running Frontend Tests..."
echo "-----------------------------"
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo "Running frontend integration tests..."
npm test -- --watchAll=false --verbose

cd ..

echo ""
echo "✅ All Tests Complete!"
echo "====================="
echo "If all tests passed, your current state is locked in."
echo "Now you can safely make optimization changes."
echo ""
echo "To run tests during development:"
echo "  Backend: cd backend && npm run test:watch"
echo "  Frontend: cd frontend && npm test"
echo ""
echo "To update snapshots after intentional changes:"
echo "  cd backend && npm test -- --updateSnapshot"
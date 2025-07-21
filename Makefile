# LLM Benchmarks - Single Service Architecture

TEST_API_URL ?= https://api.llm-benchmarks.com

.PHONY: help dev build start test install clean check update-snapshots watch static-files setup-db

# Default target
.DEFAULT_GOAL := help

# Show help
help:
	@echo "🚀 LLM Benchmarks - Single Service Architecture"
	@echo ""
	@echo "📋 Available Commands:"
	@echo ""
	@echo "🏗️  Development:"
	@echo "   make dev              Start development server (Next.js)"
	@echo "   make build            Build production app"
	@echo "   make start            Start production server"
	@echo "   make install          Install all dependencies"
	@echo ""
	@echo "🧪 Testing:"
	@echo "   make test             Run all tests"
	@echo "   make check            Quick safety check (baseline tests)"
	@echo "   make watch            Watch tests during development"
	@echo "   make update-snapshots Update test snapshots"
	@echo ""
	@echo "⚡ Performance:"
	@echo "   make static-files     Generate static API files manually"
	@echo "   make setup-db         Create database indexes for performance"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "   make clean            Clean node_modules and build artifacts"
	@echo ""
	@echo "🐳 Docker:"
	@echo "   docker-compose up     Start full system with static file generation"
	@echo ""
	@echo "📊 Status:"
	@echo "   ✅ Architecture consolidated to single Next.js service"
	@echo "   ✅ Performance system (60s → 1ms queries) implemented"
	@echo "   ✅ All frontend pages migrated and working"
	@echo "   ✅ Windows 98 design system preserved"
	@echo "   🔄 Ready for testing and deployment!"
	@echo ""
	@echo "🚀 Quick Start: make dev"
	@echo "📖 More info: README.md"

# Start development server
dev:
	@echo "🚀 Starting Next.js development server..."
	cd backend && npm run dev

# Build production app
build:
	@echo "🏗️ Building production app..."
	cd backend && npm run build

# Start production server
start:
	@echo "🌟 Starting production server..."
	cd backend && npm start

# Generate static files manually
static-files:
	@echo "⚡ Generating static API files..."
	cd backend && node scripts/generate-static-files.js

# Setup database indexes
setup-db:
	@echo "📊 Creating database indexes for performance..."
	cd backend && node scripts/create-indexes.js

# Run all tests
test:
	@echo "🧪 Running all tests..."
	cd backend && TEST_API_URL=$(TEST_API_URL) npm test
	@echo "✅ All tests complete!"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	cd backend && npm install
	@echo "✅ Dependencies installed!"

# Quick check (for optimization safety)
check:
	@echo "🚀 Quick safety check..."
	cd backend && TEST_API_URL=$(TEST_API_URL) npm run test:baseline

# Watch backend tests during development
watch:
	@echo "👀 Watching backend tests..."
	cd backend && npm run test:watch

# Update snapshots after intentional changes
update-snapshots:
	@echo "📸 Updating snapshots..."
	cd backend && npm test -- --updateSnapshot

# Clean up
clean:
	@echo "🧹 Cleaning..."
	cd backend && rm -rf node_modules coverage .next
	@echo "✅ Clean complete!"
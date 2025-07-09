# LLM Benchmarks - Development Tasks

TEST_API_URL ?= https://api.llm-benchmarks.com

.PHONY: test install clean check update-snapshots watch

# Run all tests
test:
	@echo "🧪 Running all tests..."
	cd backend && TEST_API_URL=$(TEST_API_URL) npm test
	cd frontend && npm test -- --watchAll=false --verbose
	@echo "✅ All tests complete!"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	cd backend && npm install
	cd frontend && npm install

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
	cd backend && rm -rf node_modules coverage
	cd frontend && rm -rf node_modules coverage build
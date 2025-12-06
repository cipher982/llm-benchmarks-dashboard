FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Use npm ci for reliable, reproducible installs based on package-lock.json
RUN npm ci

# Copy only necessary source files
COPY components/ ./components/
COPY pages/ ./pages/
COPY public/ ./public/
COPY styles/ ./styles/
COPY utils/ ./utils/
COPY models/ ./models/
COPY types/ ./types/
COPY hooks/ ./hooks/
COPY scripts/ ./scripts/
COPY server.js ./
COPY next.config.mjs ./
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies and curl for health checks
RUN npm ci --only=production && \
    apk add --no-cache curl

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js

# Set environment variables
ENV PORT=3000
# NODE_ENV should be provided by the environment; server.js validates it
ENV HOST=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/health || exit 1

CMD ["npm", "start"] 

FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files first to leverage caching
COPY package*.json ./

# Use npm ci for reliable, faster installs based on package-lock.json
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 5000

CMD ["npm", "start"] 
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files first to leverage caching
COPY package*.json ./

# Use npm ci for reliable, faster installs based on package-lock.json
RUN npm ci

# Copy source files
COPY . .

# Build the React application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"] 
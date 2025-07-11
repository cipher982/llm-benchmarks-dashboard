FROM node:20-alpine AS builder

# Accept the API URL as a build argument (Vite uses VITE_ prefix)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the Vite application with env vars available at build time
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx (Vite builds to 'dist' not 'build')
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Note: Standard nginx:alpine doesn't include brotli module

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

RUN apk add --no-cache curl

CMD ["nginx", "-g", "daemon off;"]
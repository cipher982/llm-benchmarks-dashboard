FROM node:20-alpine AS builder

# Accept the API URL as a build argument
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the React application with env vars available at build time
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copy optimized nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install brotli module (if available) for better compression
RUN apk add --no-cache nginx-mod-http-brotli || true

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"] 
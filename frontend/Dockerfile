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

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Create custom nginx config to listen on port 3000
RUN echo 'server { \
    listen 3000; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy built files from builder stage to nginx serve directory
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 3000

# nginx container starts the server automatically
CMD ["nginx", "-g", "daemon off;"] 
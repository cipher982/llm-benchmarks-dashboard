FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Use npm ci for reliable, reproducible installs based on package-lock.json
RUN npm ci

# Copy source files
COPY . .

# Build the React application
RUN npm run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Copy built files from builder stage to nginx serve directory
COPY --from=builder /app/build /usr/share/nginx/html

# Add a simple script to inject environment variables at runtime
RUN echo '#!/bin/sh\n\
echo "window.env = { REACT_APP_API_URL: \"$REACT_APP_API_URL\" };" > /usr/share/nginx/html/env-config.js\n\
nginx -g "daemon off;"\n\
' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Create custom nginx config to listen on port 3000
RUN echo 'server { \
    listen 3000; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

# Use the entrypoint script
CMD ["/docker-entrypoint.sh"] 
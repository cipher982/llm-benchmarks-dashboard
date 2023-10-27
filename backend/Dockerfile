# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.8.1
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js"

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base as build

# Set the working directory
WORKDIR /app

# Install packages needed to build node modules
RUN apt-get clean && rm -rf /var/lib/apt/lists/* && rm -rf /var/cache/apt/*
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential pkg-config python-is-python3 --fix-missing
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install node modules
COPY --link package-lock.json package.json ./
RUN npm ci

# Copy application code
COPY --link app/ .


# Final stage for app image
FROM base

# Set the working directory (to match the build stage)
WORKDIR /app

# Copy built application and
COPY --from=build /app/ .
COPY --from=build /app/models/ ./models/

# Port to expose (ensure this matches the port your app listens on)
ARG PORT=5000
EXPOSE ${PORT}

# Start the app app.js
CMD ["node", "/app/app.js"]


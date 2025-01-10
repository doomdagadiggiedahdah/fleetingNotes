# Wraps a nodejs-based stdio server into a sse MCP server
FROM node:20-alpine as builder

# Repository to build the container for
ARG REPO

WORKDIR /app

RUN npm i -g @smithery/gateway

# Build stage with git and build dependencies
RUN apk add --no-cache git && \
    git clone ${REPO} . && \
    npm ci && \
    npm run build && \
    npm cache clean --force

EXPOSE 8080

# TODO: Generate the config
CMD ["npx", "-y", "@smithery/gateway", "--port", "8080", "--stdio", "npx ."]
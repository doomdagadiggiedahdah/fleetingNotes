# Wraps a python-based stdio server into a sse MCP server
FROM python:3.12-alpine

# Repository to build the container for
ARG REPO

WORKDIR /app

RUN apk add --no-cache git && pip install uv

# Build stage with git and build dependencies
RUN git clone ${REPO} . && \
    uv build

RUN apk add --no-cache nodejs npm && \
    npm install -g npm@latest

RUN npm i -g supergateway

EXPOSE 8080

# TODO: Generate the config
CMD ["npx", "-y", "supergateway", "--port", "8080", "--stdio", "uv run mcp-timeserver"]
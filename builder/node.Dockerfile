FROM node:20-alpine as builder

WORKDIR /app
ARG REPO

# Build stage with git and build dependencies
RUN apk add --no-cache git && \
    git clone $REPO . && \
    npm ci && \
    npm install @smithery/gateway@latest && \
    npm run build && \
    npm cache clean --force

EXPOSE 8080

CMD ["npx", "@smithery/gateway", "--port", "8080", "--configb64", "eyJzdGFydENvbW1hbmQiOnsidHlwZSI6InN0ZGlvIiwiY29uZmlnU2NoZW1hIjp7fSwiY29tbWFuZEZ1bmN0aW9uIjoiKGNvbmZpZykgPT4gKHtcbiAgXCJjb21tYW5kXCI6IFwibnB4XCIsXG4gIFwiYXJnc1wiOiBbXG4gICAgXCIuXCJcbiAgXVxufSkifX0="]
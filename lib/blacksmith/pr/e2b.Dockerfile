# You can use most Debian-based base images
FROM debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive

# Create a non-root user
RUN useradd -m -s /bin/bash runner

# Install dependencies
RUN apt-get update && apt-get install -y ca-certificates curl gnupg git sudo

# Install Fly CLI as the non-root user
RUN su - runner -c 'curl -L https://fly.io/install.sh | sh'

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER runner
ENV FLYCTL_INSTALL="/home/runner/.fly"
ENV PATH="$FLYCTL_INSTALL/bin:$PATH"
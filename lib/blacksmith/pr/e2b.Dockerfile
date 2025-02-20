# You can use most Debian-based base images
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git

# Non-root user
RUN useradd -m -s /bin/bash runner

# Install Fly CLI as user
USER runner
RUN curl -L https://fly.io/install.sh | sh

# Install Depot CLI as user
RUN curl -L https://depot.dev/install-cli.sh | sh

USER root
# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

ENV FLYCTL_INSTALL="/home/runner/.fly"
ENV DEPOT_INSTALL="/home/runner/.depot"
ENV PATH="$FLYCTL_INSTALL/bin:$DEPOT_INSTALL/bin:$PATH"

CMD ["/bin/bash"]
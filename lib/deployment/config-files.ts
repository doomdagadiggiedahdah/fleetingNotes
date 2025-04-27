import type { ServerConfig } from "../types/server-config"

/**
 * Creates a fly config file
 * Should be named `fly.toml`
 * @param appId
 * @returns
 */
export function createFlyConfig(appId: string, performance = false) {
	if (performance) {
		// Performance machine settings
		return `\
app = '${appId}'
primary_region = 'iad'

[build]
  dockerfile = "Dockerfile.smithery"

[http_service]
  internal_port = 8080
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  
  [http_service.concurrency]
    type = "connections"
    soft_limit = 80
    hard_limit = 120

  [[http_service.checks]]
    interval = "30s"
    grace_period = "5s"
    method = "get"
    path = "/.well-known/mcp/smithery.json"
    protocol = "http"
    timeout = "8s"
    tls_skip_verify = false
    [http_service.checks.headers]
      X-Forwarded-Proto = "https"
  
[[vm]]
  memory = '2gb'
  cpu_kind = 'performance'
  cpus = 1

[env]
  PORT = 8080
`
	}
	return `\
app = '${appId}'
primary_region = 'iad'

[build]
  dockerfile = "Dockerfile.smithery"

[http_service]
  internal_port = 8080
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  
  [http_service.concurrency]
    type = "connections"
    soft_limit = 40
    hard_limit = 100

  [[http_service.checks]]
    interval = "30s"
    grace_period = "5s"
    method = "get"
    path = "/.well-known/mcp/smithery.json"
    protocol = "http"
    timeout = "8s"
    tls_skip_verify = false
    [http_service.checks.headers]
      X-Forwarded-Proto = "https"
  
[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1

[env]
  PORT = 8080
`
}

/**
 * Creates a Dockerfile that wraps the user's Dockerfile to launch as a server.
 * Should be named `Dockerfile.smithery`
 */
export function wrapDockerfileWithSidecar(
	baseDockerfile: string,
	config: ServerConfig,
) {
	const configb64 = Buffer.from(JSON.stringify(config)).toString("base64")
	return `\
FROM registry.fly.io/sidecar:deployment-01JSJN17SWDXGHDGCFJHAPJJ68 as sidecar_image

# User's Dockerfile
${baseDockerfile}
# End user Dockerfile

COPY --from=sidecar_image /app/gateway-app-glibc /tmp/smithery-gateway-glibc
COPY --from=sidecar_image /app/gateway-app-musl  /tmp/smithery-gateway-musl

USER root

# Install required dependencies for Alpine
RUN /bin/sh -c 'set -eux && \
  if grep -q "Alpine" /etc/os-release 2>/dev/null; then \
    echo "Alpine Linux detected, installing required libraries" && \
    apk add --no-cache libstdc++ libgcc && \
    echo "musl" > /tmp/os-family; \
    exit 0; \
  fi'

# Fallback detection script if not Alpine: tries ldd on /bin/sh (or /usr/bin/env) to see if it's musl or glibc.
# If ldd or /bin/sh doesn't exist, this might fail.
RUN /bin/sh -c 'set -eux && \
  if [ -f /tmp/os-family ]; then \
    echo "OS family already detected, skipping detection"; \
    exit 0; \
  fi && \
  if [ ! -x /bin/sh ] && [ ! -x /usr/bin/env ]; then \
    echo "ERROR: No shell found in the user image. Can not detect OS family." >&2 && \
    exit 1; \
  fi && \
  shell_to_check="/bin/sh" && \
  if [ ! -x "$shell_to_check" ]; then \
    shell_to_check="/usr/bin/env"; \
  fi && \
  if ! command -v ldd >/dev/null 2>&1; then \
    echo "ERROR: ldd not found in the user image. Can not detect OS family." >&2 && \
    exit 1; \
  fi && \
  if ldd "$shell_to_check" 2>&1 | grep -qi musl; then \
    echo "musl detected" && \
    echo "musl" > /tmp/os-family; \
  else \
    echo "glibc detected" && \
    echo "glibc" > /tmp/os-family; \
  fi'

# Pick the correct binary based on /tmp/os-family
RUN /bin/sh -c 'set -eux && \
  os_family="$(cat /tmp/os-family)" && \
  case "$os_family" in \
    musl)  mv /tmp/smithery-gateway-musl /usr/local/bin/smithery-gateway ;; \
    glibc) mv /tmp/smithery-gateway-glibc /usr/local/bin/smithery-gateway ;; \
    *) \
      echo "Unknown OS family: $os_family" >&2 && \
      exit 1 ;; \
  esac && \
  chmod +x /usr/local/bin/smithery-gateway && \
  rm -f /tmp/smithery-gateway-*'

# Expose port for gateway
EXPOSE 8080

# Use Smithery Gateway as the entrypoint
ENTRYPOINT ["/usr/local/bin/smithery-gateway"]
CMD ["--port", "8080", "--configb64", "${configb64}"]
`
}

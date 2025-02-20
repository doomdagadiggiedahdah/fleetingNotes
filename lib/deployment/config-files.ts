import type { ServerConfig } from "../types/server-config"

/**
 * Creates a fly config file
 * Should be named `fly.toml`
 * @param appId
 * @returns
 */
export function createFlyConfig(appId: string) {
	return `\
app = '${appId}'
primary_region = 'iad'

[build]
  dockerfile = "Dockerfile.smithery"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  
  [http_service.concurrency]
    type = "connections"
    soft_limit = 50
    hard_limit = 100
  
[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
`
}

/**
 * Creates a Dockerfile that wraps the user's Dockerfile to launch as a server.
 * Should be named `Dockerfile.smithery`
 */
export function createDockerfile(baseDockerfile: string, config: ServerConfig) {
	const configb64 = Buffer.from(JSON.stringify(config)).toString("base64")
	return `\
FROM registry.fly.io/sidecar:deployment-01JKK3M7V2JJB2KEBCB7WPHZVE as gateway_image

# User's Dockerfile
${baseDockerfile}
# End user Dockerfile

COPY --from=gateway_image /app/gateway-app-glibc /tmp/smithery-gateway-glibc
COPY --from=gateway_image /app/gateway-app-musl  /tmp/smithery-gateway-musl

USER root

# "Detect" script: tries ldd on /bin/sh (or /usr/bin/env) to see if it's musl or glibc.
# If ldd or /bin/sh doesn't exist, this might fail.
# We store the result in /tmp/os-family.
RUN /bin/sh -c 'set -eux && \
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

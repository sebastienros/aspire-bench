# Held-out application (Shop: minimal API + SQL Server + RabbitMQ worker), PLAN card T0.2.
# Same toolchain pins as tools/templates/Dockerfile; gen-tasks.mjs refuses to emit tasks if the
# ARG and FROM pin lines of the two templates differ. Only the official daily CLI is used.
ARG APP_KIND=aspire
FROM node:24.14.0-bookworm-slim AS node
FROM docker:28.0.4-dind AS docker

FROM mcr.microsoft.com/dotnet/sdk:10.0.100-noble AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl git gnupg iptables iproute2 jq lsof procps tini unzip xz-utils \
    && rm -rf /var/lib/apt/lists/*
RUN curl --fail --silent --show-error --location --retry 3 \
        --connect-timeout 10 --max-time 120 \
        https://packages.microsoft.com/keys/microsoft.asc -o /tmp/microsoft.asc \
    && gpg --dearmor --output /usr/share/keyrings/microsoft-azure-cli.gpg /tmp/microsoft.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/microsoft-azure-cli.gpg] https://packages.microsoft.com/repos/azure-cli/ noble main" \
        > /etc/apt/sources.list.d/azure-cli.list \
    && apt-get update && apt-get install -y --no-install-recommends azure-cli \
    && rm -rf /var/lib/apt/lists/* /tmp/microsoft.asc
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
COPY --from=docker /usr/local/bin/ /usr/local/bin/
COPY --from=docker /usr/local/libexec/docker/cli-plugins/ /usr/local/libexec/docker/cli-plugins/
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_GENERATE_ASPNET_CERTIFICATE=false \
    ASPNETCORE_ENVIRONMENT=Development \
    DOTNET_ENVIRONMENT=Development \
    CONTAINER_RUNTIME=docker \
    DOCKER_HOST=unix:///var/run/docker.sock \
    COMPOSE_PROJECT_NAME=shop \
    BENCH_RUN_ID=shop \
    SQL_PORT=14330 \
    SQL_PASSWORD=Shop_dev_Passw0rd \
    RABBITMQ_PORT=56720 \
    RABBITMQ_MANAGEMENT_PORT=15680 \
    RABBITMQ_PASSWORD=shop-dev \
    API_PORT=18090
WORKDIR /app

# ---- Standard (non-Aspire) application: Compose dependencies + lifecycle scripts.
FROM base AS app-raw
COPY --from=heldout-app / /app/
COPY --from=suite heldout/raw-overlay/ /app/
RUN dotnet build Shop.slnx --nologo -v q
ENV BENCH_APP_KIND=raw

# ---- Aspirified application on a pinned daily build of microsoft/aspire main: the same
# business code plus the ServiceDefaults gate (servicedefaults.patch), an AppHost and ServiceDefaults.
FROM base AS app-aspire
ARG ASPIRE_VERSION=17.1.0-preview.1.26567.3
ARG ASPIRE_SHA256_AMD64=f2c40e69f74782df7c2a6c778178bb2259253c0360261f4b14e680323cb3701a
ARG ASPIRE_SHA256_ARM64=18b9cd4bfbbbd92fba480cb995f3eedb427776d83408b0ec27fde7ff7bbde4a5
ARG ASPIRE_COMMIT=30326eb876d6897b1feadc8bc800f78e466b1b52
RUN set -eu; arch="$(dpkg --print-architecture)"; \
    case "$arch" in amd64) rid=x64; sum="$ASPIRE_SHA256_AMD64";; arm64) rid=arm64; sum="$ASPIRE_SHA256_ARM64";; *) exit 1;; esac; \
    url="https://ci.dot.net/public/aspire/${ASPIRE_VERSION}/aspire-cli-linux-${rid}-${ASPIRE_VERSION}.tar.gz"; \
    curl --fail --silent --show-error --location --retry 5 --retry-all-errors "$url" -o /tmp/aspire.tgz; \
    echo "$sum  /tmp/aspire.tgz" | sha256sum -c -; \
    mkdir -p /usr/local/aspire && tar -xzf /tmp/aspire.tgz -C /usr/local/aspire && rm /tmp/aspire.tgz; \
    ln -s /usr/local/aspire/aspire /usr/local/bin/aspire; \
    aspire --version | tee /etc/aspire-version
ENV ASPIRE_CLI_TELEMETRY_OPTOUT=1 \
    ASPIRE_CLI_GENERATE_HTTPS_CERTIFICATE=false
COPY --from=heldout-app / /app/
COPY --from=suite heldout/aspire-overlay/ /app/
RUN git apply servicedefaults.patch && rm servicedefaults.patch \
    && dotnet build src/Shop.Api/Shop.Api.csproj --nologo -v q \
    && dotnet build src/Shop.Worker/Shop.Worker.csproj --nologo -v q \
    && (aspire restore --apphost /app/apphost.cs --non-interactive --nologo || true)
ENV BENCH_APP_KIND=aspire

FROM app-${APP_KIND} AS final
ARG SKILLS=none
ARG FAULT=none
COPY --from=suite heldout/bench/ /opt/benchmark/
# Host-side operations tooling, visible to the agent like any installed script.
COPY --from=suite heldout/ops/ /usr/local/lib/shop-ops/
RUN chmod +x /usr/local/lib/shop-ops/*.sh
RUN --mount=type=bind,from=suite,source=skills,target=/mnt/skills \
    if [ "$SKILLS" != "none" ]; then \
        sh /mnt/skills/compose.sh "$SKILLS" /app/.github/skills \
        && sh /mnt/skills/compose.sh "$SKILLS" /opt/agent-skills; \
    fi
# The fault name stays out of the environment the agent sees; the harness reads it from here.
RUN printf '%s\n' "$FAULT" > /opt/benchmark/fault && chmod 600 /opt/benchmark/fault
ENV BENCH_SKILLS=${SKILLS}
ENTRYPOINT ["tini", "--", "bash", "/opt/benchmark/entrypoint.sh"]
CMD ["sleep", "infinity"]

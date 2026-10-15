FROM node:24.14.0-bookworm-slim AS node
FROM docker:28.0.4-dind AS docker
FROM mcr.microsoft.com/dotnet/sdk:10.0.100-noble

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

RUN curl --fail --silent --show-error --location https://aspire.dev/install.sh \
    -o /tmp/install-aspire.sh \
    && bash /tmp/install-aspire.sh --version 13.6.0 --install-path /usr/local/bin --skip-path \
    && rm /tmp/install-aspire.sh

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_GENERATE_ASPNET_CERTIFICATE=false \
    ASPIRE_CLI_TELEMETRY_OPTOUT=1 \
    ASPIRE_CLI_GENERATE_HTTPS_CERTIFICATE=false \
    ASPNETCORE_ENVIRONMENT=Development \
    DOTNET_ENVIRONMENT=Development \
    CONTAINER_RUNTIME=docker \
    DOCKER_HOST=unix:///var/run/docker.sock \
    COMPOSE_PROJECT_NAME=harbor-bingo \
    BENCH_RUN_ID=harbor-bingo \
    POSTGRES_PORT=54320 \
    REDIS_PORT=63790 \
    ADMIN_PORT=18080 \
    FRONTEND_PORT=15173 \
    Authentication__AdminPassword=Benchmark1! \
    Parameters__admin_password=Benchmark1!

ENV BENCH_APP_KIND=compose

WORKDIR /app
COPY --from=raw-app / /app/
COPY app/ /app/
COPY skills/ /opt/aspire-skills/
COPY input-hashes.json /opt/benchmark/input-hashes.json
COPY entrypoint.sh /opt/benchmark/entrypoint.sh
ENTRYPOINT ["tini", "--", "bash", "/opt/benchmark/entrypoint.sh"]
CMD ["sleep", "infinity"]

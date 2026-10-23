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

ARG TARGETARCH
ENV ASPIRE_HOME=/opt/aspire-pr \
    PATH="/opt/aspire-pr/bin:${PATH}"
RUN case "$TARGETARCH" in \
        arm64) rid=linux-arm64; sha=14f8ab337ec763bb05a4094083844fc0ac6be7ec0afac892a86dfed89cb31b6f ;; \
        amd64) rid=linux-x64; sha=bd30e457cbb30d5042e99016e41f7fac83669f1101ac029e70a5a047d9c32f34 ;; \
        *) echo "Unsupported PR CLI architecture: $TARGETARCH" >&2; exit 1 ;; \
    esac \
    && curl --fail --silent --show-error --location --retry 3 \
        "https://github.com/sebastienros/aspire-bench/releases/download/aspire-pr-21279-6676979b/aspire-pr21279-$rid.tar.gz" \
        -o /tmp/aspire-pr.tar.gz \
    && echo "$sha  /tmp/aspire-pr.tar.gz" | sha256sum --check - \
    && mkdir /tmp/aspire-pr-artifacts \
    && tar -xzf /tmp/aspire-pr.tar.gz -C /tmp/aspire-pr-artifacts \
    && curl --fail --silent --show-error --location --retry 3 \
        https://raw.githubusercontent.com/microsoft/aspire/6676979b2bb4ed074568b84c84fb36a196d38f06/eng/scripts/get-aspire-cli-pr.sh \
        -o /tmp/install-aspire-pr.sh \
    && echo "2e2336d8a10ed4db92be2de0416e3eb21f60541ab4a7e2b4df0f1606fc48ee8e  /tmp/install-aspire-pr.sh" | sha256sum --check - \
    && bash /tmp/install-aspire-pr.sh --local-dir /tmp/aspire-pr-artifacts \
        --hive-label pr-21279 --install-path /opt/aspire-pr \
        --skip-path --skip-extension --skip-completions \
    && test "$(aspire --version)" = "17.0.0-pr.21279.g6676979b" \
    && rm -r /tmp/aspire-pr-artifacts /tmp/aspire-pr.tar.gz /tmp/install-aspire-pr.sh

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

ENV BENCH_APP_KIND=aspire

WORKDIR /app
COPY --from=aspire-app / /app/
COPY app/ /app/
RUN rm /app/.github/mcp.json
COPY --from=aspire-skills / /opt/aspire-skills/
COPY --from=aspire-skills / /app/.github/skills/
COPY skills/ /opt/aspire-skills/
COPY skills/ /app/.github/skills/
COPY input-hashes.json /opt/benchmark/input-hashes.json
COPY entrypoint.sh /opt/benchmark/entrypoint.sh
ENTRYPOINT ["tini", "--", "bash", "/opt/benchmark/entrypoint.sh"]
CMD ["sleep", "infinity"]

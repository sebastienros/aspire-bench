ARG APP_KIND=aspire
# official: the pinned daily CLI only. source: additionally build the CLI from source at
# the same commit (optionally with a patch from common/aspire-patches) and put it on PATH.
ARG CLI_KIND=official
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
    COMPOSE_PROJECT_NAME=bingo \
    BENCH_RUN_ID=bingo \
    POSTGRES_PORT=54320 \
    REDIS_PORT=63790 \
    ADMIN_PORT=18080 \
    FRONTEND_PORT=15173 \
    Authentication__AdminPassword=Benchmark1! \
    Parameters__admin_password=Benchmark1!
WORKDIR /app

# ---- Optional Aspire CLI built from source at the daily build's commit.
# CLI_PATCH=control builds the unmodified commit, so a patched arm is compared with a
# build that differs only by the patch (both are managed, not NativeAOT like the daily).
FROM mcr.microsoft.com/dotnet/sdk:10.0.100-noble AS cli-source
ARG ASPIRE_COMMIT=4954c76a62bd091e0edbb02854c0dc2be06e64f5
ARG ASPIRE_SDK=11.0.100-rc.2.26504.105
ARG CLI_PATCH=control
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git \
    && rm -rf /var/lib/apt/lists/* \
    && curl --fail --silent --show-error --location --retry 5 https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh \
    && bash /tmp/dotnet-install.sh --version "$ASPIRE_SDK" --install-dir /usr/share/dotnet \
    && git init -q /src && cd /src \
    && git remote add origin https://github.com/microsoft/aspire.git \
    && git fetch -q --depth 1 origin "$ASPIRE_COMMIT" && git checkout -q FETCH_HEAD
RUN --mount=type=bind,from=suite,source=aspire-patches,target=/patches \
    set -eu; cd /src; \
    if [ "$CLI_PATCH" != "control" ]; then git apply "/patches/$CLI_PATCH.patch"; fi; \
    rid="linux-$(dpkg --print-architecture | sed 's/amd64/x64/')"; \
    dotnet publish src/Aspire.Cli/Aspire.Cli.csproj -c Release -r "$rid" --self-contained \
        -p:PublishAot=false -p:PublishSingleFile=true \
        -p:VersionSuffix="agentic.$(printf %s "$CLI_PATCH" | tr -cd 'a-z0-9')" \
        -p:SourceRevisionId="$ASPIRE_COMMIT" -p:IncludeSourceRevisionInInformationalVersion=true \
        -p:EnableSourceControlManagerQueries=false -o /out --nologo -v q

FROM base AS cli-official
RUN mkdir /out

FROM cli-${CLI_KIND} AS cli

# ---- Standard (non-Aspire) application: Compose dependencies + lifecycle scripts.
FROM base AS app-raw
COPY --from=raw-app / /app/
COPY --from=suite raw-overlay/ /app/
RUN rm -rf /app/.github \
    && dotnet build AspireifyBingo.slnx --nologo -v q \
    && (cd src/bingo-board && npm ci --no-audit --no-fund)
ENV BENCH_APP_KIND=raw

# ---- Aspirified application on a pinned daily build of microsoft/aspire main.
FROM base AS app-aspire
ARG ASPIRE_VERSION=17.1.0-preview.1.26559.1
ARG ASPIRE_SHA256_AMD64=3aba57eb6338ec7f7ab70472227399300f121671686a0d37ca3f3d9ac5433f54
ARG ASPIRE_SHA256_ARM64=8c4d6c23beeb55efd8bc3a6fcf03fbe9afc7250f6aeda0887491e7768bdfab13
# Optional replacement CLI (custom source build of the same commit). Empty keeps the official daily.
ARG ASPIRE_CLI_URL=
ARG ASPIRE_CLI_SHA256=
RUN set -eu; arch="$(dpkg --print-architecture)"; \
    case "$arch" in amd64) rid=x64; sum="$ASPIRE_SHA256_AMD64";; arm64) rid=arm64; sum="$ASPIRE_SHA256_ARM64";; *) exit 1;; esac; \
    url="https://ci.dot.net/public/aspire/${ASPIRE_VERSION}/aspire-cli-linux-${rid}-${ASPIRE_VERSION}.tar.gz"; \
    if [ -n "$ASPIRE_CLI_URL" ]; then url="$ASPIRE_CLI_URL"; sum="$ASPIRE_CLI_SHA256"; fi; \
    curl --fail --silent --show-error --location --retry 5 --retry-all-errors "$url" -o /tmp/aspire.tgz; \
    echo "$sum  /tmp/aspire.tgz" | sha256sum -c -; \
    mkdir -p /usr/local/aspire && tar -xzf /tmp/aspire.tgz -C /usr/local/aspire && rm /tmp/aspire.tgz; \
    ln -s /usr/local/aspire/aspire /usr/local/bin/aspire; \
    aspire --version | tee /etc/aspire-version
ENV ASPIRE_CLI_TELEMETRY_OPTOUT=1 \
    ASPIRE_CLI_GENERATE_HTTPS_CERTIFICATE=false
# A source-built CLI replaces the one on PATH (agent, MCP server, harness). The official
# daily stays at /usr/local/aspire/aspire: it carries the bundle and starts the AppHost.
COPY --from=cli /out/ /usr/local/aspire-source/
RUN if [ -x /usr/local/aspire-source/aspire ]; then \
        ln -sf /usr/local/aspire-source/aspire /usr/local/bin/aspire \
        && aspire --version | tee /etc/aspire-version; \
    fi
COPY --from=aspire-app / /app/
COPY --from=suite aspire-overlay/ /app/
RUN rm -rf /app/.github \
    && dotnet build src/BingoBoard.Admin/BingoBoard.Admin.csproj --nologo -v q \
    && dotnet build src/BingoBoard.MigrationService/BingoBoard.MigrationService.csproj --nologo -v q \
    && (cd src/bingo-board && npm ci --no-audit --no-fund) \
    && (aspire restore --apphost /app/apphost.cs --non-interactive --nologo || true)
ENV BENCH_APP_KIND=aspire

FROM app-${APP_KIND} AS final
ARG SKILLS=none
ARG FAULT=none
COPY --from=suite bench/ /opt/benchmark/
RUN --mount=type=bind,from=suite,source=skills,target=/mnt/skills \
    if [ "$SKILLS" != "none" ]; then \
        sh /mnt/skills/compose.sh "$SKILLS" /app/.github/skills \
        && sh /mnt/skills/compose.sh "$SKILLS" /opt/agent-skills; \
    fi
ENV BENCH_FAULT=${FAULT} \
    BENCH_SKILLS=${SKILLS}
ENTRYPOINT ["tini", "--", "bash", "/opt/benchmark/entrypoint.sh"]
CMD ["sleep", "infinity"]

# Authoring scenarios (PLAN §7 T3.2 `aspireify`, T3.3 `aspire-init`): adoption, add-dependency, greenfield.
# Same toolchain pins as the Bingo template (gen-tasks.mjs checks it). The stage is chosen by FAULT.
ARG FAULT=none
FROM node:24.14.0-bookworm-slim AS node
FROM docker:28.0.4-dind AS docker

FROM mcr.microsoft.com/dotnet/sdk:10.0.100-noble AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl git gnupg iptables iproute2 jq lsof procps redis-tools tini unzip xz-utils \
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

# ---- The pinned daily CLI, with every Aspire* package of that daily vendored into the image and the
# NuGet global packages folder warmed (common/authoring/vendor.sh, ruling 7). Shared by every arm.
FROM base AS aspire
ARG ASPIRE_COMMIT=30326eb876d6897b1feadc8bc800f78e466b1b52
ARG ASPIRE_VERSION=17.1.0-preview.1.26567.3
ARG ASPIRE_SHA256_AMD64=f2c40e69f74782df7c2a6c778178bb2259253c0360261f4b14e680323cb3701a
ARG ASPIRE_SHA256_ARM64=18b9cd4bfbbbd92fba480cb995f3eedb427776d83408b0ec27fde7ff7bbde4a5
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
RUN grep -q "+$ASPIRE_COMMIT" /etc/aspire-version
RUN --mount=type=bind,from=suite,source=authoring,target=/mnt/authoring \
    bash /mnt/authoring/vendor.sh "$ASPIRE_VERSION"

# ---- adoption: the raw Bingo application (its own launcher, no AppHost), built, nothing running.
FROM aspire AS app-adoption
COPY --from=raw-app / /app/
COPY --from=suite raw-overlay/ /app/
RUN rm -rf /app/.github \
    && dotnet build AspireifyBingo.slnx --nologo -v q \
    && (cd src/bingo-board && npm ci --no-audit --no-fund)
ENV BENCH_APP_KIND=raw

# ---- add-dependency: the aspirified Bingo application without Redis (the admin backend keeps its
# distributed cache in process memory); setup starts it under Aspire.
FROM aspire AS app-add-dependency
COPY --from=aspire-app / /app/
COPY --from=suite aspire-overlay/ /app/
COPY --from=suite authoring/add-dependency/ /app/
RUN rm -rf /app/.github \
    && dotnet build src/BingoBoard.Admin/BingoBoard.Admin.csproj --nologo -v q \
    && dotnet build src/BingoBoard.MigrationService/BingoBoard.MigrationService.csproj --nologo -v q \
    && (cd src/bingo-board && npm ci --no-audit --no-fund) \
    && aspire restore --apphost /app/apphost.cs --non-interactive --nologo
ENV BENCH_APP_KIND=aspire

# ---- greenfield: no application at all. Every arm's /app holds a .github folder (the skill arms'
# skills live in it), so `aspire new --output /app` meets the same non-empty folder in every arm.
FROM aspire AS app-greenfield
RUN rm -rf /app && mkdir -p /app/.github
ENV BENCH_APP_KIND=aspire

FROM app-${FAULT} AS final
ARG SKILLS=none
ARG FAULT=none
COPY --from=suite authoring/entrypoint.sh authoring/setup.mjs /opt/benchmark/
RUN --mount=type=bind,from=suite,source=skills,target=/mnt/skills \
    if [ "$SKILLS" != "none" ]; then \
        sh /mnt/skills/compose.sh "$SKILLS" /app/.github/skills \
        && sh /mnt/skills/compose.sh "$SKILLS" /opt/agent-skills; \
    fi
ENV BENCH_FAULT=${FAULT} \
    BENCH_SKILLS=${SKILLS}
ENTRYPOINT ["tini", "--", "bash", "/opt/benchmark/entrypoint.sh"]
CMD ["sleep", "infinity"]

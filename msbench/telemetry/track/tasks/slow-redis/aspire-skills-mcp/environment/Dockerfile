ARG APP_KIND=aspire
# official: the pinned daily CLI only. source: additionally build the CLI from source at
# the same commit (optionally with a patch from common/aspire-patches) and put it on PATH.
ARG CLI_KIND=official
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

# ---- Optional Aspire CLI built from source at the daily build's commit.
# CLI_PATCH=control builds the unmodified commit, so a patched arm is compared with a
# build that differs only by the patch (both are managed, not NativeAOT like the daily).
FROM mcr.microsoft.com/dotnet/sdk:10.0.100-noble AS cli-source
ARG ASPIRE_COMMIT=4ad3cfe685bcf47d79c8d16d64fc4be6363280dd
ARG ASPIRE_SDK=11.0.100
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
# PLAN T2.5: an application variant (common/app-variants/<APP_VARIANT>/) copied over the overlay, for
# example the cache on the Aspire Redis client integration, or the raw app with OpenTelemetry and a file
# exporter. Empty (every other arm) copies nothing.
ARG APP_VARIANT=
RUN --mount=type=bind,from=suite,source=.,target=/mnt/suite \
    if [ -n "$APP_VARIANT" ]; then cp -R "/mnt/suite/app-variants/$APP_VARIANT/." /app/; fi
RUN rm -rf /app/.github \
    && dotnet build AspireifyBingo.slnx --nologo -v q \
    && (cd src/bingo-board && npm ci --no-audit --no-fund)
ENV BENCH_APP_KIND=raw

# ---- Aspirified application on a pinned daily build of microsoft/aspire main.
FROM base AS app-aspire
ARG ASPIRE_VERSION=17.1.0-preview.1.26569.1
ARG ASPIRE_SHA256_AMD64=fe6653adab6be9d244a62948679aeaaa24658d9e91eba1ad62ed7053136f28c3
ARG ASPIRE_SHA256_ARM64=23ccee12e1084eb99ca37fec779fc124fb88cb50a7eb24b8317daabf52384e73
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
# PLAN T2.5: an application variant (common/app-variants/<APP_VARIANT>/) copied over the overlay, for
# example the cache on the Aspire Redis client integration, or the raw app with OpenTelemetry and a file
# exporter. Empty (every other arm) copies nothing.
ARG APP_VARIANT=
RUN --mount=type=bind,from=suite,source=.,target=/mnt/suite \
    if [ -n "$APP_VARIANT" ]; then cp -R "/mnt/suite/app-variants/$APP_VARIANT/." /app/; fi
RUN rm -rf /app/.github \
    && dotnet build src/BingoBoard.Admin/BingoBoard.Admin.csproj --nologo -v q \
    && dotnet build src/BingoBoard.MigrationService/BingoBoard.MigrationService.csproj --nologo -v q \
    && (cd src/bingo-board && npm ci --no-audit --no-fund) \
    && (aspire restore --apphost /app/apphost.cs --non-interactive --nologo || true)
ENV BENCH_APP_KIND=aspire

FROM app-${APP_KIND} AS final
ARG SKILLS=none
ARG FAULT=none
# PLAN T3.7 (ruling 7): the migration may make the agent add or restore Aspire packages, and the daily feed
# floats under a pinned CLI (FINDINGS F54). The authoring lane's vendored feed pins every Aspire package to
# the pinned daily from disk and warms the NuGet cache (common/authoring/vendor.sh). Every other fault skips it.
ARG ASPIRE_VERSION=17.1.0-preview.1.26569.1
RUN --mount=type=bind,from=suite,source=authoring,target=/mnt/authoring \
    if [ "$FAULT" = migration ]; then bash /mnt/authoring/vendor.sh "$ASPIRE_VERSION"; fi
# PLAN T4.3: a code fault (common/faults/<FAULT>.patch) applied to the business code of either kind and
# compiled in; the patch stays outside the image. Every other fault has no patch and skips this.
RUN --mount=type=bind,from=suite,source=.,target=/mnt/suite \
    if [ -f "/mnt/suite/faults/$FAULT.patch" ]; then \
        cd /app && git apply --verbose "/mnt/suite/faults/$FAULT.patch" \
        && dotnet build src/BingoBoard.Admin/BingoBoard.Admin.csproj --nologo -v q; \
    fi
COPY --from=suite bench/ /opt/benchmark/
# Host-side operations tooling, visible to the agent like any installed script.
COPY --from=suite ops/ /usr/local/lib/bingo-ops/
RUN chmod +x /usr/local/lib/bingo-ops/*.sh
# SKILLS=plugin: `aspire agent init` registers the aspire-skills plugin for Copilot CLI (project
# scope, plus its user-level telemetry hook), with the marketplace pinned to the tag the `current`
# copy was taken from, so both deliveries carry the same skill content.
ARG PLUGIN_REF=v0.0.6
RUN --mount=type=bind,from=suite,source=skills,target=/mnt/skills \
    if [ "$SKILLS" = "plugin" ]; then \
        cd /app && aspire agent init --non-interactive --nologo --agents copilot --skills aspire \
            --scope project --mcp=false \
        && jq --arg ref "$PLUGIN_REF" '.extraKnownMarketplaces["aspire-skills"].source.ref = $ref' \
            .github/copilot/settings.json > /tmp/settings.json && mv /tmp/settings.json .github/copilot/settings.json \
        && cat .github/copilot/settings.json; \
    elif [ "$SKILLS" != "none" ]; then \
        sh /mnt/skills/compose.sh "$SKILLS" /app/.github/skills \
        && sh /mnt/skills/compose.sh "$SKILLS" /opt/agent-skills; \
    fi
# PLAN T2.10: an agent instructions file beside the AppHost (the `-agents` arms), as `aspire new` /
# `aspire agent init` would write it. AGENTS_MD names a file in common/agents-md; empty adds none.
ARG AGENTS_MD=
RUN --mount=type=bind,from=suite,source=agents-md,target=/mnt/agents-md \
    if [ -n "$AGENTS_MD" ]; then cp "/mnt/agents-md/$AGENTS_MD.md" /app/AGENTS.md && wc -c /app/AGENTS.md; fi
# PLAN T4.7: the -cc arms, run only under the claude-code harness, which reads neither /app/.github/skills nor
# task.toml's MCP server. CLAUDE_CODE=skills also composes the arm's set into /app/.claude/skills (Claude Code's
# project skill folder); skills-mcp also registers the same `aspire agent mcp` server at user scope in the agent
# user's ~/.claude.json, where Claude Code starts it without a prompt (as Harbor's claude_code agent writes it).
# Empty (every other arm) adds nothing.
ARG CLAUDE_CODE=
RUN --mount=type=bind,from=suite,source=.,target=/mnt/suite \
    if [ -n "$CLAUDE_CODE" ]; then \
        sh /mnt/suite/skills/compose.sh "$SKILLS" /app/.claude/skills \
        && if [ "$CLAUDE_CODE" = skills-mcp ]; then cp /mnt/suite/claude-code/claude.json /root/.claude.json; fi \
        && ls /app/.claude/skills; \
    fi
ENV BENCH_FAULT=${FAULT} \
    BENCH_SKILLS=${SKILLS}
ENTRYPOINT ["tini", "--", "bash", "/opt/benchmark/entrypoint.sh"]
CMD ["sleep", "infinity"]

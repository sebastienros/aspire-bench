FROM node:24.14.0-bookworm-slim AS node
FROM docker:28.0.4-dind AS docker
FROM mcr.microsoft.com/dotnet/sdk:10.0.100-noble
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl git iptables iproute2 jq procps tini unzip \
    && rm -rf /var/lib/apt/lists/*
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
COPY --from=docker /usr/local/bin/ /usr/local/bin/
COPY --from=docker /usr/local/libexec/docker/cli-plugins/ /usr/local/libexec/docker/cli-plugins/
RUN curl --fail --silent --show-error --location https://aspire.dev/install.sh -o /tmp/install.sh \
    && bash /tmp/install.sh --version 13.6.0 --install-path /usr/local/bin --skip-path \
    && rm /tmp/install.sh
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_GENERATE_ASPNET_CERTIFICATE=false \
    ASPIRE_CLI_TELEMETRY_OPTOUT=1 ASPIRE_CLI_GENERATE_HTTPS_CERTIFICATE=false \
    DOCKER_HOST=unix:///var/run/docker.sock BENCH_APP_KIND=aspire
WORKDIR /app
COPY --from=bingo-source / /app/
COPY --from=publishing-common /Dockerfile.dotnet /app/Dockerfile.dotnet
COPY --from=publishing-common /dockerignore /app/.dockerignore
COPY --from=publishing-common /Dockerfile.frontend /app/src/bingo-board/Dockerfile.nginx
COPY --from=publishing-common /inputs.env /app/deployment-inputs.env
COPY --from=publishing-common /README.md /app/README.md
COPY --from=publishing-common /apphost.cs /app/apphost.cs
RUN rm compose.yaml \
    && dotnet publish src/BingoBoard.MigrationService -c Release -o /opt/benchmark/seed \
    && dotnet restore src/BingoBoard.Admin \
    && cd src/bingo-board && npm ci && npm run build
RUN dotnet restore apphost.cs
COPY --from=publishing-common /entrypoint.sh /setup.sh /grade.mjs /negative.sh /opt/benchmark/
ENTRYPOINT ["tini", "--", "bash", "/opt/benchmark/entrypoint.sh"]
CMD ["sleep", "infinity"]

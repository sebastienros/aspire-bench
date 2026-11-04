FROM mcr.microsoft.com/dotnet/sdk@sha256:db7d1f28c0805ea69fe43f73e54cffd2a0689a0c637a6078328e27c5aab2314a

RUN apt-get update \
    && apt-get install -y --no-install-recommends clang zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    MSBUILDTERMINALLOGGER=false

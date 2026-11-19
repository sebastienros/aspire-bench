#!/usr/bin/env bash
# Image build step for the authoring scenarios (PLAN §7 T3.2/T3.3, ruling 7).
#   vendor.sh <aspire-version>
# 1. Mirrors every Aspire* package of the pinned daily (aspire-packages.txt) into a flat folder and
#    points the CLI at it with the install sidecar (`packages`), so `aspire new`, `aspire init`,
#    `aspire add` and restore resolve Aspire packages from disk at the pinned version instead of
#    floating to whatever daily the dnceng feed holds on the day of the trial. The CLI then prints an
#    "emulating identity" notice on stderr for every human-readable command (same in every arm).
# 2. Warms the NuGet global packages folder with what the templates and the usual integrations
#    restore from nuget.org, as on a developer machine that has used Aspire before, so a trial's
#    restore is a cache hit. Nothing generated here stays in the image, and agent init is suppressed:
#    no user-level hooks or agent configuration are left behind.
set -euo pipefail
version="$1"
here="$(cd "$(dirname "$0")" && pwd)"
dest=/usr/local/aspire/packages
work="$(mktemp -d)"

# ---- 1. vendored feed
mkdir -p "$work/mirror" "$dest"
{
    echo '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net10.0</TargetFramework>'
    echo '<ManagePackageVersionsCentrally>false</ManagePackageVersionsCentrally></PropertyGroup><ItemGroup>'
    grep -v '^#' "$here/aspire-packages.txt" | sed '/^$/d' | while read -r id; do
        echo "<PackageDownload Include=\"$id\" Version=\"[$version]\" />"
    done
    echo '</ItemGroup></Project>'
} >"$work/mirror/mirror.csproj"
cat >"$work/mirror/nuget.config" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="aspire-daily" value="https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet9/nuget/v3/index.json" />
  </packageSources>
</configuration>
EOF
for attempt in 1 2 3; do
    dotnet restore "$work/mirror/mirror.csproj" --packages "$work/pk" --nologo -v q && break
    [[ "$attempt" == 3 ]] && exit 1
    sleep 10
done
grep -v '^#' "$here/aspire-packages.txt" | sed '/^$/d' | while read -r id; do
    lower="$(printf %s "$id" | tr '[:upper:]' '[:lower:]')"
    cp "$work/pk/$lower/$version/$lower.$version.nupkg" "$dest/$id.$version.nupkg"
done
count="$(ls "$dest" | wc -l)"
echo "vendored $count Aspire packages at $version into $dest"
printf '{"packages":"%s"}\n' "$dest" >/usr/local/aspire/.aspire-install.json

# ---- 2. warm the global packages folder (nuget.org dependencies of templates and integrations)
cd "$work"
aspire new aspire-starter --name Warm --output "$work/starter" --non-interactive --nologo --suppress-agent-init
grep -q "$version" "$work/starter/Warm.AppHost/Warm.AppHost.csproj"
(cd "$work/starter" && aspire add Aspire.Hosting.PostgreSQL --apphost Warm.AppHost/Warm.AppHost.csproj --non-interactive --nologo \
    && aspire add Aspire.Hosting.Redis --apphost Warm.AppHost/Warm.AppHost.csproj --non-interactive --nologo \
    && dotnet build Warm.sln --nologo -v q)
mkdir -p "$work/single" && cat >"$work/single/apphost.cs" <<EOF
#:sdk Aspire.AppHost.Sdk@$version
#:package Aspire.Hosting.PostgreSQL@$version
#:package Aspire.Hosting.Redis@$version
#:package Aspire.Hosting.JavaScript@$version
var builder = DistributedApplication.CreateBuilder(args);
builder.Build().Run();
EOF
cp "$work/starter/nuget.config" "$work/single/nuget.config"
aspire restore --apphost "$work/single/apphost.cs" --non-interactive --nologo
mkdir -p "$work/client" && cat >"$work/client/client.csproj" <<EOF
<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net10.0</TargetFramework>
<ManagePackageVersionsCentrally>false</ManagePackageVersionsCentrally></PropertyGroup><ItemGroup>
<PackageReference Include="Aspire.Npgsql" Version="$version" />
<PackageReference Include="Aspire.Npgsql.EntityFrameworkCore.PostgreSQL" Version="$version" />
<PackageReference Include="Aspire.StackExchange.Redis" Version="$version" />
<PackageReference Include="Aspire.StackExchange.Redis.DistributedCaching" Version="$version" />
<PackageReference Include="Aspire.StackExchange.Redis.OutputCaching" Version="$version" />
</ItemGroup></Project>
EOF
cp "$work/starter/nuget.config" "$work/client/nuget.config"
dotnet restore "$work/client/client.csproj" --nologo -v q

# ---- clean up: nothing generated, no agent configuration, no logs
cd /
rm -rf "$work" /root/.aspire/logs /tmp/NuGetScratch*
for path in /root/.copilot /root/.claude /root/.aspire/hooks /app/.github/copilot; do
    if [[ -e "$path" ]]; then echo "agent configuration left behind: $path" >&2; exit 1; fi
done
echo "warm-up complete"

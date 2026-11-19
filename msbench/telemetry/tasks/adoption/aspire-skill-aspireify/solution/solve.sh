#!/usr/bin/env bash
# Reference solution, adoption (PLAN T3.2). Shape A (default): a file-based apphost.cs beside the
# solution. Shape B (SOLUTION_SHAPE=init): `aspire init` (AppHost project), its central-package-
# management restore failure repaired, integrations added with `aspire add`. Business code untouched.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd /app
# The workspace's NuGet.config clears every source but nuget.org; Aspire packages come from the
# vendored daily, as `aspire init` / `aspire add` configure it.
node - <<'JS'
const fs = require("node:fs");
let s = fs.readFileSync("/app/NuGet.config", "utf8");
if (!s.includes("/usr/local/aspire/packages")) {
    s = s.replace("</packageSources>", '  <add key="aspire" value="/usr/local/aspire/packages" />\n  </packageSources>')
         .replace("</packageSourceMapping>", '  <packageSource key="aspire">\n      <package pattern="Aspire*" />\n    </packageSource>\n  </packageSourceMapping>');
    fs.writeFileSync("/app/NuGet.config", s);
}
JS
if [[ "${SOLUTION_SHAPE:-}" == init ]]; then
    aspire init --language csharp --non-interactive --nologo
    host=/app/AspireifyBingo.AppHost
    v=17.1.0-preview.1.26567.3
    # aspire init writes versioned PackageReferences, which central package management rejects (NU1008).
    sed -i -E 's#(<PackageReference Include="[^"]+") Version="[^"]+"#\1#' "$host/AspireifyBingo.AppHost.csproj"
    node - "$v" <<'JS'
const fs = require("node:fs");
const v = process.argv[2];
let s = fs.readFileSync("/app/Directory.Packages.props", "utf8");
const add = ["Aspire.Hosting.AppHost", "Aspire.Hosting.Dotnet"].filter(id => !s.includes(`"${id}"`))
    .map(id => `    <PackageVersion Include="${id}" Version="${v}" />\n`).join("");
s = s.replace(/(\s*)<\/ItemGroup>/, `\n${add}$1</ItemGroup>`);
fs.writeFileSync("/app/Directory.Packages.props", s);
JS
    for pkg in Aspire.Hosting.PostgreSQL Aspire.Hosting.Redis Aspire.Hosting.JavaScript; do
        aspire add "$pkg" --apphost "$host/AspireifyBingo.AppHost.csproj" --non-interactive --nologo
    done
    # The project template's AppHost (plain SDK) names projects by path: AddDotnetProject.
    sed -n '/^var builder/,$p' "$here/apphost.cs" \
        | sed -e 's#AddProject<Projects.BingoBoard_MigrationService>("migrations")#AddDotnetProject("migrations", "../src/BingoBoard.MigrationService/BingoBoard.MigrationService.csproj")#' \
              -e 's#AddProject<Projects.BingoBoard_Admin>("boardadmin", launchProfileName: "http")#AddDotnetProject("boardadmin", "../src/BingoBoard.Admin/BingoBoard.Admin.csproj")#' \
              -e 's#AddViteApp("bingoboard", "src/bingo-board")#AddViteApp("bingoboard", "../src/bingo-board")#' >"$host/AppHost.cs"
    ! grep -q "Projects\." "$host/AppHost.cs"
    apphost="$host/AspireifyBingo.AppHost.csproj"
else
    cp "$here/apphost.cs" /app/apphost.cs
    apphost=/app/apphost.cs
fi
aspire start --apphost "$apphost" --non-interactive --nologo
aspire wait boardadmin --apphost "$apphost" --non-interactive --timeout 600 --nologo
aspire wait bingoboard --apphost "$apphost" --non-interactive --timeout 600 --nologo

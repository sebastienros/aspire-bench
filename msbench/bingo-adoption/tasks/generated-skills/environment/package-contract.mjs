import assert from "node:assert/strict";

const additions = new Set([
    "Aspire.Hosting.JavaScript", "Aspire.Hosting.PostgreSQL", "Aspire.Hosting.Redis",
]);

export function preservesPackageConfiguration(before, after) {
    const normalize = value => value.replace(/\s+/g, "");
    const originalNames = new Set([...before.matchAll(/<PackageVersion\b[^>]*\bInclude\s*=\s*(["'])(.*?)\1/g)]
        .map(match => match[2]));
    const corrected = after.replace(/<PackageVersion\b[^>]*\/>/g, element => {
        const attributes = Object.fromEntries([...element.matchAll(/([A-Za-z]+)\s*=\s*(["'])(.*?)\2/g)]
            .map(match => [match[1], match[3]]));
        if (Object.keys(attributes).length === 2
            && additions.has(attributes.Include) && !originalNames.has(attributes.Include)
            && attributes.Version === "13.6.0") return "";
        return element;
    });
    return normalize(before) === normalize(corrected);
}

export function databaseFromConnectionString(connection) {
    const fields = Object.fromEntries(connection.split(";").filter(Boolean).map(field => {
        const split = field.indexOf("=");
        return [field.slice(0, split).trim().toLowerCase(), field.slice(split + 1).trim()];
    }));
    assert(fields.database && /^[A-Za-z0-9_-]+$/.test(fields.database),
        "Real backend database name required");
    return fields.database;
}

export function isApplicationBackend(args, cwd) {
    return cwd.startsWith("/app/")
        && args.some(arg => /(?:^|\/)BingoBoard\.Admin(?:\.dll)?$/.test(arg));
}

export function redisPingArgs(config) {
    const launch = [...config.Entrypoint ?? [], ...config.Cmd ?? []].join(" ");
    return /(?:^|\s)--tls-port(?:\s|=)/.test(launch)
        ? ["--tls", "--cacert", "/usr/lib/ssl/aspire/cert.pem"]
        : [];
}

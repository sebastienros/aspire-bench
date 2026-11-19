---
name: aspire-start
description: >-
  Start an Aspire app from its AppHost and confirm it is actually serving, or restart one
  resource after a change. USE FOR: "start the app", "run the app", "bring it up", "launch",
  "get the app's URLs or endpoints", first run after cloning, app not running, restart a
  resource. DO NOT USE FOR: finding why a running app is slow or failing (aspire-diagnose),
  creating or editing an AppHost (aspire-init, aspireify), deployment (aspire-deployment).
license: MIT
---

# Start an Aspire app

One command, from the directory that contains the AppHost.
Add `--apphost <path>` only when the directory has more than one AppHost.

```bash
aspire start --non-interactive --wait   # builds, starts the AppHost in the background, waits until every
                                        # resource is healthy (or finished), then prints each one's URLs
```

- Use `aspire start`, never `aspire run`: `run` stays in the foreground and blocks the shell.
- Add `--isolated` when another copy of the app may be running (a second worktree, a parallel
  agent): it randomizes ports and isolates secrets.
- `--wait <resource> <resource>` waits only for the named resources. Resources that run to
  completion (migrations, installers) count as ready when they finish with exit code 0.
- Ports are allocated at start. Take URLs from what `aspire start` printed (or `aspire describe`);
  never assume a port.

## If a resource does not become healthy

```bash
aspire describe <resource> --format Json   # state, healthReports, URLs
aspire logs <resource> -n 50               # its console output
```

Fix the cause, then restart only that resource: `aspire resource <resource> restart`.
Restart the whole app only when the AppHost itself changed: `aspire stop`, then `aspire start`.

## Confirm it is serving

`Running` and `Healthy` describe the process, not your feature. Request one real URL that
`aspire start` printed (`curl -fsS <url>`) before reporting that the app is up.

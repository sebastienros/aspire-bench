---
repo: dotnet/aspire
title: "`aspire stop` returns before teardown; a start right after it adopts containers that are then removed"
finding: F56
labels: []
status: draft
issue:
---

## Summary

On `main` (daily `17.1.0-preview.1.26567.3+30326eb8`, file-based C# AppHost, Linux, Docker), with container
resources that have fixed names (`WithContainerName(...)`):

1. `aspire stop --apphost apphost.cs --non-interactive` prints "stopped successfully" while the instance's
   containers are still running.
2. `aspire start --apphost apphost.cs --non-interactive --isolated` issued right after succeeds and its resources
   report Running/Healthy: the new instance has adopted the still-running named container.
3. About a minute later the old instance's teardown removes that container. `aspire describe` shows the resource
   Exited; every caller of it fails (here HTTP 500 from the app on every cache call).

## Repro

```
aspire start --apphost apphost.cs --non-interactive
aspire wait <project> --apphost apphost.cs
aspire stop --apphost apphost.cs --non-interactive
docker ps          # the named containers are still Up
aspire start --apphost apphost.cs --non-interactive --isolated
sleep 60
aspire describe --apphost apphost.cs --format Json   # the named container resource: Exited
```

## Proposal

- `aspire stop` waits until the instance's resources are removed before returning (or `--wait`), or prints that
  teardown continues in the background.
- A start does not adopt a container owned by an instance that is being torn down; it waits or fails with a clear
  message.

## Evidence

Agent benchmark (aspire-bench `msbench/telemetry`, PLAN §7 T3.1 `port-conflict`): agents told by the
`aspire-orchestration` skill to "stop, then restart" on a port conflict hit this in 3 of 6 trials on the cheapest
model; see the finding.

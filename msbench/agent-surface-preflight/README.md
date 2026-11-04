# Agent-surface preflight, not an efficiency benchmark

Performed 2026-11-04 after the shared Docker engine failed. These checks use the
already installed **host** CLI
`17.0.0-preview.1.26530.1+a76b57a995db8e2e00ad64c3fadd7c2c825e98b9`.
They do not change the pinned 13.6.0 Harbor arms or establish version parity.

## Generated project-local skills

In an isolated ignored scratch directory, ran:

```bash
aspire agent init --workspace-root <scratch> --agents copilot --skills aspire \
  --aspire-source embedded --mcp=false --scope project --non-interactive --nologo
```

Result: seven skills / 40 files under `.agents/skills`; no global configuration
or repository guidance modified. The command says the shared directory may be
discovered by unselected clients too. The generated inventory/checksums are
preserved alongside this report. Source marker was a copied Bingo AppHost;
generation did not compile or run it and is not proof of project-specific
resource-name knowledge or compatibility with CLI 13.6.

## Actual MCP transport/schema check

Started this exact host CLI's `agent mcp` against the scratch AppHost path.
Sent real JSON-RPC `initialize`, `notifications/initialized`, and `tools/list`.
Initialization and schema enumeration succeeded with 13 tools. The child
process exited after stdin closed; no app, container, or model was started.

`list_resources`, `wait_for_resources`, `list_console_logs`,
`execute_resource_command`, `list_structured_logs`, `list_traces`,
`list_trace_structured_logs`, `list_integrations`, `doctor`, `refresh_tools`,
`list_docs`, `search_docs`, and `get_doc` were advertised. Raw initialization
and tool schema responses are preserved in `mcp-handshake.json`.

This proves transport and **advertisement**, not a working resource backchannel,
trace availability, agent selection, or a CLI-versus-MCP gain. Those require
the Docker-validated D01 fixture on a matched toolchain. Do not mix the host's
generated bundle/server with the old fixture and call it a one-factor ablation.

## Gate and recovery

The shared Docker daemon timed out on independent `version`/`ps` requests;
host disk was at 100% capacity with 2.8 GiB available. Full source-build jobs
reported native compilation I/O/read-only failures and containerd metadata I/O.
Possible nested-cgroup/freezer effects were also observed but are not established
as the cause. No shared restart/prune was performed.

Complete local image/runtime validation after owner-controlled recovery before
submitting new factorial conditions. Model pilots must remain natural-choice,
one original attempt per distinct condition initially, using actual model-call
and tool-event evidence. Existing I01 and health conditions must not be resubmitted.

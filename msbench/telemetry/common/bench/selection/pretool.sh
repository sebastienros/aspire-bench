#!/usr/bin/env bash
# preToolUse hook of the selection benchmark (PLAN card T3.9). Copilot CLI runs it before every tool
# call. The run is a static copy of the workspace (nothing is running), so it is stopped at the
# first skill load or after the third command, whichever comes first:
#   - file reads (view, glob, grep) and report_intent run, at most 12 of them;
#   - the first `skill` call runs, and every call after it is denied;
#   - up to three other calls (shell commands, MCP tools, edits) run; the fourth is denied.
# A denial tells the model the session is over, so it ends its turn. Every call is logged to
# /var/log/selection-hook.jsonl with the decision; the verifier copies that file into its output.
set -u
log=/var/log/selection-hook.jsonl
state=/var/lib/selection-hook
mkdir -p "$state"
input="$(cat)"
tool="$(jq -r '.toolName // .tool_name // ""' <<<"$input" 2>/dev/null)"
count() { local f="$state/$1"; local n; n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 )); echo "$n" >"$f"; echo "$n"; }
decision=allow
if [[ -e "$state/stopped" ]]; then
    decision=deny
else
    case "$tool" in
        skill) touch "$state/stopped" ;;
        view|glob|grep|report_intent|think) [[ "$(count reads)" -gt 12 ]] && { decision=deny; touch "$state/stopped"; } ;;
        *) [[ "$(count commands)" -gt 3 ]] && { decision=deny; touch "$state/stopped"; } ;;
    esac
fi
jq -c --arg decision "$decision" --arg tool "$tool" '{at: now, tool: $tool, decision: $decision, args: (.toolArgs // .tool_input // null)}' <<<"$input" >>"$log" 2>/dev/null || true
if [[ "$decision" == deny ]]; then
    echo '{"permissionDecision":"deny","permissionDecisionReason":"This session has ended and no further tool calls can run. End your turn now with one short sentence."}'
fi
exit 0

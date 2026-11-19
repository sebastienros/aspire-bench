#!/usr/bin/env bash
# The tracking schedule of REPORT §11 as a local script (PLAN T4.5, ruling 6; rule "T4.5 tracking rule,
# as computed"). Nothing here runs on a schedule, files an issue or pushes unless told to.
#
#   tools/track.sh repin  --aspire-version <v|latest> [--skills-tag <tag>] [--dry-run] [--push]
#       Re-pins REPORT §11's core matrix under track/ in three commits (track/common, track/tasks,
#       track/dataset.jsonl); dataset.jsonl, tasks/, tools/templates/ and common/ never move.
#       --dry-run does the three commits in a throwaway clone in $TMPDIR, prints what they change, deletes
#       the clone and checks this checkout is untouched. Without --push the commits stay local (CES fetches
#       tasks from GitHub, so gates and trials need them pushed).
#   tools/track.sh gate   --run <run>                  12 oracle gates (round <run>-gate) from track/dataset.jsonl;
#                                                       waits, collects, and fails unless every reward is 1
#   tools/track.sh matrix --run <run> [--repeat 5] [--round <name>] [--dataset <file>] [--excluded <reason>]
#                                                       submits the 24 core cells (120 trials at --repeat 5)
#   tools/track.sh finish --run <run> [--rounds <r,...>] [--series-out <dir>] [--include-excluded <r,...>]
#       waits for the rounds, commits their ledger lines, collects only those rounds (plus what trials.jsonl
#       already holds), runs series.py, and writes issue drafts for flags (track_drafts.py); a luna time or
#       token flag first gets one repeat round (<run>-repeat) and is re-read
#   tools/track.sh run    --aspire-version <v|latest> [--skills-tag <tag>] --push
#                                                       the whole chain: repin, gate, matrix, finish
#   tools/track.sh smoke                                PLAN T4.5 smoke: repin --dry-run on the newest daily, then
#                                                       the matrix at 1 repeat on the current tasks (round t45-smoke,
#                                                       ledger `excluded`), finish with series and drafts kept as evidence
set -euo pipefail
suite="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(cd "$suite/../.." && pwd)"
feed="https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet9/nuget/v3/flat2/aspire.hosting"
models=(gpt-6-luna gpt-6.1-terra)
cells=(slow-sql/raw slow-sql/aspire-cli slow-sql/aspire-skills-mcp slow-sql/aspire-lean
       slow-redis/raw slow-redis/aspire-cli slow-redis/aspire-skills-mcp slow-redis/aspire-lean
       cold-start/raw cold-start/aspire-cli cold-start/aspire-skills-mcp cold-start/aspire-lean)
cmd="${1:-}"; shift || true
# Options live in o_<name> variables (macOS ships bash 3.2: no associative arrays).
set_opt() { local name="${1//-/_}"; printf -v "o_$name" '%s' "$2"; }
get() { local name="o_${1//-/_}"; printf '%s' "${!name:-}"; }
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run|--push|--no-repeat|--skip-submit) set_opt "${1#--}" 1; shift ;;
        --*) set_opt "${1#--}" "$2"; shift 2 ;;
        *) echo "unexpected argument $1" >&2; exit 2 ;;
    esac
done
say() { printf '== %s\n' "$*" >&2; }
get_or() { local v; v="$(get "$1")"; printf '%s' "${v:-$2}"; }
need() { local v; v="$(get "$1")"; [[ -n "$v" ]] || { echo "missing $2" >&2; exit 2; }; printf '%s' "$v"; }

# ---- re-pin --------------------------------------------------------------------------------------
latest_daily() {
    curl -fsS --max-time 60 "$feed/index.json" | python3 -c '
import json, re, sys
versions = [v for v in json.load(sys.stdin)["versions"] if re.match(r"^\d+\.\d+\.\d+-preview\.\d+\.\d+\.\d+$", v)]
key = lambda v: (tuple(int(x) for x in v.split("-")[0].split(".")), tuple(int(x) for x in v.split("-")[1].split(".")[1:]))
print(max(versions, key=key))'
}

# Writes track/common (copy of common/ with the new pins) and track/common/PIN.json in <dir>.
write_track_common() {
    local dir="$1" version="$2" skills_tag="$3" tel="$1/msbench/telemetry" tmp old_version old_commit commit sum_x64 sum_arm
    tmp="$(mktemp -d)"
    old_version="$(sed -nE 's/^ARG ASPIRE_VERSION=(.*)/\1/p' "$tel/tools/templates/Dockerfile" | head -1)"
    old_commit="$(sed -nE 's/^ARG ASPIRE_COMMIT=(.*)/\1/p' "$tel/tools/templates/Dockerfile" | head -1)"
    commit="$(curl -fsS --max-time 60 "$feed/$version/aspire.hosting.nuspec" | grep -oE 'commit="[0-9a-f]{40}"' | cut -d'"' -f2)"
    [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || { echo "no commit for $version on the feed" >&2; exit 1; }
    for rid in x64 arm64; do
        curl -fsS --max-time 600 --retry 3 -o "$tmp/$rid.tgz" "https://ci.dot.net/public/aspire/$version/aspire-cli-linux-$rid-$version.tar.gz"
    done
    sum_x64="$(shasum -a 256 "$tmp/x64.tgz" | cut -d' ' -f1)"; sum_arm="$(shasum -a 256 "$tmp/arm64.tgz" | cut -d' ' -f1)"
    rm -rf "$tel/track/common"; mkdir -p "$tel/track"
    cp -R "$tel/common" "$tel/track/common"
    # The pinned version and commit wherever common/ spells them (overlay AppHost SDK and packages, bench.mjs,
    # variants); binary files are left alone.
    grep -rlI -e "$old_version" -e "$old_commit" "$tel/track/common" | while read -r file; do
        sed -i '' -e "s/${old_version//./\\.}/$version/g" -e "s/$old_commit/$commit/g" "$file"
    done
    local skills_sha
    skills_sha="$(grep -m1 -oE '^\| `current` \| `microsoft/aspire-skills` @ `[0-9a-f]{40}` \(v[0-9.]+' "$tel/common/skills/PROVENANCE.md" | sed -E 's/.*@ `([0-9a-f]{40})` \((v[0-9.]+)/\2 \1/')"
    if [[ -n "$skills_tag" && "$skills_tag" != "${skills_sha%% *}" ]]; then
        git clone -q --depth 1 --branch "$skills_tag" https://github.com/microsoft/aspire-skills.git "$tmp/skills"
        local new_sha; new_sha="$(git -C "$tmp/skills" rev-parse HEAD)"
        # The lean set replaces aspire-monitoring/SKILL.md wholesale; a tag that changes that file needs the
        # override re-derived by hand (as T0.1 did), so the re-pin stops here.
        if ! cmp -s "$tmp/skills/skills/aspire-monitoring/SKILL.md" "$tel/common/skills/current/aspire-monitoring/SKILL.md"; then
            echo "skills $skills_tag changes aspire-monitoring/SKILL.md: re-derive common/skills/lean-overrides first (PLAN T4.5 rule 7)" >&2
            exit 1
        fi
        rm -rf "$tel/track/common/skills/current"; mkdir -p "$tel/track/common/skills/current"
        cp -R "$tmp/skills/skills/." "$tel/track/common/skills/current/"
        find "$tel/track/common/skills/current" -type d -name evals -prune -exec rm -rf {} +
        cp "$tmp/skills/LICENSE" "$tel/track/common/skills/current/LICENSE" 2>/dev/null || true
        sed -i '' -E "s#^\| \`current\` \| \`microsoft/aspire-skills\` @ \`[0-9a-f]{40}\` \(v[0-9.]+#| \`current\` | \`microsoft/aspire-skills\` @ \`$new_sha\` ($skills_tag#" "$tel/track/common/skills/PROVENANCE.md"
        skills_sha="$skills_tag $new_sha"
    fi
    jq -n --arg v "$version" --arg c "$commit" --arg a "$sum_x64" --arg r "$sum_arm" --arg t "${skills_sha%% *}" \
        --arg s "${skills_sha#* }" --arg ov "$old_version" --arg oc "$old_commit" \
        '{aspire_version: $v, aspire_commit: $c, sha256_amd64: $a, sha256_arm64: $r, skills_tag: $t, skills_sha: $s,
          copied_from: "msbench/telemetry/common", replaced: {aspire_version: $ov, aspire_commit: $oc}}' \
        > "$tel/track/common/PIN.json"
    rm -rf "$tmp"
}

repin_in() {
    local dir="$1" version="$2" skills_tag="$3" tel="$1/msbench/telemetry" suite_sha task_sha
    write_track_common "$dir" "$version" "$skills_tag"
    git -C "$dir" add msbench/telemetry/track/common
    git -C "$dir" commit -q -m "telemetry: track re-pin to Aspire $version: track/common (T4.5, commit 1 of 3)"
    suite_sha="$(git -C "$dir" rev-parse HEAD)"
    (cd "$tel" && node tools/gen-tasks.mjs track-tasks --suite-sha "$suite_sha" >&2)
    git -C "$dir" add -A msbench/telemetry/track/tasks
    git -C "$dir" commit -q -m "telemetry: track tasks pinned to suite ${suite_sha:0:7} (T4.5, commit 2 of 3)"
    task_sha="$(git -C "$dir" rev-parse HEAD)"
    (cd "$tel" && node tools/gen-tasks.mjs track-dataset --task-sha "$task_sha" >&2)
    git -C "$dir" add msbench/telemetry/track/dataset.jsonl
    git -C "$dir" commit -q -m "telemetry: track dataset pinned to tasks ${task_sha:0:7} (T4.5, commit 3 of 3)"
}

repin() {
    local version="$(need aspire-version "--aspire-version <v|latest>")" skills_tag="$(get_or skills-tag "")"
    [[ "$version" == latest ]] && version="$(latest_daily)"
    say "re-pin to Aspire $version${skills_tag:+, skills $skills_tag}"
    if [[ -n "$(get_or dry-run "")" ]]; then
        local before clone base
        before="$(git -C "$repo" rev-parse HEAD) $(git -C "$repo" status --porcelain | shasum | cut -c1-12)"
        clone="$(mktemp -d)/repo"
        trap 'rm -rf "$(dirname "$clone")"' EXIT
        git clone -q --shared "$repo" "$clone"
        git -C "$clone" checkout -q "$(git -C "$repo" rev-parse HEAD)"
        base="$(git -C "$clone" rev-parse HEAD)"
        repin_in "$clone" "$version" "$skills_tag"
        echo "dry run: these three commits would land on $(git -C "$repo" rev-parse --abbrev-ref HEAD):"
        git -C "$clone" log --format='  %h %s' "$base..HEAD"
        echo "files changed outside msbench/telemetry/track/ (must be none):"
        git -C "$clone" diff --name-only "$base" HEAD | grep -v '^msbench/telemetry/track/' | sed 's/^/  /' || echo "  none"
        echo "track/common: lines that differ from common/ (the pins):"
        diff -r "$clone/msbench/telemetry/common" "$clone/msbench/telemetry/track/common" | grep '^[<>]' | sort | uniq -c | sed 's/^/  /' | head -40
        echo "track/tasks: $(git -C "$clone" diff --name-only "$base" HEAD -- msbench/telemetry/track/tasks | wc -l | tr -d ' ') files; track/dataset.jsonl:"
        sed 's/^/  /' "$clone/msbench/telemetry/track/dataset.jsonl" | cut -c1-200
        rm -rf "$(dirname "$clone")"
        local after; after="$(git -C "$repo" rev-parse HEAD) $(git -C "$repo" status --porcelain | shasum | cut -c1-12)"
        [[ "$before" == "$after" ]] || { echo "this checkout changed during the dry run" >&2; exit 1; }
        echo "dry run done: this checkout is unchanged ($before)"
        return
    fi
    git -C "$repo" diff --quiet && git -C "$repo" diff --cached --quiet || { echo "commit or stash your changes first" >&2; exit 1; }
    git -C "$repo" pull -q --rebase origin main
    repin_in "$repo" "$version" "$skills_tag"
    if [[ -n "$(get_or push "")" ]]; then git -C "$repo" push -q origin HEAD:main; say "pushed"; else
        say "three commits made locally; push them (git push origin HEAD:main) before gate/matrix"; fi
}

# ---- submissions ---------------------------------------------------------------------------------
submit_cells() {
    local round="$1" model_list="$2" repeat="$3"
    for cell in "${cells[@]}"; do
        for model in $model_list; do
            BENCH_TASK=T4.5 "$suite/tools/submit.sh" "${cell%/*}" "${cell#*/}" "$model" "$repeat" "$round" >/dev/null
        done
    done
}

commit_ledger() {
    git -C "$repo" add msbench/telemetry/results/ledger.jsonl
    git -C "$repo" diff --cached --quiet || git -C "$repo" commit -q -m "telemetry: ledger lines for $1 (T4.5)"
}

gate() {
    local run="$(need run "--run")"
    BENCH_DATASET="$(get_or dataset "track/dataset.jsonl")" submit_cells "$run-gate" oracle 1
    commit_ledger "$run-gate"
    WAIT_SECONDS=14000 python3 "$suite/tools/wait.py" --round "$run-gate" --quiet
    (cd "$suite" && python3 tools/collect.py --rounds "$run-gate" >/dev/null)
    local bad
    bad="$(jq -r --arg r "$run-gate" 'select(.round == $r and .reward != 1) | "\(.scenario)/\(.arm) \(.run_id)"' "$suite/results/trials.jsonl")"
    [[ -z "$bad" && "$(jq -r --arg r "$run-gate" 'select(.round == $r) | .run_id' "$suite/results/trials.jsonl" | wc -l)" -ge 12 ]] ||
        { echo "gate failed or incomplete; no model trial submitted:"; echo "$bad"; exit 1; }
    say "gate $run-gate: 12/12 reward 1"
}

matrix() {
    local run="$(need run "--run")" round="$(get_or round "$(get run)")" repeat="$(get_or repeat "5")"
    [[ "$round" == "$run" || "$round" == "$run-"* ]] || { echo "round $round must be $run or $run-<part> (series.py runs)" >&2; exit 2; }
    say "submitting ${#cells[@]} cells x ${#models[@]} models x $repeat in round $round"
    BENCH_DATASET="$(get_or dataset "")" BENCH_EXCLUDED="$(get_or excluded "")" submit_cells "$round" "${models[*]}" "$repeat"
    commit_ledger "$round"
}

finish() {
    local run="$(need run "--run")" rounds="$(get_or rounds "$(get run)")" out="$(get_or series-out "")" include="$(get_or include-excluded "")"
    local drafts="$(get_or drafts-out "$repo/msbench/upstream-issues/tracking")"
    for round in ${rounds//,/ }; do WAIT_SECONDS=14000 python3 "$suite/tools/wait.py" --round "$round" --quiet; done
    commit_ledger "$rounds"
    (cd "$suite" && python3 tools/collect.py --rounds "$rounds" | tail -1)
    series_args=(); [[ -n "$include" ]] && series_args=(--include-excluded "$include" --out "$out")
    (cd "$suite" && python3 tools/series.py "${series_args[@]+"${series_args[@]}"}")
    local series="${out:-$suite/results}/series.jsonl" status=0
    python3 "$suite/tools/track_drafts.py" --series "$series" --run "$run" --out "$drafts" || status=$?
    if [[ $status -eq 3 && -z "$(get_or no-repeat "")" && "$rounds" != *"$run-repeat"* ]]; then
        say "luna time/token flag: one repeat (rule 3)"
        python3 "$suite/tools/track_drafts.py" --series "$series" --run "$run" --repeat-cells | while read -r scenario arm; do
            for a in "$arm" raw; do BENCH_DATASET="$(get_or dataset "")" BENCH_EXCLUDED="$(get_or excluded "")" BENCH_TASK=T4.5 \
                "$suite/tools/submit.sh" "$scenario" "$a" gpt-6-luna 5 "$run-repeat" >/dev/null; done
        done
        commit_ledger "$run-repeat"
        set_opt rounds "$rounds,$run-repeat"; finish
        return
    fi
    [[ $status -eq 0 || $status -eq 3 ]] || exit "$status"
}

case "$cmd" in
    repin) repin ;;
    gate) gate ;;
    matrix) matrix ;;
    finish) finish ;;
    run)
        [[ -n "$(get_or push "")" ]] || { echo "run needs --push (CES fetches the re-pinned tasks from GitHub)" >&2; exit 2; }
        repin
        version="$(jq -r .aspire_version "$suite/track/common/PIN.json")"
        set_opt run "$(get_or run "trk$(python3 -c "b=int('$version'.rsplit('.',2)[-2]); print(f'20{b//1000:02d}{(b%1000)//50:02d}{b%50:02d}')")")"
        set_opt dataset "track/dataset.jsonl"
        gate; matrix; finish ;;
    smoke)
        set_opt aspire-version "$(get_or aspire-version "latest")"; set_opt dry-run 1; repin
        set_opt run t45; set_opt round t45-smoke; set_opt repeat 1; set_opt excluded "T4.5 smoke (ruling 6), not a measurement"
        [[ -n "$(get_or skip-submit "")" ]] || matrix
        set_opt rounds t45-smoke; set_opt include-excluded t45-smoke; set_opt no-repeat 1
        set_opt series-out "$(get_or series-out "$suite/evidence/t45-smoke/series")"
        set_opt drafts-out "$(get_or drafts-out "$suite/evidence/t45-smoke/drafts")"
        finish ;;
    *) sed -n '2,26p' "${BASH_SOURCE[0]}"; exit 2 ;;
esac

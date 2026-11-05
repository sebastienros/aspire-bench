# Evolution Terra pilot: interim assessment

Exactly four original model conditions ran, one per scenario/arm. All native
call events identify `gpt-6.1-terra`; CLI provenance resolves 1.0.99-0.
No replacement/model rerun is authorized for a disappointing result.

| Scenario | Arm | Native agent seconds | Original reward | Current assessment |
|---|---|---:|---:|---|
| F01 live catalog | Raw | 93.1 | 1 | Valid pass |
| F01 live catalog | Aspire | 107.4 | 0 | Grader-scope defect; no-model replay pending |
| M01 schema evolution | Raw | 145.1 | 1 | Valid pass |
| M01 schema evolution | Aspire | 271.9 | 1 | Valid pass |

Both migration solutions passed real schema/default/backfill/280-character/
error checks and preserved all 43 legacy square records, original user,
migration history, database/table identity and unrelated Redis state.
The Aspire sample was slower and more expensive; that result must not be
hidden by rerunning it. No causal mechanism or significance claim is made from
one sample.

Visible M01 Aspire detours included missing EF CLI tooling, a PostgreSQL probe
without its existing password, shell/SQL quoting errors, unavailable Python/
Python3 before using available Node, and repeated EF model/snapshot checks.
The model's own snapshot guard surfaced unwanted identity-table changes before
proceeding; the final protected grader confirmed the original schema/data
identities and only the intended additive migration. A final HTTP check also
caught 405-versus-400 behavior from status-code reexecution and was repaired.

These are observable workflow gaps, not evidence that Aspire's CLI runtime
caused the extra elapsed time. Candidate guidance should identify available
tools, give credential-safe inspection patterns, distinguish database migrations
from Aspire Project-v2 migrations, and require schema/error-contract checks.
No new narrow migration skill is declared faster without a separate treatment.

## F01 grading defect and adjudication procedure

The Aspire agent added the requested catalog API and only its frontend proxy.
The original external verifier passed all live SQL/Redis/type/filter/order/
refresh checks, then rejected missing frontend proxying of **producer writes**.
That exceeds the prompt: only the catalog must work at both origins, and the
baseline frontend never proxied producer import/call routes. Existing producer
write/error behavior must be preserved at its admin origin, not newly invented
at the player origin.

The original reward 0 and native evidence are retained. The scientific response
is a narrow grader correction and an independent replay of the exact saved
four-file model patch in a clean fixture with fresh hidden state. Do not edit
the model's solution, expand the prompt after the fact, resubmit inference,
or label a replayed grader check as another model attempt. Until the replay
passes, corrected success is **not** claimed.

[pilot-results.json](pilot-results.json) preserves exact metrics, tokens/cost,
original reward, hashes, normalization disclosures and assessment state.
[execution-ledger.json](execution-ledger.json) links the immutable task inputs
and original model run IDs.

# Adoption Terra pilot and completed independent regrading

Two original model conditions executed: original skills and actual generated
13.6 skills. Both original native grades were 0 at the input-immutability check.
Those scores and exact saved model patches are retained. Both unchanged saved
solutions now pass the corrected external grader in independent clean local
replays, without any model retry or solution fix. These are separate receipts,
not rewritten cloud-native scores.

| Skill condition | Native agent seconds | Tool calls | Runner cost USD |
|---|---:|---:|---:|
| Original bundle | 412.8 | 86 | 0.2645 |
| Generated 13.6 bundle | 535.7 | 60 | 0.2576 |

Actual model-call events identify Terra and CLI provenance resolves 1.0.99-0
in both. Original selected init/aspireify/orchestration; generated selected
router/init/aspireify/orchestration/monitoring. No protected oracle/grader path
access appears in tool-start arguments. These original execution metrics are
preserved through correctness adjudication. Fewer calls did not
mean less elapsed time; one observation does not establish a generator gain.

The original grader treated **all bytes** of the existing central package
configuration as immutable. Both models made the same compatible addition:
three `Aspire.Hosting.*` entries at 13.6.0, preserving every existing dependency
and property. The user task permits adding orchestration/configuration and
requires preserving application/business code. Normal central package
registration is not a business-code rewrite. The oracle avoided this path by
disabling central package management only for its new AppHost, hiding the
overconstraint.

Review also found a separate invalid assumption: logical connection/resource
name `db` does not require the physical PostgreSQL database to be named `db`.
An AppHost may preserve raw Bingo's physical database `bingo` while exposing
connection key `db`, as the original-skill model did.

## Narrow correction

The v2 grader permits only the three required 13.6.0 Aspire central package
additions; all original properties, dependencies, business sources and guidance
remain protected. Wrong versions, deletion/modification of existing entries
and unrelated dependencies are rejected by regression tests.

The physical database is now read from the actual backend's runtime connection
configuration. Direct SQL still verifies the owned PostgreSQL database and
seeded content; credentials remain container-owned and are not printed.

Both original model patches were replayed byte-exact in clean instances with
fresh state, unchanged business code and only the corrected external grader.
Both returned reward 1/no exception. Runtime SHA-256/Git blobs match the saved
source patch indexes; no reference AppHost or repaired model code was substituted.
Actual SQL/Redis/HTTP/source/package checks passed, including physical database
`bingo` selected from the backend connection. Such replay is grader validation,
not another model sample or new measured agent time.

The original model ran on Linux x86_64; replays ran on Linux aarch64. This is
proof that the saved solution satisfies the corrected contract under the
recorded reconstruction, not a claim that the original cloud verifier emitted 1.
The generated-skill solution's original `WithoutHttpsCertificate()` choice was
preserved. The raw baseline was plaintext and the prompt did not mandate TLS,
so no new requirement is imposed after the fact; production security equivalence
is nevertheless **not** claimed from this functional grade.

[Replay proof](evidence/a01-regrade-v2-report.json),
[review manifest](evidence/grader-v2-review.json), native original result/verifier
files and [exact patches](evidence/model-patches) preserve the adjudication
boundary. Only ephemeral dashboard login query tokens were redacted in separately
named presentation logs; native raw hashes/paths remain in the report. No prompt
expansion or resubmitted inference was used to obtain this conclusion.

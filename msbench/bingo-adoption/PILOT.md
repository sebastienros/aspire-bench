# Adoption Terra pilot: grading review

Two original model conditions executed: original skills and actual generated
13.6 skills. Both original native grades were 0 at the input-immutability check.
Those scores and exact saved model patches are retained; neither is silently
converted into success and no model retry is run.

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

Both original model patches must be replayed byte-exact in clean instances
with fresh state, unchanged business code and only the corrected external
grader. If either fails actual functionality, record it as such; do not repair
the saved solution. Such replay is grader validation, not another model sample
or new measured agent time. Until then corrected completion remains **pending**.

[Review manifest](evidence/grader-v2-review.json), native original result/verifier
files and [exact patches](evidence/model-patches) preserve the adjudication
boundary. No prompt expansion or resubmitted inference is used to get a pass.

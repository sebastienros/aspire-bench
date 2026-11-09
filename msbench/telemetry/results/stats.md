# Significance of the headline comparisons

Exact two-sided Mann-Whitney test on per-trial values. `A vs B` reports the change of A's
median relative to B's. p is the probability of a rank separation at least this large if
both arms came from the same distribution. Cells with 3 trials per arm cannot go below p = 0.10.

| Scenario | Model | A vs B | n | Agent seconds | Input tokens | Cost |
|---|---|---|---|---|---|---|
| read-only | gpt-6-luna | aspire-lean vs raw | 12 vs 9 | -16% (p=0.111) | -25% (p=0.193) | -20% (p=0.082) |
| read-only | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 9 | +141% (p=0.000) | +242% (p=0.000) | +151% (p=0.000) |
| read-only | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 12 vs 6 | -65% (p=0.000) | -78% (p=0.000) | -68% (p=0.000) |
| read-only | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -16% (p=1.000) | -8% (p=0.700) | -7% (p=1.000) |
| read-only | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -9% (p=0.700) | -1% (p=1.000) | -7% (p=1.000) |
| read-only | gpt-6.1-sol | aspire-lean vs raw | 5 vs 3 | +6% (p=1.000) | +32% (p=0.143) | +13% (p=0.571) |
| read-only | gpt-6.1-sol | aspire-skills-mcp vs raw | 3 vs 3 | +14% (p=0.700) | +84% (p=0.100) | +28% (p=0.100) |
| read-only | gpt-6.1-sol | aspire-lean vs aspire-skills-mcp | 5 vs 3 | -7% (p=0.786) | -28% (p=0.393) | -12% (p=0.143) |
| read-only | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | -8% (p=0.485) | +1% (p=1.000) | -16% (p=0.240) |
| read-only | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | +28% (p=0.004) | +125% (p=0.002) | +46% (p=0.002) |
| read-only | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -29% (p=0.004) | -55% (p=0.004) | -42% (p=0.002) |
| read-only | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -27% (p=0.100) | -18% (p=0.100) | -8% (p=0.400) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -17% (p=0.100) | +7% (p=1.000) | +10% (p=0.400) |
| slow-sql | gpt-6-luna | aspire-lean vs raw | 9 vs 12 | -34% (p=0.041) | -48% (p=0.012) | -39% (p=0.012) |
| slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 12 | +97% (p=0.000) | +204% (p=0.000) | +127% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 9 vs 6 | -67% (p=0.000) | -83% (p=0.000) | -73% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -36% (p=0.700) | -62% (p=0.700) | -44% (p=0.700) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -32% (p=0.400) | -9% (p=1.000) | -16% (p=1.000) |
| slow-sql | gpt-6.1-sol | aspire-lean vs raw | 3 vs 3 | -5% (p=0.700) | +13% (p=0.400) | -7% (p=0.700) |
| slow-sql | gpt-6.1-sol | aspire-skills-mcp vs raw | 3 vs 3 | +14% (p=0.100) | +129% (p=0.100) | +55% (p=0.100) |
| slow-sql | gpt-6.1-sol | aspire-lean vs aspire-skills-mcp | 3 vs 3 | -17% (p=0.100) | -51% (p=0.100) | -40% (p=0.100) |
| slow-sql | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | +13% (p=0.024) | +31% (p=0.015) | +5% (p=0.485) |
| slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | +59% (p=0.002) | +239% (p=0.002) | +86% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -29% (p=0.002) | -61% (p=0.002) | -43% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -34% (p=0.100) | -21% (p=0.100) | -5% (p=0.200) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -6% (p=0.700) | +18% (p=0.200) | +10% (p=0.400) |

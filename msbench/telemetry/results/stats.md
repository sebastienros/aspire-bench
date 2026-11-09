# Significance of the headline comparisons

Exact two-sided Mann-Whitney test on per-trial values. `A vs B` reports the change of A's
median relative to B's. p is the probability of a rank separation at least this large if
both arms came from the same distribution. Cells with 3 trials per arm cannot go below p = 0.10.

| Scenario | Model | A vs B | n | Agent seconds | Input tokens | Cost |
|---|---|---|---|---|---|---|
| cold-start | gpt-6-luna | aspire-lean vs raw | 3 vs 3 | +100% (p=0.100) | +291% (p=0.100) | +133% (p=0.100) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-lean | 3 vs 3 | -38% (p=0.100) | -54% (p=0.100) | -51% (p=0.100) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-skills | 3 vs 3 | -2% (p=0.700) | -8% (p=1.000) | -25% (p=0.100) |
| cold-start | gpt-6-luna | aspire-lean-start vs raw | 3 vs 3 | +23% (p=0.100) | +82% (p=0.100) | +14% (p=0.400) |
| cold-start | gpt-6.1-sol | aspire-lean vs raw | 3 vs 3 | +39% (p=0.100) | +95% (p=0.100) | +53% (p=0.100) |
| cold-start | gpt-6.1-sol | aspire-lean-start vs aspire-lean | 3 vs 3 | -3% (p=1.000) | -5% (p=0.400) | -16% (p=0.100) |
| cold-start | gpt-6.1-sol | aspire-lean-start vs aspire-skills | 3 vs 3 | +7% (p=0.400) | -6% (p=0.400) | -15% (p=0.100) |
| cold-start | gpt-6.1-sol | aspire-lean-start vs raw | 3 vs 3 | +35% (p=0.100) | +84% (p=0.100) | +29% (p=0.700) |
| cold-start | gpt-6.1-terra | aspire-lean vs raw | 3 vs 3 | +53% (p=0.100) | +247% (p=0.100) | +78% (p=0.100) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-lean | 3 vs 3 | +7% (p=1.000) | -5% (p=0.100) | -15% (p=0.100) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-skills | 3 vs 3 | +3% (p=0.700) | +40% (p=0.700) | -5% (p=0.100) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs raw | 3 vs 3 | +63% (p=0.100) | +230% (p=0.100) | +51% (p=0.100) |
| read-only | gpt-6-luna | aspire-lean vs raw | 12 vs 9 | -16% (p=0.111) | -25% (p=0.193) | -20% (p=0.082) |
| read-only | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 9 | +141% (p=0.000) | +242% (p=0.000) | +151% (p=0.000) |
| read-only | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 12 vs 6 | -65% (p=0.000) | -78% (p=0.000) | -68% (p=0.000) |
| read-only | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -16% (p=1.000) | -8% (p=0.700) | -7% (p=1.000) |
| read-only | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -9% (p=0.700) | -1% (p=1.000) | -7% (p=1.000) |
| read-only | gpt-6-luna | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -9% (p=1.000) | -4% (p=0.400) | +9% (p=0.700) |
| read-only | gpt-6-luna | aspire-lean-mcp-all vs aspire-lean-mcp-src | 3 vs 3 | -28% (p=0.400) | -14% (p=1.000) | -16% (p=0.700) |
| read-only | gpt-6-luna | aspire-lean-mcp-all vs raw | 3 vs 9 | -16% (p=0.505) | +10% (p=0.282) | -1% (p=0.864) |
| read-only | gpt-6.1-sol | aspire-lean vs raw | 6 vs 6 | -8% (p=0.485) | +25% (p=0.065) | +6% (p=0.589) |
| read-only | gpt-6.1-sol | aspire-skills-mcp vs raw | 6 vs 6 | +3% (p=0.937) | +92% (p=0.002) | +27% (p=0.004) |
| read-only | gpt-6.1-sol | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -11% (p=0.485) | -35% (p=0.093) | -17% (p=0.065) |
| read-only | gpt-6.1-sol | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -5% (p=1.000) | -23% (p=0.400) | -19% (p=0.400) |
| read-only | gpt-6.1-sol | aspire-lean-mcp-all vs raw | 3 vs 6 | -33% (p=0.095) | +31% (p=0.048) | +16% (p=0.095) |
| read-only | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | -8% (p=0.485) | +1% (p=1.000) | -16% (p=0.240) |
| read-only | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | +28% (p=0.004) | +125% (p=0.002) | +46% (p=0.002) |
| read-only | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -29% (p=0.004) | -55% (p=0.004) | -42% (p=0.002) |
| read-only | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -27% (p=0.100) | -18% (p=0.100) | -8% (p=0.400) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -17% (p=0.100) | +7% (p=1.000) | +10% (p=0.400) |
| read-only | gpt-6.1-terra | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -2% (p=0.700) | +2% (p=1.000) | +1% (p=1.000) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-all vs aspire-lean-mcp-src | 4 vs 3 | -22% (p=0.057) | -15% (p=0.400) | -4% (p=0.629) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-all vs raw | 4 vs 6 | -15% (p=0.067) | +45% (p=0.010) | +17% (p=0.114) |
| slow-sql | gpt-6-luna | aspire-lean vs raw | 9 vs 12 | -34% (p=0.041) | -48% (p=0.012) | -39% (p=0.012) |
| slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 12 | +97% (p=0.000) | +204% (p=0.000) | +127% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 9 vs 6 | -67% (p=0.000) | -83% (p=0.000) | -73% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -36% (p=0.700) | -62% (p=0.700) | -44% (p=0.700) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -32% (p=0.400) | -9% (p=1.000) | -16% (p=1.000) |
| slow-sql | gpt-6-luna | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -12% (p=1.000) | -10% (p=0.700) | -9% (p=0.400) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all vs aspire-lean-mcp-src | 3 vs 3 | -32% (p=0.400) | -37% (p=0.100) | -28% (p=0.200) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all vs raw | 3 vs 12 | -28% (p=0.365) | -42% (p=0.101) | -32% (p=0.136) |
| slow-sql | gpt-6.1-sol | aspire-lean vs raw | 6 vs 6 | -6% (p=0.240) | +17% (p=0.041) | -4% (p=0.240) |
| slow-sql | gpt-6.1-sol | aspire-skills-mcp vs raw | 6 vs 6 | +15% (p=0.026) | +122% (p=0.002) | +44% (p=0.002) |
| slow-sql | gpt-6.1-sol | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -18% (p=0.004) | -47% (p=0.002) | -33% (p=0.002) |
| slow-sql | gpt-6.1-sol | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -1% (p=1.000) | -4% (p=0.100) | -3% (p=0.700) |
| slow-sql | gpt-6.1-sol | aspire-lean-mcp-all vs raw | 3 vs 6 | -10% (p=0.381) | +29% (p=0.024) | +7% (p=0.548) |
| slow-sql | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | +13% (p=0.024) | +31% (p=0.015) | +5% (p=0.485) |
| slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | +59% (p=0.002) | +239% (p=0.002) | +86% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -29% (p=0.002) | -61% (p=0.002) | -43% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -34% (p=0.100) | -21% (p=0.100) | -5% (p=0.200) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -6% (p=0.700) | +18% (p=0.200) | +10% (p=0.400) |
| slow-sql | gpt-6.1-terra | aspire-lean-plain vs aspire-lean-src | 3 vs 4 | +1% (p=0.943) | -12% (p=0.400) | -12% (p=0.229) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-all vs aspire-lean-mcp-src | 3 vs 3 | -12% (p=0.400) | -3% (p=1.000) | +2% (p=0.700) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-all vs raw | 3 vs 6 | +13% (p=0.048) | +33% (p=0.024) | +15% (p=0.024) |

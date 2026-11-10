# Significance of the headline comparisons

Exact two-sided Mann-Whitney test on per-trial values. `A vs B` reports the change of A's
median relative to B's. p is the probability of a rank separation at least this large if
both arms came from the same distribution. Cells with 3 trials per arm cannot go below p = 0.10.

| Scenario | Model | A vs B | n | Agent seconds | Input tokens | Cost |
|---|---|---|---|---|---|---|
| cold-start | gpt-6-luna | raw vs raw-check | 3 vs 3 | +3% (p=0.700) | +21% (p=0.400) | -4% (p=1.000) |
| cold-start | gpt-6-luna | aspire-lean vs raw | 3 vs 3 | +94% (p=0.100) | +223% (p=0.100) | +143% (p=0.100) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-lean | 3 vs 3 | -38% (p=0.100) | -54% (p=0.100) | -51% (p=0.100) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-skills | 3 vs 3 | -2% (p=0.700) | -8% (p=1.000) | -25% (p=0.100) |
| cold-start | gpt-6-luna | aspire-lean-start vs raw | 3 vs 3 | +19% (p=0.200) | +50% (p=0.400) | +19% (p=0.700) |
| cold-start | gpt-6.1-sol | raw vs raw-check | 3 vs 3 | -11% (p=0.400) | -24% (p=0.700) | -10% (p=0.700) |
| cold-start | gpt-6.1-sol | aspire-lean vs raw | 3 vs 3 | +56% (p=0.100) | +155% (p=0.100) | +69% (p=0.100) |
| cold-start | gpt-6.1-sol | aspire-lean-start vs aspire-lean | 3 vs 3 | -3% (p=1.000) | -5% (p=0.400) | -16% (p=0.100) |
| cold-start | gpt-6.1-sol | aspire-lean-start vs aspire-skills | 3 vs 3 | +7% (p=0.400) | -6% (p=0.400) | -15% (p=0.100) |
| cold-start | gpt-6.1-sol | aspire-lean-start vs raw | 3 vs 3 | +51% (p=0.100) | +142% (p=0.100) | +43% (p=0.100) |
| cold-start | gpt-6.1-terra | raw vs raw-check | 3 vs 3 | +9% (p=0.700) | +78% (p=0.100) | +19% (p=0.100) |
| cold-start | gpt-6.1-terra | aspire-lean vs raw | 3 vs 3 | +41% (p=0.100) | +95% (p=0.100) | +49% (p=0.100) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-lean | 3 vs 3 | +7% (p=1.000) | -5% (p=0.100) | -15% (p=0.100) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-skills | 3 vs 3 | +3% (p=0.700) | +40% (p=0.700) | -5% (p=0.100) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs raw | 3 vs 3 | +50% (p=0.100) | +86% (p=0.100) | +27% (p=0.100) |
| read-only | gpt-6-luna | raw vs raw-check | 9 vs 9 | -26% (p=0.024) | -25% (p=0.297) | -18% (p=0.258) |
| read-only | gpt-6-luna | aspire-lean vs raw | 12 vs 9 | +15% (p=0.554) | +1% (p=0.808) | -3% (p=0.508) |
| read-only | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 9 | +228% (p=0.000) | +356% (p=0.000) | +206% (p=0.000) |
| read-only | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 12 vs 6 | -65% (p=0.000) | -78% (p=0.000) | -68% (p=0.000) |
| read-only | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -16% (p=1.000) | -8% (p=0.700) | -7% (p=1.000) |
| read-only | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -9% (p=0.700) | -1% (p=1.000) | -7% (p=1.000) |
| read-only | gpt-6-luna | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -9% (p=1.000) | -4% (p=0.400) | +9% (p=0.700) |
| read-only | gpt-6-luna | aspire-lean-mcp-all vs aspire-lean-mcp-src | 3 vs 3 | -28% (p=0.400) | -14% (p=1.000) | -16% (p=0.700) |
| read-only | gpt-6-luna | aspire-lean-mcp-all vs raw | 3 vs 9 | +15% (p=0.282) | +46% (p=0.064) | +20% (p=0.209) |
| read-only | gpt-6.1-sol | raw vs raw-check | 6 vs 6 | -9% (p=0.699) | -2% (p=0.589) | -1% (p=0.818) |
| read-only | gpt-6.1-sol | aspire-lean vs raw | 6 vs 6 | +2% (p=0.699) | +28% (p=0.065) | +7% (p=0.310) |
| read-only | gpt-6.1-sol | aspire-skills-mcp vs raw | 6 vs 6 | +14% (p=0.310) | +96% (p=0.002) | +28% (p=0.002) |
| read-only | gpt-6.1-sol | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -11% (p=0.485) | -35% (p=0.093) | -17% (p=0.065) |
| read-only | gpt-6.1-sol | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -5% (p=1.000) | -23% (p=0.400) | -19% (p=0.400) |
| read-only | gpt-6.1-sol | aspire-lean-mcp-all vs raw | 3 vs 6 | -26% (p=0.167) | +34% (p=0.024) | +17% (p=0.024) |
| read-only | gpt-6.1-terra | raw vs raw-check | 6 vs 6 | -10% (p=0.132) | -1% (p=0.937) | -3% (p=0.394) |
| read-only | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | +2% (p=0.818) | +2% (p=0.818) | -13% (p=0.485) |
| read-only | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | +42% (p=0.002) | +127% (p=0.002) | +50% (p=0.002) |
| read-only | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -29% (p=0.004) | -55% (p=0.004) | -42% (p=0.002) |
| read-only | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -27% (p=0.100) | -18% (p=0.100) | -8% (p=0.400) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -17% (p=0.100) | +7% (p=1.000) | +10% (p=0.400) |
| read-only | gpt-6.1-terra | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -2% (p=0.700) | +2% (p=1.000) | +1% (p=1.000) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-all vs aspire-lean-mcp-src | 4 vs 3 | -22% (p=0.057) | -15% (p=0.400) | -4% (p=0.629) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-all vs raw | 4 vs 6 | -6% (p=0.257) | +47% (p=0.010) | +21% (p=0.067) |
| slow-redis | gpt-6-luna | aspire-lean vs raw | 6 vs 8 | -41% (p=0.005) | -25% (p=0.138) | -29% (p=0.101) |
| slow-redis | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 8 | -22% (p=0.228) | +57% (p=0.005) | +21% (p=0.022) |
| slow-redis | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -23% (p=0.004) | -52% (p=0.002) | -41% (p=0.002) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all vs raw | 6 vs 8 | -20% (p=0.181) | +13% (p=0.295) | -6% (p=0.945) |
| slow-redis | gpt-6.1-sol | aspire-lean vs raw | 3 vs 3 | -45% (p=0.400) | -37% (p=0.400) | -29% (p=0.400) |
| slow-redis | gpt-6.1-sol | aspire-skills-mcp vs raw | 3 vs 3 | +32% (p=0.700) | +105% (p=0.100) | +46% (p=0.100) |
| slow-redis | gpt-6.1-sol | aspire-lean vs aspire-skills-mcp | 3 vs 3 | -58% (p=0.100) | -69% (p=0.100) | -51% (p=0.100) |
| slow-redis | gpt-6.1-sol | aspire-lean-mcp-all vs raw | 3 vs 3 | -60% (p=0.100) | -22% (p=0.700) | -20% (p=0.400) |
| slow-redis | gpt-6.1-terra | aspire-lean vs raw | 3 vs 3 | -68% (p=0.100) | -54% (p=0.100) | -48% (p=0.100) |
| slow-redis | gpt-6.1-terra | aspire-skills-mcp vs raw | 3 vs 3 | -19% (p=1.000) | +24% (p=0.100) | +9% (p=0.200) |
| slow-redis | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 3 vs 3 | -60% (p=0.100) | -63% (p=0.100) | -52% (p=0.100) |
| slow-redis | gpt-6.1-terra | aspire-lean-mcp-all vs raw | 3 vs 3 | -50% (p=0.100) | -17% (p=0.400) | -20% (p=0.100) |
| slow-sql | gpt-6-luna | raw vs raw-check | 9 vs 12 | -36% (p=0.169) | -30% (p=0.148) | -21% (p=0.382) |
| slow-sql | gpt-6-luna | aspire-lean vs raw | 9 vs 9 | +3% (p=0.931) | -26% (p=0.136) | -22% (p=0.050) |
| slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 9 | +210% (p=0.000) | +336% (p=0.000) | +189% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 9 vs 6 | -67% (p=0.000) | -83% (p=0.000) | -73% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -36% (p=0.700) | -62% (p=0.700) | -44% (p=0.700) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -32% (p=0.400) | -9% (p=1.000) | -16% (p=1.000) |
| slow-sql | gpt-6-luna | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -12% (p=1.000) | -10% (p=0.700) | -9% (p=0.400) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all vs aspire-lean-mcp-src | 3 vs 3 | -32% (p=0.400) | -37% (p=0.100) | -28% (p=0.200) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all vs raw | 3 vs 9 | +12% (p=0.864) | -16% (p=0.482) | -14% (p=0.482) |
| slow-sql | gpt-6.1-sol | raw vs raw-check | 6 vs 6 | -15% (p=0.041) | -5% (p=0.240) | -4% (p=0.240) |
| slow-sql | gpt-6.1-sol | aspire-lean vs raw | 6 vs 6 | +11% (p=0.132) | +23% (p=0.009) | -0% (p=0.937) |
| slow-sql | gpt-6.1-sol | aspire-skills-mcp vs raw | 6 vs 6 | +35% (p=0.004) | +134% (p=0.002) | +50% (p=0.002) |
| slow-sql | gpt-6.1-sol | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -18% (p=0.004) | -47% (p=0.002) | -33% (p=0.002) |
| slow-sql | gpt-6.1-sol | aspire-lean-plain vs aspire-lean-src | 3 vs 3 | -1% (p=1.000) | -4% (p=0.100) | -3% (p=0.700) |
| slow-sql | gpt-6.1-sol | aspire-lean-mcp-all vs raw | 3 vs 6 | +6% (p=0.381) | +35% (p=0.024) | +12% (p=0.262) |
| slow-sql | gpt-6.1-terra | raw vs raw-check | 6 vs 6 | -3% (p=0.818) | +5% (p=0.310) | +1% (p=0.818) |
| slow-sql | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | +16% (p=0.221) | +24% (p=0.041) | +4% (p=0.485) |
| slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | +65% (p=0.002) | +221% (p=0.002) | +83% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -29% (p=0.002) | -61% (p=0.002) | -43% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 3 vs 3 | -34% (p=0.100) | -21% (p=0.100) | -5% (p=0.200) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 3 vs 3 | -6% (p=0.700) | +18% (p=0.200) | +10% (p=0.400) |
| slow-sql | gpt-6.1-terra | aspire-lean-plain vs aspire-lean-src | 3 vs 4 | +1% (p=0.943) | -12% (p=0.400) | -12% (p=0.229) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-all vs aspire-lean-mcp-src | 3 vs 3 | -12% (p=0.400) | -3% (p=1.000) | +2% (p=0.700) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-all vs raw | 3 vs 6 | +17% (p=0.298) | +27% (p=0.095) | +14% (p=0.024) |

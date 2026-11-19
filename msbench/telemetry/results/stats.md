# Significance of the headline comparisons

Exact two-sided Mann-Whitney test on per-trial values. `A vs B` reports the change of A's
median relative to B's. p is the probability of a rank separation at least this large if
both arms came from the same distribution. Cells with 3 trials per arm cannot go below p = 0.10.
Each pin (toolchain) has its own table; trials of different pins are never compared.

## Pin 2026-11-09

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

## Pin 2026-11-17

| Scenario | Model | A vs B | n | Agent seconds | Input tokens | Cost |
|---|---|---|---|---|---|---|
| cold-start | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 18 vs 24 | +44% (p=0.000) | +162% (p=0.000) | +106% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 24 | +52% (p=0.000) | +143% (p=0.000) | +93% (p=0.000) |
| cold-start | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 24 | +37% (p=0.000) | +140% (p=0.000) | +98% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 18 vs 6 | +6% (p=0.310) | +9% (p=0.454) | +4% (p=0.494) |
| cold-start | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 6 | +11% (p=0.041) | +1% (p=0.818) | -2% (p=0.818) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-lean (tasks 1479041e) | 12 vs 18 | -13% (p=0.011) | -29% (p=0.003) | -38% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-lean (tasks 916a57ce) | 12 vs 6 | -17% (p=0.001) | -24% (p=0.007) | -33% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-skills | 12 vs 12 | -17% (p=0.000) | -30% (p=0.000) | -38% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-start vs raw | 12 vs 24 | +26% (p=0.000) | +85% (p=0.000) | +28% (p=0.000) |
| cold-start | gpt-6-luna | aspire-cli vs raw | 24 vs 24 | +20% (p=0.000) | +28% (p=0.016) | +18% (p=0.093) |
| cold-start | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 6 vs 12 | +24% (p=0.102) | +55% (p=0.750) | +26% (p=0.820) |
| cold-start | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills | 18 vs 12 | -5% (p=0.079) | -1% (p=0.415) | -0% (p=0.491) |
| cold-start | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 12 | +0% (p=0.682) | -9% (p=0.250) | -6% (p=0.964) |
| cold-start | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 18 | -12% (p=0.022) | -19% (p=0.251) | -9% (p=0.280) |
| cold-start | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -16% (p=0.004) | -13% (p=0.818) | -3% (p=0.589) |
| cold-start | gpt-6-luna | aspire-cli-agents vs aspire-cli | 6 vs 24 | +7% (p=0.677) | -12% (p=0.820) | -14% (p=0.494) |
| cold-start | gpt-6-luna | aspire-skills-agents vs aspire-skills | 6 vs 12 | -17% (p=0.000) | -5% (p=0.553) | -8% (p=0.151) |
| cold-start | gpt-6-luna | aspire-lean-agents-v2 vs aspire-lean (tasks 1479041e) | 6 vs 18 | -3% (p=0.820) | +9% (p=0.974) | +8% (p=1.000) |
| cold-start | gpt-6-luna | aspire-lean-agents-v2 vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -7% (p=0.180) | +18% (p=0.485) | +15% (p=0.818) |
| cold-start | gpt-6-luna | aspire-lean-noorch-agents vs aspire-lean (tasks 1479041e) | 12 vs 18 | -17% (p=0.000) | -46% (p=0.000) | -43% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-noorch-agents vs aspire-lean (tasks 916a57ce) | 12 vs 6 | -21% (p=0.000) | -42% (p=0.000) | -39% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-noorch-agents vs aspire-cli | 12 vs 24 | +0% (p=0.276) | +10% (p=0.237) | -1% (p=0.779) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 18 vs 18 | +34% (p=0.000) | +126% (p=0.000) | +55% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 18 | +53% (p=0.000) | +146% (p=0.000) | +58% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 18 | +36% (p=0.000) | +144% (p=0.000) | +65% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 18 vs 6 | -1% (p=0.204) | -7% (p=0.415) | -6% (p=0.027) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 6 | +13% (p=0.669) | +1% (p=0.937) | -4% (p=0.180) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-lean (tasks 1479041e) | 12 vs 18 | -1% (p=0.908) | -18% (p=0.005) | -19% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-lean (tasks 916a57ce) | 12 vs 6 | -13% (p=0.049) | -24% (p=0.007) | -21% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-skills | 12 vs 12 | -9% (p=0.081) | -19% (p=0.020) | -20% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs raw | 12 vs 18 | +33% (p=0.000) | +87% (p=0.000) | +25% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-cli vs raw | 18 vs 18 | +42% (p=0.000) | +43% (p=0.000) | +5% (p=0.192) |
| cold-start | gpt-6.1-terra | aspire-skills-norouter vs aspire-skills | 6 vs 12 | +5% (p=0.537) | -12% (p=0.083) | -5% (p=0.083) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills | 18 vs 12 | -8% (p=0.003) | -2% (p=0.158) | -2% (p=0.391) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 12 | +5% (p=0.873) | +7% (p=0.964) | +1% (p=0.892) |
| cold-start | gpt-6.1-terra | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 18 | -9% (p=0.090) | -0% (p=0.378) | +3% (p=0.820) |
| cold-start | gpt-6.1-terra | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -20% (p=0.013) | -8% (p=0.132) | +0% (p=0.937) |
| cold-start | gpt-6.1-terra | aspire-cli-agents vs aspire-cli | 6 vs 18 | -8% (p=0.160) | +7% (p=0.012) | +5% (p=0.015) |
| cold-start | gpt-6.1-terra | aspire-skills-agents vs aspire-skills | 6 vs 12 | -17% (p=0.013) | -2% (p=0.385) | +1% (p=0.892) |
| cold-start | gpt-6.1-terra | aspire-lean-agents-v2 vs aspire-lean (tasks 1479041e) | 6 vs 18 | -13% (p=0.000) | +0% (p=0.494) | +2% (p=0.581) |
| cold-start | gpt-6.1-terra | aspire-lean-agents-v2 vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -24% (p=0.002) | -8% (p=0.818) | -0% (p=0.818) |
| cold-start | gpt-6.1-terra | aspire-lean-noorch-agents vs aspire-lean (tasks 1479041e) | 6 vs 18 | -7% (p=0.023) | -27% (p=0.001) | -23% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-noorch-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -18% (p=0.009) | -33% (p=0.004) | -24% (p=0.002) |
| cold-start | gpt-6.1-terra | aspire-lean-noorch-agents vs aspire-cli | 6 vs 18 | -12% (p=0.001) | +16% (p=0.006) | +14% (p=0.000) |
| cold-start | gpt-6.2-sol | aspire-lean vs raw | 12 vs 12 | +4% (p=0.854) | +12% (p=0.630) | +14% (p=0.443) |
| cold-start | gpt-6.2-sol | aspire-lean-start vs aspire-lean | 12 vs 12 | +4% (p=0.139) | +0% (p=0.843) | +12% (p=0.039) |
| cold-start | gpt-6.2-sol | aspire-lean-start vs aspire-skills | 12 vs 6 | -1% (p=0.892) | -6% (p=0.437) | +5% (p=0.494) |
| cold-start | gpt-6.2-sol | aspire-lean-start vs raw | 12 vs 12 | +8% (p=0.452) | +12% (p=0.478) | +28% (p=0.114) |
| cold-start | gpt-6.2-sol | aspire-cli vs raw | 12 vs 12 | +3% (p=0.799) | -36% (p=0.001) | -27% (p=0.008) |
| cold-start | gpt-6.2-sol | aspire-lean vs aspire-skills | 12 vs 6 | -5% (p=0.385) | -6% (p=0.437) | -7% (p=0.437) |
| heldout-cache | claude-opus-5.5 | aspire-lean vs raw | 3 vs 3 | -5% (p=1.000) | +26% (p=0.200) | +4% (p=1.000) |
| heldout-cache | gpt-6-luna | aspire-lean vs raw | 6 vs 6 | -19% (p=0.394) | -4% (p=0.589) | -0% (p=0.485) |
| heldout-cache | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 6 | -39% (p=0.015) | +47% (p=0.093) | +14% (p=0.485) |
| heldout-cache | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +33% (p=0.041) | -35% (p=0.065) | -13% (p=0.485) |
| heldout-cache | gpt-6-luna | aspire-cli vs raw | 6 vs 6 | -26% (p=0.132) | -26% (p=0.240) | -17% (p=0.240) |
| heldout-cache | gpt-6-luna | aspire-lean-agents vs aspire-lean | 6 vs 6 | -18% (p=0.065) | +11% (p=0.394) | -7% (p=0.589) |
| heldout-cache | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | -39% (p=0.065) | -31% (p=0.310) | -26% (p=0.132) |
| heldout-cache | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | -43% (p=0.015) | -6% (p=0.589) | -15% (p=0.394) |
| heldout-cache | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +7% (p=0.589) | -26% (p=0.002) | -13% (p=0.041) |
| heldout-cache | gpt-6.1-terra | aspire-cli vs raw | 6 vs 6 | -49% (p=0.002) | -46% (p=0.065) | -37% (p=0.009) |
| heldout-cache | gpt-6.2-sol | aspire-lean vs raw | 3 vs 3 | -33% (p=0.100) | +55% (p=0.100) | +43% (p=0.100) |
| heldout-slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -19% (p=0.018) | +10% (p=0.808) | -6% (p=0.808) |
| heldout-slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -32% (p=0.032) | -1% (p=1.000) | -17% (p=0.660) |
| heldout-slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 12 vs 12 | -40% (p=0.000) | +49% (p=0.079) | +3% (p=0.566) |
| heldout-slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 12 | +35% (p=0.102) | -26% (p=0.125) | -9% (p=0.385) |
| heldout-slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | +14% (p=0.494) | -33% (p=0.151) | -20% (p=0.335) |
| heldout-slow-sql | gpt-6-luna | aspire-cli vs raw | 12 vs 12 | -47% (p=0.000) | -18% (p=0.091) | -24% (p=0.037) |
| heldout-slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -10% (p=0.437) | -12% (p=0.213) | -6% (p=0.213) |
| heldout-slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -26% (p=0.053) | +8% (p=0.437) | +3% (p=0.892) |
| heldout-slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 12 vs 12 | -14% (p=0.478) | +30% (p=0.010) | +16% (p=0.068) |
| heldout-slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 12 | +5% (p=0.820) | -32% (p=0.003) | -19% (p=0.013) |
| heldout-slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -14% (p=0.335) | -17% (p=0.102) | -11% (p=0.180) |
| heldout-slow-sql | gpt-6.1-terra | aspire-cli vs raw | 12 vs 12 | -29% (p=0.002) | -15% (p=0.078) | -7% (p=0.014) |
| heldout-stuck-orders | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -10% (p=0.437) | +4% (p=0.682) | -3% (p=0.682) |
| heldout-stuck-orders | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -7% (p=0.616) | +12% (p=0.385) | -4% (p=0.892) |
| heldout-stuck-orders | gpt-6-luna | aspire-skills-mcp vs raw | 12 vs 12 | +192% (p=0.000) | +545% (p=0.000) | +266% (p=0.000) |
| heldout-stuck-orders | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 12 | -69% (p=0.000) | -84% (p=0.000) | -73% (p=0.000) |
| heldout-stuck-orders | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -68% (p=0.000) | -83% (p=0.000) | -74% (p=0.000) |
| heldout-stuck-orders | gpt-6-luna | aspire-cli vs raw | 12 vs 12 | +36% (p=0.045) | +64% (p=0.020) | +33% (p=0.008) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -14% (p=0.250) | -10% (p=0.682) | -3% (p=0.437) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -31% (p=0.018) | -8% (p=0.750) | +4% (p=0.964) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-skills-mcp vs raw | 12 vs 12 | -9% (p=0.590) | +32% (p=0.068) | +34% (p=0.012) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 12 | -5% (p=0.397) | -32% (p=0.007) | -27% (p=0.000) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -24% (p=0.010) | -30% (p=0.018) | -23% (p=0.013) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-cli vs raw | 12 vs 12 | -28% (p=0.052) | -34% (p=0.266) | -13% (p=0.319) |
| read-only | claude-opus-5.5 | aspire-lean vs raw | 6 vs 6 | +35% (p=0.065) | +4% (p=0.699) | +6% (p=0.589) |
| read-only | claude-opus-5.5 | aspire-skills-mcp vs raw | 6 vs 6 | +91% (p=0.002) | +83% (p=0.004) | +47% (p=0.004) |
| read-only | claude-opus-5.5 | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -29% (p=0.180) | -43% (p=0.004) | -28% (p=0.004) |
| read-only | gpt-6-luna | aspire-lean vs raw | 6 vs 17 | -15% (p=0.319) | -18% (p=0.256) | -21% (p=0.044) |
| read-only | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 17 | +83% (p=0.003) | +172% (p=0.000) | +119% (p=0.000) |
| read-only | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -53% (p=0.002) | -70% (p=0.002) | -64% (p=0.002) |
| read-only | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 12 vs 12 | -25% (p=0.114) | -10% (p=0.410) | -13% (p=0.410) |
| read-only | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 6 vs 6 | -14% (p=0.132) | +16% (p=0.485) | +13% (p=0.310) |
| read-only | gpt-6-luna | aspire-cli vs raw | 6 vs 17 | +24% (p=0.201) | +45% (p=0.044) | +38% (p=0.135) |
| read-only | gpt-6-luna | aspire-skills-mon vs aspire-skills | 6 vs 12 | -3% (p=1.000) | -18% (p=0.335) | -11% (p=0.437) |
| read-only | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 6 vs 12 | -39% (p=0.032) | -30% (p=0.003) | -29% (p=0.010) |
| read-only | gpt-6-luna | aspire-lean vs aspire-skills | 6 vs 12 | -65% (p=0.000) | -61% (p=0.000) | -57% (p=0.000) |
| read-only | gpt-6-luna | aspire-mcp-compact2 vs aspire-mcp-compact | 6 vs 12 | +10% (p=0.291) | -5% (p=0.553) | -2% (p=0.750) |
| read-only | gpt-6-luna | aspire-mcp-tools8 vs aspire-mcp-src | 6 vs 12 | -12% (p=0.682) | -12% (p=0.125) | -13% (p=0.291) |
| read-only | gpt-6.1-terra | aspire-lean vs raw | 6 vs 18 | -6% (p=0.280) | +5% (p=0.537) | -13% (p=0.033) |
| read-only | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 18 | +40% (p=0.000) | +137% (p=0.000) | +55% (p=0.000) |
| read-only | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -33% (p=0.002) | -56% (p=0.002) | -44% (p=0.002) |
| read-only | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 12 vs 6 | -33% (p=0.000) | -24% (p=0.125) | -8% (p=0.494) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 6 vs 6 | -14% (p=0.015) | +24% (p=0.026) | +13% (p=0.026) |
| read-only | gpt-6.1-terra | aspire-cli vs raw | 6 vs 18 | +36% (p=0.004) | +72% (p=0.001) | +24% (p=0.001) |
| read-only | gpt-6.1-terra | aspire-skills-mon vs aspire-skills | 6 vs 12 | -12% (p=0.213) | -4% (p=0.437) | -0% (p=0.820) |
| read-only | gpt-6.1-terra | aspire-skills-norouter vs aspire-skills | 6 vs 12 | -17% (p=0.125) | -10% (p=0.682) | -8% (p=0.385) |
| read-only | gpt-6.1-terra | aspire-lean vs aspire-skills | 6 vs 12 | -53% (p=0.000) | -47% (p=0.000) | -37% (p=0.000) |
| read-only | gpt-6.1-terra | aspire-mcp-compact2 vs aspire-mcp-compact | 6 vs 12 | -9% (p=0.494) | -14% (p=0.291) | -5% (p=0.291) |
| read-only | gpt-6.2-sol | aspire-lean vs raw | 6 vs 6 | +21% (p=0.093) | +67% (p=0.002) | +62% (p=0.002) |
| read-only | gpt-6.2-sol | aspire-skills-mcp vs raw | 6 vs 6 | +44% (p=0.002) | +172% (p=0.002) | +108% (p=0.002) |
| read-only | gpt-6.2-sol | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -16% (p=0.065) | -39% (p=0.002) | -22% (p=0.002) |
| slow-redis | claude-opus-5.5 | aspire-lean vs raw | 6 vs 6 | -58% (p=0.065) | -24% (p=0.093) | -21% (p=0.009) |
| slow-redis | claude-opus-5.5 | aspire-skills-mcp vs raw | 6 vs 6 | +2% (p=0.818) | +135% (p=0.002) | +85% (p=0.002) |
| slow-redis | claude-opus-5.5 | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -58% (p=0.015) | -68% (p=0.002) | -57% (p=0.002) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 24 vs 42 | -48% (p=0.000) | -24% (p=0.087) | -30% (p=0.000) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 42 | -43% (p=0.151) | -17% (p=0.455) | -26% (p=0.054) |
| slow-redis | gpt-6-luna | aspire-skills-mcp vs raw | 12 vs 42 | -38% (p=0.010) | +52% (p=0.008) | +16% (p=0.370) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 24 vs 12 | -16% (p=0.104) | -50% (p=0.001) | -40% (p=0.001) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -8% (p=0.892) | -45% (p=0.007) | -36% (p=0.007) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 12 vs 12 | -26% (p=0.514) | +6% (p=0.932) | +8% (p=0.514) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all vs aspire-lean-mcp-src | 18 vs 12 | -35% (p=0.185) | -5% (p=0.692) | -5% (p=0.819) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all vs raw | 18 vs 42 | -53% (p=0.000) | +0% (p=0.559) | -14% (p=0.419) |
| slow-redis | gpt-6-luna | aspire-cli vs raw | 12 vs 42 | -49% (p=0.000) | -19% (p=0.719) | -21% (p=0.117) |
| slow-redis | gpt-6-luna | aspire-skills-mon vs aspire-skills | 6 vs 12 | -7% (p=0.892) | -25% (p=0.553) | -27% (p=0.180) |
| slow-redis | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 6 vs 12 | -9% (p=0.494) | +23% (p=0.437) | +5% (p=0.682) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills | 24 vs 12 | -39% (p=0.012) | -35% (p=0.005) | -36% (p=0.001) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 12 | -32% (p=0.213) | -29% (p=0.024) | -33% (p=0.010) |
| slow-redis | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 24 | +43% (p=0.143) | +69% (p=0.025) | +54% (p=0.011) |
| slow-redis | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | +29% (p=0.699) | +56% (p=0.065) | +45% (p=0.041) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-compact2 vs aspire-lean-mcp-compact | 6 vs 12 | +34% (p=0.335) | +20% (p=0.125) | +10% (p=0.250) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-tools8 vs aspire-lean-mcp-src | 6 vs 12 | +16% (p=0.494) | +33% (p=0.682) | +35% (p=0.385) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-conn vs aspire-lean-mcp-all | 6 vs 18 | -27% (p=0.066) | -2% (p=0.820) | -5% (p=0.280) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-hint vs aspire-lean-mcp-all | 6 vs 18 | +19% (p=0.871) | +14% (p=0.415) | +18% (p=0.820) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-step vs aspire-lean-mcp-all | 6 vs 18 | -10% (p=0.199) | -15% (p=0.199) | -5% (p=0.378) |
| slow-redis | gpt-6-luna | aspire-lean-traced vs aspire-lean (tasks 1479041e) | 6 vs 24 | -38% (p=0.065) | -20% (p=0.667) | -15% (p=0.374) |
| slow-redis | gpt-6-luna | aspire-lean-traced vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -44% (p=0.026) | -26% (p=0.065) | -20% (p=0.180) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-traced vs aspire-lean-mcp-all | 6 vs 18 | +30% (p=0.912) | +5% (p=0.626) | +3% (p=0.923) |
| slow-redis | gpt-6-luna | aspire-cli-traced vs aspire-cli | 6 vs 12 | +0% (p=0.892) | +55% (p=0.553) | +22% (p=0.892) |
| slow-redis | gpt-6-luna | raw-otel vs raw | 6 vs 42 | -51% (p=0.054) | -40% (p=0.142) | -32% (p=0.117) |
| slow-redis | gpt-6-luna | aspire-lean-traced vs raw-otel | 6 vs 6 | -33% (p=0.132) | +2% (p=0.818) | -12% (p=0.394) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -60% (p=0.000) | -30% (p=0.010) | -29% (p=0.001) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -67% (p=0.000) | -53% (p=0.001) | -45% (p=0.000) |
| slow-redis | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 12 | -3% (p=0.750) | +52% (p=0.005) | +31% (p=0.003) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 6 | -59% (p=0.004) | -54% (p=0.002) | -46% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 6 | -66% (p=0.002) | -69% (p=0.002) | -58% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-lean-mcp-all vs raw | 6 vs 12 | -65% (p=0.000) | -32% (p=0.013) | -25% (p=0.007) |
| slow-redis | gpt-6.1-terra | aspire-cli vs raw | 12 vs 12 | -2% (p=0.630) | +20% (p=0.078) | +12% (p=0.078) |
| slow-redis | gpt-6.1-terra | aspire-skills-mon vs aspire-skills | 6 vs 6 | -19% (p=0.180) | -7% (p=0.818) | -7% (p=0.589) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills | 6 vs 6 | -72% (p=0.002) | -60% (p=0.002) | -51% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 6 | -76% (p=0.002) | -73% (p=0.002) | -61% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-lean-traced vs aspire-lean (tasks 1479041e) | 6 vs 6 | +51% (p=0.937) | +58% (p=0.132) | +36% (p=0.132) |
| slow-redis | gpt-6.1-terra | aspire-lean-traced vs aspire-lean (tasks 916a57ce) | 6 vs 6 | +81% (p=0.589) | +134% (p=0.026) | +74% (p=0.026) |
| slow-redis | gpt-6.1-terra | aspire-lean-mcp-all-traced vs aspire-lean-mcp-all | 6 vs 6 | -19% (p=0.589) | -4% (p=0.589) | -3% (p=0.937) |
| slow-redis | gpt-6.1-terra | aspire-cli-traced vs aspire-cli | 6 vs 12 | -21% (p=0.102) | -8% (p=0.385) | +6% (p=0.892) |
| slow-redis | gpt-6.1-terra | raw-otel vs raw | 6 vs 12 | -2% (p=1.000) | +4% (p=0.820) | +15% (p=0.437) |
| slow-redis | gpt-6.1-terra | aspire-lean-traced vs raw-otel | 6 vs 6 | -39% (p=0.002) | +5% (p=0.937) | -17% (p=0.065) |
| slow-redis | gpt-6.2-sol | aspire-lean vs raw | 6 vs 6 | -43% (p=0.004) | -3% (p=0.937) | +7% (p=0.485) |
| slow-redis | gpt-6.2-sol | aspire-skills-mcp vs raw | 6 vs 6 | -13% (p=0.485) | +43% (p=0.015) | +31% (p=0.015) |
| slow-redis | gpt-6.2-sol | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -35% (p=0.041) | -32% (p=0.026) | -18% (p=0.132) |
| slow-sql | claude-opus-5.5 | aspire-lean vs raw | 6 vs 6 | +45% (p=0.026) | -7% (p=1.000) | -11% (p=0.699) |
| slow-sql | claude-opus-5.5 | aspire-skills-mcp vs raw | 6 vs 6 | +30% (p=0.065) | +61% (p=0.002) | +36% (p=0.015) |
| slow-sql | claude-opus-5.5 | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +11% (p=0.132) | -42% (p=0.002) | -35% (p=0.004) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 12 vs 30 | -15% (p=0.880) | -13% (p=0.371) | -13% (p=0.301) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 30 | -2% (p=0.694) | -14% (p=0.493) | -19% (p=0.418) |
| slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 12 vs 30 | +74% (p=0.000) | +180% (p=0.000) | +102% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 12 vs 12 | -51% (p=0.000) | -69% (p=0.000) | -57% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -43% (p=0.001) | -69% (p=0.000) | -60% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 12 vs 12 | -15% (p=0.417) | -20% (p=0.089) | -17% (p=0.242) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 6 vs 6 | +30% (p=0.180) | +24% (p=0.180) | +22% (p=0.093) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all vs aspire-lean-mcp-src | 6 vs 6 | +6% (p=0.818) | +12% (p=0.699) | +13% (p=0.394) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all vs raw | 6 vs 30 | -13% (p=0.664) | -4% (p=0.756) | -7% (p=0.442) |
| slow-sql | gpt-6-luna | aspire-cli vs raw | 6 vs 30 | +40% (p=0.009) | +95% (p=0.001) | +46% (p=0.002) |
| slow-sql | gpt-6-luna | aspire-skills-plugin vs aspire-skills | 3 vs 21 | -21% (p=0.142) | -14% (p=0.680) | -12% (p=0.620) |
| slow-sql | gpt-6-luna | aspire-skills-mon vs aspire-skills | 6 vs 21 | +61% (p=0.025) | +22% (p=0.589) | +5% (p=0.512) |
| slow-sql | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 6 vs 21 | -26% (p=0.370) | -30% (p=0.157) | -27% (p=0.140) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills | 12 vs 21 | -47% (p=0.000) | -51% (p=0.000) | -41% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 21 | -39% (p=0.008) | -52% (p=0.000) | -45% (p=0.002) |
| slow-sql | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 12 | +20% (p=0.682) | +11% (p=0.553) | +2% (p=0.964) |
| slow-sql | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | +4% (p=0.937) | +13% (p=0.589) | +11% (p=0.937) |
| slow-sql | gpt-6-luna | aspire-cli-agents vs aspire-cli | 6 vs 6 | -5% (p=0.937) | -22% (p=0.310) | -13% (p=0.485) |
| slow-sql | gpt-6-luna | aspire-skills-agents vs aspire-skills | 6 vs 21 | +28% (p=0.621) | +50% (p=0.110) | +44% (p=0.097) |
| slow-sql | gpt-6-luna | aspire-mcp-compact2 vs aspire-mcp-compact | 6 vs 12 | +26% (p=0.666) | +57% (p=0.494) | +35% (p=0.553) |
| slow-sql | gpt-6-luna | aspire-mcp-tools8 vs aspire-mcp-src | 6 vs 12 | +21% (p=0.067) | +32% (p=0.018) | +19% (p=0.024) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all-conn vs aspire-lean-mcp-all | 6 vs 6 | -27% (p=0.065) | -20% (p=0.132) | -21% (p=0.240) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all-hint vs aspire-lean-mcp-all | 6 vs 6 | -2% (p=0.937) | -9% (p=0.937) | -13% (p=0.818) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all-step vs aspire-lean-mcp-all | 6 vs 6 | -21% (p=0.132) | -27% (p=0.180) | -21% (p=0.240) |
| slow-sql | gpt-6-luna | aspire-lean-noorch-agents vs aspire-lean (tasks 1479041e) | 6 vs 12 | +7% (p=0.820) | -12% (p=0.682) | -10% (p=0.437) |
| slow-sql | gpt-6-luna | aspire-lean-noorch-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -7% (p=0.589) | -10% (p=0.699) | -3% (p=0.699) |
| slow-sql | gpt-6-luna | aspire-lean-noorch-agents vs aspire-cli | 6 vs 6 | -35% (p=0.015) | -60% (p=0.004) | -46% (p=0.004) |
| slow-sql | gpt-6-luna | aspire-lean-traced vs aspire-lean (tasks 1479041e) | 6 vs 12 | -5% (p=0.494) | -4% (p=1.000) | -8% (p=0.892) |
| slow-sql | gpt-6-luna | aspire-lean-traced vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -18% (p=0.310) | -2% (p=1.000) | -0% (p=0.818) |
| slow-sql | gpt-6.1-sol | aspire-lean vs raw | 3 vs 3 | -2% (p=1.000) | +21% (p=0.100) | -9% (p=0.700) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 6 vs 18 | -2% (p=0.350) | +7% (p=0.224) | -10% (p=0.004) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 18 | +20% (p=0.068) | +12% (p=0.090) | +0% (p=0.820) |
| slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 18 | +54% (p=0.000) | +145% (p=0.000) | +67% (p=0.000) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 6 | -37% (p=0.002) | -56% (p=0.002) | -46% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 6 | -22% (p=0.004) | -54% (p=0.002) | -40% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 12 vs 6 | -35% (p=0.000) | -36% (p=0.000) | -12% (p=0.041) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 6 vs 6 | -2% (p=0.485) | +8% (p=0.310) | +6% (p=0.132) |
| slow-sql | gpt-6.1-terra | aspire-cli vs raw | 6 vs 18 | +42% (p=0.000) | +86% (p=0.000) | +32% (p=0.000) |
| slow-sql | gpt-6.1-terra | aspire-skills-mon vs aspire-skills | 6 vs 18 | +2% (p=0.581) | +7% (p=0.871) | +2% (p=0.721) |
| slow-sql | gpt-6.1-terra | aspire-skills-norouter vs aspire-skills | 6 vs 18 | -0% (p=0.770) | -14% (p=0.104) | -5% (p=0.119) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills | 6 vs 18 | -43% (p=0.000) | -52% (p=0.000) | -43% (p=0.000) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 18 | -30% (p=0.006) | -50% (p=0.000) | -36% (p=0.000) |
| slow-sql | gpt-6.1-terra | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 6 | +7% (p=0.026) | +6% (p=0.310) | +12% (p=0.026) |
| slow-sql | gpt-6.1-terra | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -13% (p=0.132) | +1% (p=0.937) | +0% (p=0.818) |
| slow-sql | gpt-6.1-terra | aspire-cli-agents vs aspire-cli | 6 vs 6 | -26% (p=0.065) | -28% (p=0.002) | -9% (p=0.041) |
| slow-sql | gpt-6.1-terra | aspire-skills-agents vs aspire-skills | 6 vs 18 | -35% (p=0.004) | -21% (p=0.056) | -12% (p=0.047) |
| slow-sql | gpt-6.1-terra | aspire-mcp-compact2 vs aspire-mcp-compact | 6 vs 12 | -6% (p=0.601) | +1% (p=0.682) | -9% (p=0.053) |
| slow-sql | gpt-6.2-sol | aspire-lean (tasks 1479041e) vs raw | 6 vs 9 | +2% (p=0.689) | +50% (p=0.005) | +45% (p=0.000) |
| slow-sql | gpt-6.2-sol | aspire-lean (tasks 916a57ce) vs raw | 3 vs 9 | +12% (p=0.109) | +72% (p=0.009) | +63% (p=0.009) |
| slow-sql | gpt-6.2-sol | aspire-skills-mcp vs raw | 6 vs 9 | +19% (p=0.002) | +114% (p=0.000) | +76% (p=0.000) |
| slow-sql | gpt-6.2-sol | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 6 | -14% (p=0.002) | -30% (p=0.002) | -17% (p=0.004) |
| slow-sql | gpt-6.2-sol | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 3 vs 6 | -6% (p=0.095) | -19% (p=0.024) | -7% (p=0.095) |
| stuck-db | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 12 vs 12 | -5% (p=0.514) | +0% (p=0.887) | +3% (p=0.977) |
| stuck-db | gpt-6-luna | aspire-lean vs aspire-skills | 6 vs 12 | -8% (p=0.820) | +8% (p=0.437) | +12% (p=0.616) |
| stuck-db | gpt-6.1-terra | aspire-skills-norouter vs aspire-skills | 6 vs 6 | -1% (p=1.000) | +8% (p=0.485) | +7% (p=0.485) |
| stuck-db | gpt-6.1-terra | aspire-lean vs aspire-skills | 6 vs 6 | -22% (p=0.223) | -22% (p=0.589) | +1% (p=0.937) |

## Pin 2026-11-17, harness vscode

| Scenario | Model | A vs B | n | Agent seconds | Input tokens | Cost |
|---|---|---|---|---|---|---|
| cold-start | gpt-6-luna | aspire-lean vs raw | 6 vs 6 | +14% (p=0.041) | +204% (p=0.002) | +60% (p=0.002) |
| cold-start | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 6 | +5% (p=0.132) | +86% (p=0.015) | +9% (p=0.310) |
| cold-start | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +9% (p=0.180) | +63% (p=0.093) | +46% (p=0.065) |
| cold-start | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | +6% (p=0.180) | +79% (p=0.002) | +37% (p=0.002) |
| cold-start | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | -0% (p=0.937) | +42% (p=0.002) | +27% (p=0.002) |
| cold-start | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +7% (p=0.180) | +26% (p=0.485) | +8% (p=0.310) |
| slow-redis | gpt-6-luna | aspire-lean vs raw | 6 vs 6 | +53% (p=0.002) | +122% (p=0.004) | +82% (p=0.009) |
| slow-redis | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 6 | +27% (p=0.015) | +244% (p=0.004) | +116% (p=0.004) |
| slow-redis | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +21% (p=0.485) | -36% (p=0.180) | -16% (p=0.818) |
| slow-redis | gpt-6.1-terra | aspire-lean vs raw | 6 vs 5 | -4% (p=0.355) | -16% (p=0.537) | -11% (p=0.247) |
| slow-redis | gpt-6.1-terra | aspire-skills-mcp vs raw | 5 vs 5 | +18% (p=0.032) | +108% (p=0.032) | +69% (p=0.032) |
| slow-redis | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 5 | -18% (p=0.009) | -59% (p=0.009) | -47% (p=0.009) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 6 vs 6 | +29% (p=0.180) | +42% (p=0.310) | +24% (p=0.394) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 3 vs 6 | +3% (p=0.714) | +9% (p=0.548) | +3% (p=0.905) |
| slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 5 vs 6 | +72% (p=0.004) | +213% (p=0.004) | +125% (p=0.004) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 5 | -25% (p=0.082) | -55% (p=0.004) | -45% (p=0.429) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 3 vs 5 | -40% (p=0.036) | -65% (p=0.036) | -54% (p=0.036) |
| slow-sql | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | +6% (p=0.002) | -15% (p=0.240) | -16% (p=0.240) |
| slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 5 vs 6 | +12% (p=0.004) | +36% (p=0.009) | +24% (p=0.004) |
| slow-sql | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 5 | -5% (p=0.052) | -38% (p=0.009) | -33% (p=0.004) |

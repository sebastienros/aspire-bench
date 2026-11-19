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

| Scenario | Model | A vs B | n | Agent seconds | Time ratio, 90 % bootstrap | Input tokens | Cost |
|---|---|---|---|---|---|---|---|
| cold-start | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 18 vs 24 | +44% (p=0.000) | 1.44x [1.31-1.55] | +162% (p=0.000) | +106% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 24 | +52% (p=0.000) | 1.52x [1.43-1.63] | +143% (p=0.000) | +93% (p=0.000) |
| cold-start | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 24 | +37% (p=0.000) | 1.37x [1.20-1.52] | +140% (p=0.000) | +98% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 18 vs 6 | +6% (p=0.310) | 1.06x [0.92-1.22] | +9% (p=0.454) | +4% (p=0.494) |
| cold-start | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 6 | +11% (p=0.041) | 1.11x [1.01-1.29] | +1% (p=0.818) | -2% (p=0.818) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-lean (tasks 1479041e) | 12 vs 18 | -13% (p=0.011) | 0.87x [0.83-0.98] | -29% (p=0.003) | -38% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-lean (tasks 916a57ce) | 12 vs 6 | -17% (p=0.001) | 0.83x [0.79-0.90] | -24% (p=0.007) | -33% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-start vs aspire-skills | 12 vs 12 | -17% (p=0.000) | 0.83x [0.67-0.89] | -30% (p=0.000) | -38% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-start vs raw | 12 vs 24 | +26% (p=0.000) | 1.26x [1.22-1.36] | +85% (p=0.000) | +28% (p=0.000) |
| cold-start | gpt-6-luna | aspire-cli vs raw | 24 vs 24 | +20% (p=0.000) | 1.20x [1.17-1.29] | +28% (p=0.016) | +18% (p=0.093) |
| cold-start | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 6 vs 12 | +24% (p=0.102) | 1.24x [0.94-1.58] | +55% (p=0.750) | +26% (p=0.820) |
| cold-start | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills | 18 vs 12 | -5% (p=0.079) | 0.95x [0.75-1.02] | -1% (p=0.415) | -0% (p=0.491) |
| cold-start | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 12 | +0% (p=0.682) | 1.00x [0.80-1.07] | -9% (p=0.250) | -6% (p=0.964) |
| cold-start | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 18 | -12% (p=0.022) | 0.88x [0.78-0.98] | -19% (p=0.251) | -9% (p=0.280) |
| cold-start | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -16% (p=0.004) | 0.84x [0.74-0.90] | -13% (p=0.818) | -3% (p=0.589) |
| cold-start | gpt-6-luna | aspire-cli-agents vs aspire-cli | 6 vs 24 | +7% (p=0.677) | 1.07x [0.90-1.12] | -12% (p=0.820) | -14% (p=0.494) |
| cold-start | gpt-6-luna | aspire-skills-agents vs aspire-skills | 6 vs 12 | -17% (p=0.000) | 0.83x [0.65-0.87] | -5% (p=0.553) | -8% (p=0.151) |
| cold-start | gpt-6-luna | aspire-lean-agents-v2 vs aspire-lean (tasks 1479041e) | 6 vs 18 | -3% (p=0.820) | 0.97x [0.92-1.09] | +9% (p=0.974) | +8% (p=1.000) |
| cold-start | gpt-6-luna | aspire-lean-agents-v2 vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -7% (p=0.180) | 0.93x [0.85-1.01] | +18% (p=0.485) | +15% (p=0.818) |
| cold-start | gpt-6-luna | aspire-lean-noorch-agents vs aspire-lean (tasks 1479041e) | 12 vs 18 | -17% (p=0.000) | 0.83x [0.76-0.92] | -46% (p=0.000) | -43% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-noorch-agents vs aspire-lean (tasks 916a57ce) | 12 vs 6 | -21% (p=0.000) | 0.79x [0.71-0.84] | -42% (p=0.000) | -39% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-noorch-agents vs aspire-cli | 12 vs 24 | +0% (p=0.276) | 1.00x [0.91-1.03] | +10% (p=0.237) | -1% (p=0.779) |
| cold-start | gpt-6-luna | aspire-cli-wait vs aspire-cli-src | 6 vs 6 | +0% (p=0.619) | 1.00x [0.91-1.13] | -3% (p=0.589) | -6% (p=0.699) |
| cold-start | gpt-6-luna | aspire-cli-src vs raw | 6 vs 24 | +23% (p=0.000) | 1.23x [1.13-1.32] | +17% (p=0.210) | +1% (p=0.980) |
| cold-start | gpt-6-luna | aspire-lean-start-wait vs aspire-cli-wait | 6 vs 6 | +1% (p=0.786) | 1.01x [0.90-1.15] | +18% (p=0.132) | +15% (p=0.132) |
| cold-start | gpt-6-luna | aspire-lean-start-wait vs aspire-lean-start | 6 vs 12 | -1% (p=0.538) | 0.99x [0.90-1.07] | -28% (p=0.000) | -15% (p=0.001) |
| cold-start | gpt-6-luna | aspire-lean-noorch-agents-v3 vs aspire-lean-noorch-agents-src | 6 vs 6 | +12% (p=0.065) | 1.12x [1.03-1.24] | -35% (p=0.002) | -12% (p=0.002) |
| cold-start | gpt-6-luna | aspire-lean-mcp vs aspire-lean-start | 6 vs 12 | -5% (p=0.494) | 0.95x [0.90-1.16] | +16% (p=0.032) | +42% (p=0.000) |
| cold-start | gpt-6-luna | aspire-lean-mcp vs aspire-lean (tasks 1479041e) | 6 vs 18 | -17% (p=0.090) | 0.83x [0.79-1.03] | -18% (p=0.974) | -11% (p=0.770) |
| cold-start | gpt-6-luna | aspire-lean-mcp vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -21% (p=0.026) | 0.79x [0.75-0.97] | -12% (p=1.000) | -5% (p=0.394) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 18 vs 18 | +34% (p=0.000) | 1.34x [1.22-1.41] | +126% (p=0.000) | +55% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 18 | +53% (p=0.000) | 1.53x [1.31-1.62] | +146% (p=0.000) | +58% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 18 | +36% (p=0.000) | 1.36x [1.25-1.56] | +144% (p=0.000) | +65% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 18 vs 6 | -1% (p=0.204) | 0.99x [0.86-1.02] | -7% (p=0.415) | -6% (p=0.027) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 6 | +13% (p=0.669) | 1.13x [0.93-1.17] | +1% (p=0.937) | -4% (p=0.180) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-lean (tasks 1479041e) | 12 vs 18 | -1% (p=0.908) | 0.99x [0.93-1.10] | -18% (p=0.005) | -19% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-lean (tasks 916a57ce) | 12 vs 6 | -13% (p=0.049) | 0.87x [0.82-1.02] | -24% (p=0.007) | -21% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs aspire-skills | 12 vs 12 | -9% (p=0.081) | 0.91x [0.85-1.01] | -19% (p=0.020) | -20% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-start vs raw | 12 vs 18 | +33% (p=0.000) | 1.33x [1.21-1.46] | +87% (p=0.000) | +25% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-cli vs raw | 18 vs 18 | +42% (p=0.000) | 1.42x [1.28-1.50] | +43% (p=0.000) | +5% (p=0.192) |
| cold-start | gpt-6.1-terra | aspire-skills-norouter vs aspire-skills | 6 vs 12 | +5% (p=0.537) | 1.05x [0.95-1.10] | -12% (p=0.083) | -5% (p=0.083) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills | 18 vs 12 | -8% (p=0.003) | 0.92x [0.86-0.95] | -2% (p=0.158) | -2% (p=0.391) |
| cold-start | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 12 | +5% (p=0.873) | 1.05x [0.90-1.09] | +7% (p=0.964) | +1% (p=0.892) |
| cold-start | gpt-6.1-terra | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 18 | -9% (p=0.090) | 0.91x [0.86-1.01] | -0% (p=0.378) | +3% (p=0.820) |
| cold-start | gpt-6.1-terra | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -20% (p=0.013) | 0.80x [0.75-0.95] | -8% (p=0.132) | +0% (p=0.937) |
| cold-start | gpt-6.1-terra | aspire-cli-agents vs aspire-cli | 6 vs 18 | -8% (p=0.160) | 0.92x [0.87-1.01] | +7% (p=0.012) | +5% (p=0.015) |
| cold-start | gpt-6.1-terra | aspire-skills-agents vs aspire-skills | 6 vs 12 | -17% (p=0.013) | 0.83x [0.78-0.96] | -2% (p=0.385) | +1% (p=0.892) |
| cold-start | gpt-6.1-terra | aspire-lean-agents-v2 vs aspire-lean (tasks 1479041e) | 6 vs 18 | -13% (p=0.000) | 0.87x [0.81-0.92] | +0% (p=0.494) | +2% (p=0.581) |
| cold-start | gpt-6.1-terra | aspire-lean-agents-v2 vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -24% (p=0.002) | 0.76x [0.71-0.88] | -8% (p=0.818) | -0% (p=0.818) |
| cold-start | gpt-6.1-terra | aspire-lean-noorch-agents vs aspire-lean (tasks 1479041e) | 6 vs 18 | -7% (p=0.023) | 0.93x [0.88-0.98] | -27% (p=0.001) | -23% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-noorch-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -18% (p=0.009) | 0.82x [0.76-0.95] | -33% (p=0.004) | -24% (p=0.002) |
| cold-start | gpt-6.1-terra | aspire-lean-noorch-agents vs aspire-cli | 6 vs 18 | -12% (p=0.001) | 0.88x [0.83-0.94] | +16% (p=0.006) | +14% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-cli-wait vs aspire-cli-src | 6 vs 6 | +8% (p=0.026) | 1.08x [1.04-1.17] | -32% (p=0.002) | -5% (p=0.002) |
| cold-start | gpt-6.1-terra | aspire-cli-src vs raw | 6 vs 18 | +34% (p=0.001) | 1.34x [1.20-1.41] | +43% (p=0.000) | +3% (p=0.224) |
| cold-start | gpt-6.1-terra | aspire-lean-start-wait vs aspire-cli-wait | 6 vs 6 | -9% (p=0.015) | 0.91x [0.84-0.96] | +43% (p=0.002) | +15% (p=0.002) |
| cold-start | gpt-6.1-terra | aspire-lean-start-wait vs aspire-lean-start | 6 vs 12 | -2% (p=0.281) | 0.98x [0.88-1.05] | -26% (p=0.000) | -11% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-mcp vs aspire-lean-start | 6 vs 12 | -1% (p=0.872) | 0.99x [0.90-1.08] | +19% (p=0.151) | +27% (p=0.000) |
| cold-start | gpt-6.1-terra | aspire-lean-mcp vs aspire-lean (tasks 1479041e) | 6 vs 18 | -1% (p=0.758) | 0.99x [0.94-1.08] | -2% (p=0.820) | +3% (p=0.251) |
| cold-start | gpt-6.1-terra | aspire-lean-mcp vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -14% (p=0.294) | 0.86x [0.82-1.01] | -10% (p=0.699) | +1% (p=0.485) |
| cold-start | gpt-6.2-sol | aspire-lean vs raw | 12 vs 12 | +4% (p=0.854) | 1.04x [0.87-1.22] | +12% (p=0.630) | +14% (p=0.443) |
| cold-start | gpt-6.2-sol | aspire-lean-start vs aspire-lean | 12 vs 12 | +4% (p=0.139) | 1.04x [0.98-1.10] | +0% (p=0.843) | +12% (p=0.039) |
| cold-start | gpt-6.2-sol | aspire-lean-start vs aspire-skills | 12 vs 6 | -1% (p=0.892) | 0.99x [0.90-1.13] | -6% (p=0.437) | +5% (p=0.494) |
| cold-start | gpt-6.2-sol | aspire-lean-start vs raw | 12 vs 12 | +8% (p=0.452) | 1.08x [0.90-1.24] | +12% (p=0.478) | +28% (p=0.114) |
| cold-start | gpt-6.2-sol | aspire-cli vs raw | 12 vs 12 | +3% (p=0.799) | 1.03x [0.86-1.22] | -36% (p=0.001) | -27% (p=0.008) |
| cold-start | gpt-6.2-sol | aspire-lean vs aspire-skills | 12 vs 6 | -5% (p=0.385) | 0.95x [0.88-1.08] | -6% (p=0.437) | -7% (p=0.437) |
| cold-start | gpt-6.2-sol | aspire-cli-wait vs aspire-cli-src | 6 vs 6 | +1% (p=1.000) | 1.01x [0.93-1.17] | +10% (p=0.818) | +9% (p=0.937) |
| cold-start | gpt-6.2-sol | aspire-cli-src vs raw | 6 vs 12 | +8% (p=0.964) | 1.08x [0.86-1.23] | -23% (p=0.053) | -17% (p=0.083) |
| cold-start | gpt-6.2-sol | aspire-lean-start-wait vs aspire-cli-wait | 6 vs 6 | -2% (p=0.816) | 0.98x [0.92-1.06] | -1% (p=0.589) | +8% (p=0.485) |
| cold-start | gpt-6.2-sol | aspire-lean-start-wait vs aspire-lean-start | 6 vs 12 | -1% (p=0.494) | 0.99x [0.93-1.05] | -26% (p=0.003) | -24% (p=0.001) |
| cold-start | gpt-6.2-sol | aspire-lean-mcp vs aspire-lean-start | 6 vs 12 | -7% (p=0.023) | 0.93x [0.87-0.98] | -9% (p=0.180) | -18% (p=0.000) |
| cold-start | gpt-6.2-sol | aspire-lean-mcp vs aspire-lean | 6 vs 12 | -3% (p=0.187) | 0.97x [0.91-1.01] | -9% (p=0.250) | -8% (p=0.151) |
| heldout-cache | claude-opus-5.5 | aspire-lean vs raw | 3 vs 3 | -5% (p=1.000) | 0.95x [0.68-1.89] | +26% (p=0.200) | +4% (p=1.000) |
| heldout-cache | gpt-6-luna | aspire-lean vs raw | 6 vs 6 | -19% (p=0.394) | 0.81x [0.61-1.16] | -4% (p=0.589) | -0% (p=0.485) |
| heldout-cache | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 6 | -39% (p=0.015) | 0.61x [0.42-0.87] | +47% (p=0.093) | +14% (p=0.485) |
| heldout-cache | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +33% (p=0.041) | 1.33x [1.04-1.85] | -35% (p=0.065) | -13% (p=0.485) |
| heldout-cache | gpt-6-luna | aspire-cli vs raw | 6 vs 6 | -26% (p=0.132) | 0.74x [0.47-1.01] | -26% (p=0.240) | -17% (p=0.240) |
| heldout-cache | gpt-6-luna | aspire-lean-agents vs aspire-lean | 6 vs 6 | -18% (p=0.065) | 0.82x [0.68-0.97] | +11% (p=0.394) | -7% (p=0.589) |
| heldout-cache | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | -39% (p=0.065) | 0.61x [0.48-0.97] | -31% (p=0.310) | -26% (p=0.132) |
| heldout-cache | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | -43% (p=0.015) | 0.57x [0.44-0.91] | -6% (p=0.589) | -15% (p=0.394) |
| heldout-cache | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +7% (p=0.589) | 1.07x [0.92-1.21] | -26% (p=0.002) | -13% (p=0.041) |
| heldout-cache | gpt-6.1-terra | aspire-cli vs raw | 6 vs 6 | -49% (p=0.002) | 0.51x [0.37-0.80] | -46% (p=0.065) | -37% (p=0.009) |
| heldout-cache | gpt-6.2-sol | aspire-lean vs raw | 3 vs 3 | -33% (p=0.100) | 0.67x [0.61-0.70] | +55% (p=0.100) | +43% (p=0.100) |
| heldout-slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -19% (p=0.018) | 0.81x [0.58-0.98] | +10% (p=0.808) | -6% (p=0.808) |
| heldout-slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -32% (p=0.032) | 0.68x [0.52-0.98] | -1% (p=1.000) | -17% (p=0.660) |
| heldout-slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 12 vs 12 | -40% (p=0.000) | 0.60x [0.52-0.72] | +49% (p=0.079) | +3% (p=0.566) |
| heldout-slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 12 | +35% (p=0.102) | 1.35x [0.98-1.52] | -26% (p=0.125) | -9% (p=0.385) |
| heldout-slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | +14% (p=0.494) | 1.14x [0.87-1.59] | -33% (p=0.151) | -20% (p=0.335) |
| heldout-slow-sql | gpt-6-luna | aspire-cli vs raw | 12 vs 12 | -47% (p=0.000) | 0.53x [0.47-0.65] | -18% (p=0.091) | -24% (p=0.037) |
| heldout-slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -10% (p=0.437) | 0.90x [0.80-1.08] | -12% (p=0.213) | -6% (p=0.213) |
| heldout-slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -26% (p=0.053) | 0.74x [0.62-0.97] | +8% (p=0.437) | +3% (p=0.892) |
| heldout-slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 12 vs 12 | -14% (p=0.478) | 0.86x [0.73-1.15] | +30% (p=0.010) | +16% (p=0.068) |
| heldout-slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 12 | +5% (p=0.820) | 1.05x [0.82-1.22] | -32% (p=0.003) | -19% (p=0.013) |
| heldout-slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -14% (p=0.335) | 0.86x [0.64-1.10] | -17% (p=0.102) | -11% (p=0.180) |
| heldout-slow-sql | gpt-6.1-terra | aspire-cli vs raw | 12 vs 12 | -29% (p=0.002) | 0.71x [0.58-0.88] | -15% (p=0.078) | -7% (p=0.014) |
| heldout-stuck-orders | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -10% (p=0.437) | 0.90x [0.76-1.08] | +4% (p=0.682) | -3% (p=0.682) |
| heldout-stuck-orders | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -7% (p=0.616) | 0.93x [0.75-1.30] | +12% (p=0.385) | -4% (p=0.892) |
| heldout-stuck-orders | gpt-6-luna | aspire-skills-mcp vs raw | 12 vs 12 | +192% (p=0.000) | 2.92x [1.99-4.07] | +545% (p=0.000) | +266% (p=0.000) |
| heldout-stuck-orders | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 12 | -69% (p=0.000) | 0.31x [0.23-0.44] | -84% (p=0.000) | -73% (p=0.000) |
| heldout-stuck-orders | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -68% (p=0.000) | 0.32x [0.23-0.52] | -83% (p=0.000) | -74% (p=0.000) |
| heldout-stuck-orders | gpt-6-luna | aspire-cli vs raw | 12 vs 12 | +36% (p=0.045) | 1.36x [1.13-1.59] | +64% (p=0.020) | +33% (p=0.008) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 6 vs 12 | -14% (p=0.250) | 0.86x [0.70-1.06] | -10% (p=0.682) | -3% (p=0.437) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 12 | -31% (p=0.018) | 0.69x [0.58-0.84] | -8% (p=0.750) | +4% (p=0.964) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-skills-mcp vs raw | 12 vs 12 | -9% (p=0.590) | 0.91x [0.75-1.26] | +32% (p=0.068) | +34% (p=0.012) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 12 | -5% (p=0.397) | 0.95x [0.70-1.17] | -32% (p=0.007) | -27% (p=0.000) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -24% (p=0.010) | 0.76x [0.58-0.91] | -30% (p=0.018) | -23% (p=0.013) |
| heldout-stuck-orders | gpt-6.1-terra | aspire-cli vs raw | 12 vs 12 | -28% (p=0.052) | 0.72x [0.60-0.94] | -34% (p=0.266) | -13% (p=0.319) |
| read-only | claude-opus-5.5 | aspire-lean vs raw | 6 vs 6 | +35% (p=0.065) | 1.35x [1.00-2.30] | +4% (p=0.699) | +6% (p=0.589) |
| read-only | claude-opus-5.5 | aspire-skills-mcp vs raw | 6 vs 6 | +91% (p=0.002) | 1.91x [1.29-2.81] | +83% (p=0.004) | +47% (p=0.004) |
| read-only | claude-opus-5.5 | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -29% (p=0.180) | 0.71x [0.48-1.26] | -43% (p=0.004) | -28% (p=0.004) |
| read-only | gpt-6-luna | aspire-lean vs raw | 6 vs 17 | -15% (p=0.319) | 0.85x [0.56-1.23] | -18% (p=0.256) | -21% (p=0.044) |
| read-only | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 17 | +83% (p=0.003) | 1.83x [1.32-3.44] | +172% (p=0.000) | +119% (p=0.000) |
| read-only | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -53% (p=0.002) | 0.47x [0.24-0.61] | -70% (p=0.002) | -64% (p=0.002) |
| read-only | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 12 vs 12 | -25% (p=0.114) | 0.75x [0.59-1.03] | -10% (p=0.410) | -13% (p=0.410) |
| read-only | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 6 vs 6 | -14% (p=0.132) | 0.86x [0.69-1.01] | +16% (p=0.485) | +13% (p=0.310) |
| read-only | gpt-6-luna | aspire-cli vs raw | 6 vs 17 | +24% (p=0.201) | 1.24x [0.92-1.75] | +45% (p=0.044) | +38% (p=0.135) |
| read-only | gpt-6-luna | aspire-skills-mon vs aspire-skills | 6 vs 12 | -3% (p=1.000) | 0.97x [0.75-1.81] | -18% (p=0.335) | -11% (p=0.437) |
| read-only | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 6 vs 12 | -39% (p=0.032) | 0.61x [0.53-0.86] | -30% (p=0.003) | -29% (p=0.010) |
| read-only | gpt-6-luna | aspire-lean vs aspire-skills | 6 vs 12 | -65% (p=0.000) | 0.35x [0.26-0.48] | -61% (p=0.000) | -57% (p=0.000) |
| read-only | gpt-6-luna | aspire-mcp-compact2 vs aspire-mcp-compact | 6 vs 12 | +10% (p=0.291) | 1.10x [0.92-1.54] | -5% (p=0.553) | -2% (p=0.750) |
| read-only | gpt-6-luna | aspire-mcp-tools8 vs aspire-mcp-src | 6 vs 12 | -12% (p=0.682) | 0.88x [0.69-1.22] | -12% (p=0.125) | -13% (p=0.291) |
| read-only | gpt-6.1-terra | aspire-lean vs raw | 6 vs 18 | -6% (p=0.280) | 0.94x [0.90-0.99] | +5% (p=0.537) | -13% (p=0.033) |
| read-only | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 18 | +40% (p=0.000) | 1.40x [1.21-1.56] | +137% (p=0.000) | +55% (p=0.000) |
| read-only | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -33% (p=0.002) | 0.67x [0.61-0.77] | -56% (p=0.002) | -44% (p=0.002) |
| read-only | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 12 vs 6 | -33% (p=0.000) | 0.67x [0.60-0.78] | -24% (p=0.125) | -8% (p=0.494) |
| read-only | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 6 vs 6 | -14% (p=0.015) | 0.86x [0.76-0.95] | +24% (p=0.026) | +13% (p=0.026) |
| read-only | gpt-6.1-terra | aspire-cli vs raw | 6 vs 18 | +36% (p=0.004) | 1.36x [1.15-1.50] | +72% (p=0.001) | +24% (p=0.001) |
| read-only | gpt-6.1-terra | aspire-skills-mon vs aspire-skills | 6 vs 12 | -12% (p=0.213) | 0.88x [0.68-1.03] | -4% (p=0.437) | -0% (p=0.820) |
| read-only | gpt-6.1-terra | aspire-skills-norouter vs aspire-skills | 6 vs 12 | -17% (p=0.125) | 0.83x [0.73-0.97] | -10% (p=0.682) | -8% (p=0.385) |
| read-only | gpt-6.1-terra | aspire-lean vs aspire-skills | 6 vs 12 | -53% (p=0.000) | 0.47x [0.44-0.53] | -47% (p=0.000) | -37% (p=0.000) |
| read-only | gpt-6.1-terra | aspire-mcp-compact2 vs aspire-mcp-compact | 6 vs 12 | -9% (p=0.494) | 0.91x [0.83-1.07] | -14% (p=0.291) | -5% (p=0.291) |
| read-only | gpt-6.2-sol | aspire-lean vs raw | 6 vs 6 | +21% (p=0.093) | 1.21x [1.01-1.37] | +67% (p=0.002) | +62% (p=0.002) |
| read-only | gpt-6.2-sol | aspire-skills-mcp vs raw | 6 vs 6 | +44% (p=0.002) | 1.44x [1.21-1.62] | +172% (p=0.002) | +108% (p=0.002) |
| read-only | gpt-6.2-sol | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -16% (p=0.065) | 0.84x [0.78-0.95] | -39% (p=0.002) | -22% (p=0.002) |
| slow-redis | claude-opus-5.5 | aspire-lean vs raw | 6 vs 6 | -58% (p=0.065) | 0.42x [0.25-0.82] | -24% (p=0.093) | -21% (p=0.009) |
| slow-redis | claude-opus-5.5 | aspire-skills-mcp vs raw | 6 vs 6 | +2% (p=0.818) | 1.02x [0.55-2.12] | +135% (p=0.002) | +85% (p=0.002) |
| slow-redis | claude-opus-5.5 | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -58% (p=0.015) | 0.42x [0.24-0.76] | -68% (p=0.002) | -57% (p=0.002) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 30 vs 48 | -53% (p=0.000) | 0.47x [0.40-0.62] | -22% (p=0.024) | -30% (p=0.000) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 48 | -42% (p=0.160) | 0.58x [0.47-1.83] | -14% (p=0.366) | -25% (p=0.041) |
| slow-redis | gpt-6-luna | aspire-skills-mcp vs raw | 18 vs 48 | -37% (p=0.002) | 0.63x [0.54-0.81] | +56% (p=0.001) | +18% (p=0.149) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 30 vs 18 | -26% (p=0.007) | 0.74x [0.64-0.91] | -50% (p=0.000) | -40% (p=0.000) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 18 | -8% (p=0.820) | 0.92x [0.75-2.87] | -45% (p=0.001) | -36% (p=0.001) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 12 vs 12 | -26% (p=0.514) | 0.74x [0.54-1.27] | +6% (p=0.932) | +8% (p=0.514) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all vs aspire-lean-mcp-src | 24 vs 12 | -34% (p=0.327) | 0.66x [0.50-1.05] | -5% (p=0.679) | -5% (p=0.856) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all vs raw | 24 vs 48 | -51% (p=0.000) | 0.49x [0.44-0.68] | +3% (p=0.473) | -13% (p=0.430) |
| slow-redis | gpt-6-luna | aspire-cli vs raw | 12 vs 48 | -48% (p=0.000) | 0.52x [0.43-0.72] | -16% (p=0.629) | -21% (p=0.119) |
| slow-redis | gpt-6-luna | aspire-skills-mon vs aspire-skills | 6 vs 12 | -7% (p=0.892) | 0.93x [0.68-1.44] | -25% (p=0.553) | -27% (p=0.180) |
| slow-redis | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 6 vs 12 | -9% (p=0.494) | 0.91x [0.69-1.27] | +23% (p=0.437) | +5% (p=0.682) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills | 30 vs 12 | -46% (p=0.002) | 0.54x [0.42-0.79] | -36% (p=0.001) | -37% (p=0.000) |
| slow-redis | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 12 | -32% (p=0.213) | 0.68x [0.51-1.98] | -29% (p=0.024) | -33% (p=0.010) |
| slow-redis | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 30 | +61% (p=0.071) | 1.61x [1.07-2.22] | +71% (p=0.010) | +56% (p=0.005) |
| slow-redis | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | +29% (p=0.699) | 1.29x [0.49-1.85] | +56% (p=0.065) | +45% (p=0.041) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-compact2 vs aspire-lean-mcp-compact | 6 vs 12 | +34% (p=0.335) | 1.34x [0.83-3.10] | +20% (p=0.125) | +10% (p=0.250) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-tools8 vs aspire-lean-mcp-src | 6 vs 12 | +16% (p=0.494) | 1.16x [0.64-1.88] | +33% (p=0.682) | +35% (p=0.385) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-conn vs aspire-lean-mcp-all | 6 vs 24 | -29% (p=0.038) | 0.71x [0.55-1.71] | -2% (p=0.781) | -5% (p=0.273) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-hint vs aspire-lean-mcp-all | 6 vs 24 | +16% (p=0.667) | 1.16x [0.63-1.49] | +14% (p=0.631) | +18% (p=1.000) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-step vs aspire-lean-mcp-all | 6 vs 24 | -12% (p=0.116) | 0.88x [0.65-1.22] | -15% (p=0.174) | -5% (p=0.321) |
| slow-redis | gpt-6-luna | aspire-skills-mcp-all vs aspire-skills-mcp | 6 vs 18 | +0% (p=0.871) | 1.00x [0.79-1.54] | -20% (p=0.626) | -15% (p=0.626) |
| slow-redis | gpt-6-luna | aspire-skills-mcp-all-conn vs aspire-skills-mcp-all | 6 vs 6 | +32% (p=0.699) | 1.32x [0.70-2.32] | +48% (p=0.093) | +36% (p=0.132) |
| slow-redis | gpt-6-luna | aspire-skills-mcp-all-hint vs aspire-skills-mcp-all | 6 vs 6 | +0% (p=1.000) | 1.00x [0.67-1.56] | +12% (p=0.589) | +9% (p=0.699) |
| slow-redis | gpt-6-luna | aspire-skills-mcp-all-step vs aspire-skills-mcp-all | 6 vs 6 | +6% (p=0.485) | 1.06x [0.70-1.43] | +20% (p=0.937) | +24% (p=0.818) |
| slow-redis | gpt-6-luna | aspire-lean-traced vs aspire-lean (tasks 1479041e) | 12 vs 30 | -22% (p=0.024) | 0.78x [0.63-0.94] | -17% (p=0.518) | -10% (p=0.288) |
| slow-redis | gpt-6-luna | aspire-lean-traced vs aspire-lean (tasks 916a57ce) | 12 vs 6 | -38% (p=0.002) | 0.62x [0.21-0.80] | -25% (p=0.053) | -16% (p=0.067) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-traced vs aspire-lean-mcp-all | 12 vs 24 | +4% (p=0.785) | 1.04x [0.73-1.36] | -1% (p=0.779) | +1% (p=0.908) |
| slow-redis | gpt-6-luna | aspire-cli-traced vs aspire-cli | 6 vs 12 | +0% (p=0.892) | 1.00x [0.53-1.44] | +55% (p=0.553) | +22% (p=0.892) |
| slow-redis | gpt-6-luna | raw-otel vs raw | 6 vs 48 | -50% (p=0.047) | 0.50x [0.37-1.34] | -38% (p=0.115) | -31% (p=0.097) |
| slow-redis | gpt-6-luna | aspire-lean-traced vs raw-otel | 12 vs 6 | -26% (p=0.053) | 0.74x [0.27-0.99] | +4% (p=0.616) | -8% (p=0.494) |
| slow-redis | gpt-6-luna | aspire-lean-connect vs aspire-lean-src | 6 vs 12 | -10% (p=1.000) | 0.90x [0.67-2.24] | +0% (p=0.892) | -6% (p=0.750) |
| slow-redis | gpt-6-luna | aspire-lean-spanrow vs aspire-lean (tasks 1479041e) | 6 vs 30 | +16% (p=0.820) | 1.16x [0.68-3.77] | +4% (p=0.493) | +2% (p=0.576) |
| slow-redis | gpt-6-luna | aspire-lean-spanrow vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -7% (p=0.699) | 0.93x [0.39-2.92] | -5% (p=1.000) | -5% (p=0.699) |
| slow-redis | gpt-6-luna | aspire-lean-spanrow-traced vs aspire-lean-traced | 6 vs 12 | +7% (p=0.892) | 1.07x [0.82-1.26] | +21% (p=0.494) | +16% (p=0.494) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-spanrow vs aspire-lean-mcp-all | 6 vs 24 | +30% (p=0.527) | 1.30x [0.88-1.97] | +7% (p=0.667) | +10% (p=0.900) |
| slow-redis | gpt-6-luna | aspire-lean-mcp-all-spanrow-traced vs aspire-lean-mcp-all-traced | 6 vs 12 | -20% (p=0.600) | 0.80x [0.62-3.10] | -37% (p=0.024) | -28% (p=0.041) |
| slow-redis | gpt-6-luna | aspire-cli-src vs raw | 6 vs 48 | -30% (p=0.169) | 0.70x [0.58-0.99] | +28% (p=0.103) | +3% (p=0.758) |
| slow-redis | gpt-6-luna | aspire-lean-tracetable vs aspire-lean-src | 6 vs 12 | +8% (p=0.480) | 1.08x [0.78-1.63] | +39% (p=0.125) | +17% (p=0.437) |
| slow-redis | gpt-6-luna | aspire-cli-redishint vs aspire-cli-src | 6 vs 6 | -26% (p=0.310) | 0.74x [0.56-2.04] | -9% (p=0.589) | -5% (p=0.818) |
| slow-redis | gpt-6-luna | aspire-skills-redishint vs aspire-skills-src | 6 vs 6 | +10% (p=1.000) | 1.10x [0.46-1.50] | -3% (p=0.937) | -0% (p=0.937) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 6 vs 18 | -60% (p=0.000) | 0.40x [0.26-0.63] | -34% (p=0.003) | -34% (p=0.000) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 18 | -67% (p=0.000) | 0.33x [0.28-0.60] | -56% (p=0.000) | -48% (p=0.000) |
| slow-redis | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 18 | -3% (p=0.454) | 0.97x [0.75-1.08] | +44% (p=0.004) | +23% (p=0.004) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 6 | -59% (p=0.004) | 0.41x [0.27-0.70] | -54% (p=0.002) | -46% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 6 | -66% (p=0.002) | 0.34x [0.28-0.62] | -69% (p=0.002) | -58% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-lean-mcp-all vs raw | 6 vs 18 | -65% (p=0.000) | 0.35x [0.26-0.64] | -35% (p=0.006) | -29% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-cli vs raw | 12 vs 18 | -2% (p=0.325) | 0.98x [0.80-1.06] | +14% (p=0.087) | +5% (p=0.134) |
| slow-redis | gpt-6.1-terra | aspire-skills-mon vs aspire-skills | 6 vs 6 | -19% (p=0.180) | 0.81x [0.62-1.06] | -7% (p=0.818) | -7% (p=0.589) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills | 6 vs 6 | -72% (p=0.002) | 0.28x [0.17-0.50] | -60% (p=0.002) | -51% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 6 | -76% (p=0.002) | 0.24x [0.18-0.45] | -73% (p=0.002) | -61% (p=0.002) |
| slow-redis | gpt-6.1-terra | aspire-lean-traced vs aspire-lean (tasks 1479041e) | 6 vs 6 | +51% (p=0.937) | 1.51x [0.60-2.30] | +58% (p=0.132) | +36% (p=0.132) |
| slow-redis | gpt-6.1-terra | aspire-lean-traced vs aspire-lean (tasks 916a57ce) | 6 vs 6 | +81% (p=0.589) | 1.81x [0.67-2.20] | +134% (p=0.026) | +74% (p=0.026) |
| slow-redis | gpt-6.1-terra | aspire-lean-mcp-all-traced vs aspire-lean-mcp-all | 6 vs 6 | -19% (p=0.589) | 0.81x [0.45-1.70] | -4% (p=0.589) | -3% (p=0.937) |
| slow-redis | gpt-6.1-terra | aspire-cli-traced vs aspire-cli | 6 vs 12 | -21% (p=0.102) | 0.79x [0.73-0.97] | -8% (p=0.385) | +6% (p=0.892) |
| slow-redis | gpt-6.1-terra | raw-otel vs raw | 6 vs 18 | -2% (p=0.721) | 0.98x [0.84-1.16] | -1% (p=0.923) | +9% (p=0.770) |
| slow-redis | gpt-6.1-terra | aspire-lean-traced vs raw-otel | 6 vs 6 | -39% (p=0.002) | 0.61x [0.24-0.70] | +5% (p=0.937) | -17% (p=0.065) |
| slow-redis | gpt-6.1-terra | aspire-cli-src vs raw | 6 vs 18 | -0% (p=0.673) | 1.00x [0.82-1.12] | +24% (p=0.119) | +8% (p=0.454) |
| slow-redis | gpt-6.1-terra | aspire-cli-redishint vs aspire-cli-src | 6 vs 6 | -18% (p=0.240) | 0.82x [0.62-1.05] | -28% (p=0.240) | -15% (p=0.394) |
| slow-redis | gpt-6.1-terra | aspire-skills-redishint vs aspire-skills-src | 6 vs 6 | -18% (p=0.180) | 0.82x [0.63-1.07] | -11% (p=0.589) | -11% (p=0.699) |
| slow-redis | gpt-6.2-sol | aspire-lean vs raw | 6 vs 6 | -43% (p=0.004) | 0.57x [0.36-0.81] | -3% (p=0.937) | +7% (p=0.485) |
| slow-redis | gpt-6.2-sol | aspire-skills-mcp vs raw | 6 vs 6 | -13% (p=0.485) | 0.87x [0.68-1.09] | +43% (p=0.015) | +31% (p=0.015) |
| slow-redis | gpt-6.2-sol | aspire-lean vs aspire-skills-mcp | 6 vs 6 | -35% (p=0.041) | 0.65x [0.42-0.94] | -32% (p=0.026) | -18% (p=0.132) |
| slow-sql | claude-opus-5.5 | aspire-lean vs raw | 6 vs 6 | +45% (p=0.026) | 1.45x [1.14-1.80] | -7% (p=1.000) | -11% (p=0.699) |
| slow-sql | claude-opus-5.5 | aspire-skills-mcp vs raw | 6 vs 6 | +30% (p=0.065) | 1.30x [1.05-1.45] | +61% (p=0.002) | +36% (p=0.015) |
| slow-sql | claude-opus-5.5 | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +11% (p=0.132) | 1.11x [1.00-1.42] | -42% (p=0.002) | -35% (p=0.004) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 18 vs 36 | -17% (p=0.643) | 0.83x [0.73-1.14] | -21% (p=0.052) | -19% (p=0.030) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 6 vs 36 | -1% (p=0.661) | 0.99x [0.76-1.47] | -13% (p=0.471) | -17% (p=0.408) |
| slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 12 vs 36 | +74% (p=0.000) | 1.74x [1.60-2.26] | +186% (p=0.000) | +106% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 18 vs 12 | -52% (p=0.000) | 0.48x [0.40-0.60] | -72% (p=0.000) | -61% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 12 | -43% (p=0.001) | 0.57x [0.41-0.79] | -69% (p=0.000) | -60% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-mcp-compact vs aspire-mcp-src | 12 vs 12 | -15% (p=0.417) | 0.85x [0.69-1.14] | -20% (p=0.089) | -17% (p=0.242) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 6 vs 6 | +30% (p=0.180) | 1.30x [0.89-1.83] | +24% (p=0.180) | +22% (p=0.093) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all vs aspire-lean-mcp-src | 6 vs 6 | +6% (p=0.818) | 1.06x [0.78-1.32] | +12% (p=0.699) | +13% (p=0.394) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all vs raw | 6 vs 36 | -13% (p=0.687) | 0.87x [0.74-1.17] | -2% (p=0.820) | -5% (p=0.516) |
| slow-sql | gpt-6-luna | aspire-cli vs raw | 6 vs 36 | +40% (p=0.007) | 1.40x [1.16-2.54] | +99% (p=0.001) | +50% (p=0.002) |
| slow-sql | gpt-6-luna | aspire-skills-plugin vs aspire-skills | 3 vs 21 | -21% (p=0.142) | 0.79x [0.59-0.90] | -14% (p=0.680) | -12% (p=0.620) |
| slow-sql | gpt-6-luna | aspire-skills-mon vs aspire-skills | 6 vs 21 | +61% (p=0.025) | 1.61x [1.09-2.63] | +22% (p=0.589) | +5% (p=0.512) |
| slow-sql | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 6 vs 21 | -26% (p=0.370) | 0.74x [0.59-1.36] | -30% (p=0.157) | -27% (p=0.140) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills | 18 vs 21 | -49% (p=0.000) | 0.51x [0.41-0.66] | -57% (p=0.000) | -47% (p=0.000) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 21 | -39% (p=0.008) | 0.61x [0.44-0.86] | -52% (p=0.000) | -45% (p=0.002) |
| slow-sql | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 18 | +24% (p=0.415) | 1.24x [0.89-1.55] | +25% (p=0.280) | +13% (p=0.343) |
| slow-sql | gpt-6-luna | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | +4% (p=0.937) | 1.04x [0.69-1.44] | +13% (p=0.589) | +11% (p=0.937) |
| slow-sql | gpt-6-luna | aspire-cli-agents vs aspire-cli | 6 vs 6 | -5% (p=0.937) | 0.95x [0.57-1.68] | -22% (p=0.310) | -13% (p=0.485) |
| slow-sql | gpt-6-luna | aspire-skills-agents vs aspire-skills | 6 vs 21 | +28% (p=0.621) | 1.28x [0.79-1.61] | +50% (p=0.110) | +44% (p=0.097) |
| slow-sql | gpt-6-luna | aspire-mcp-compact2 vs aspire-mcp-compact | 6 vs 12 | +26% (p=0.666) | 1.26x [0.71-1.56] | +57% (p=0.494) | +35% (p=0.553) |
| slow-sql | gpt-6-luna | aspire-mcp-tools8 vs aspire-mcp-src | 6 vs 12 | +21% (p=0.067) | 1.21x [1.01-1.43] | +32% (p=0.018) | +19% (p=0.024) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all-conn vs aspire-lean-mcp-all | 6 vs 6 | -27% (p=0.065) | 0.73x [0.59-1.01] | -20% (p=0.132) | -21% (p=0.240) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all-hint vs aspire-lean-mcp-all | 6 vs 6 | -2% (p=0.937) | 0.98x [0.70-1.34] | -9% (p=0.937) | -13% (p=0.818) |
| slow-sql | gpt-6-luna | aspire-lean-mcp-all-step vs aspire-lean-mcp-all | 6 vs 6 | -21% (p=0.132) | 0.79x [0.64-1.02] | -27% (p=0.180) | -21% (p=0.240) |
| slow-sql | gpt-6-luna | aspire-skills-mcp-all vs aspire-skills-mcp | 6 vs 12 | -6% (p=0.553) | 0.94x [0.66-2.23] | -36% (p=0.213) | -27% (p=0.250) |
| slow-sql | gpt-6-luna | aspire-skills-mcp-all-conn vs aspire-skills-mcp-all | 6 vs 6 | -6% (p=0.818) | 0.94x [0.36-1.68] | -17% (p=0.589) | -2% (p=0.589) |
| slow-sql | gpt-6-luna | aspire-skills-mcp-all-hint vs aspire-skills-mcp-all | 6 vs 6 | -17% (p=0.180) | 0.83x [0.34-1.17] | -18% (p=0.310) | -16% (p=0.394) |
| slow-sql | gpt-6-luna | aspire-skills-mcp-all-step vs aspire-skills-mcp-all | 6 vs 6 | -36% (p=0.041) | 0.64x [0.27-0.97] | -19% (p=0.310) | -17% (p=0.240) |
| slow-sql | gpt-6-luna | aspire-lean-noorch-agents vs aspire-lean (tasks 1479041e) | 6 vs 18 | +10% (p=0.923) | 1.10x [0.77-1.30] | -0% (p=0.923) | -0% (p=0.871) |
| slow-sql | gpt-6-luna | aspire-lean-noorch-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -7% (p=0.589) | 0.93x [0.58-1.21] | -10% (p=0.699) | -3% (p=0.699) |
| slow-sql | gpt-6-luna | aspire-lean-noorch-agents vs aspire-cli | 6 vs 6 | -35% (p=0.015) | 0.65x [0.35-0.81] | -60% (p=0.004) | -46% (p=0.004) |
| slow-sql | gpt-6-luna | aspire-lean-traced vs aspire-lean (tasks 1479041e) | 6 vs 18 | -2% (p=0.626) | 0.98x [0.74-1.19] | +8% (p=0.454) | +2% (p=0.673) |
| slow-sql | gpt-6-luna | aspire-lean-traced vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -18% (p=0.310) | 0.82x [0.57-1.13] | -2% (p=1.000) | -0% (p=0.818) |
| slow-sql | gpt-6-luna | aspire-lean-connect vs aspire-lean-src | 6 vs 12 | -20% (p=0.291) | 0.80x [0.64-1.33] | -19% (p=0.335) | -17% (p=0.250) |
| slow-sql | gpt-6-luna | aspire-lean-spanrow vs aspire-lean (tasks 1479041e) | 6 vs 18 | -8% (p=0.581) | 0.92x [0.72-1.17] | -22% (p=0.090) | -17% (p=0.251) |
| slow-sql | gpt-6-luna | aspire-lean-spanrow vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -23% (p=0.255) | 0.77x [0.56-1.08] | -29% (p=0.132) | -19% (p=0.132) |
| slow-sql | gpt-6-luna | aspire-cli-src vs raw | 6 vs 36 | +20% (p=0.058) | 1.20x [1.02-1.67] | +76% (p=0.001) | +33% (p=0.012) |
| slow-sql | gpt-6-luna | aspire-lean-tracetable vs aspire-lean-src | 6 vs 12 | +12% (p=0.616) | 1.12x [0.81-1.60] | +23% (p=0.250) | +15% (p=0.616) |
| slow-sql | gpt-6-luna | aspire-cli-redishint vs aspire-cli-src | 6 vs 6 | -13% (p=0.589) | 0.87x [0.66-1.34] | -17% (p=0.589) | -11% (p=0.589) |
| slow-sql | gpt-6.1-sol | aspire-lean vs raw | 3 vs 3 | -2% (p=1.000) | 0.98x [0.78-1.17] | +21% (p=0.100) | -9% (p=0.700) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs raw | 6 vs 24 | -0% (p=0.637) | 1.00x [0.92-1.04] | +9% (p=0.116) | -10% (p=0.011) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs raw | 6 vs 24 | +23% (p=0.016) | 1.23x [1.10-1.29] | +15% (p=0.038) | +0% (p=0.980) |
| slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 24 | +57% (p=0.000) | 1.57x [1.41-1.67] | +150% (p=0.000) | +67% (p=0.000) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 6 | -37% (p=0.002) | 0.63x [0.59-0.69] | -56% (p=0.002) | -46% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 6 vs 6 | -22% (p=0.004) | 0.78x [0.71-0.86] | -54% (p=0.002) | -40% (p=0.002) |
| slow-sql | gpt-6.1-terra | aspire-mcp-compact vs aspire-mcp-src | 12 vs 6 | -35% (p=0.000) | 0.65x [0.56-0.74] | -36% (p=0.000) | -12% (p=0.041) |
| slow-sql | gpt-6.1-terra | aspire-lean-mcp-compact vs aspire-lean-mcp-src | 6 vs 6 | -2% (p=0.485) | 0.98x [0.87-1.08] | +8% (p=0.310) | +6% (p=0.132) |
| slow-sql | gpt-6.1-terra | aspire-cli vs raw | 6 vs 24 | +44% (p=0.000) | 1.44x [1.29-1.62] | +90% (p=0.000) | +32% (p=0.000) |
| slow-sql | gpt-6.1-terra | aspire-skills-mon vs aspire-skills | 6 vs 18 | +2% (p=0.581) | 1.02x [0.86-1.33] | +7% (p=0.871) | +2% (p=0.721) |
| slow-sql | gpt-6.1-terra | aspire-skills-norouter vs aspire-skills | 6 vs 18 | -0% (p=0.770) | 1.00x [0.90-1.25] | -14% (p=0.104) | -5% (p=0.119) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 1479041e) vs aspire-skills | 6 vs 18 | -43% (p=0.000) | 0.57x [0.52-0.72] | -52% (p=0.000) | -43% (p=0.000) |
| slow-sql | gpt-6.1-terra | aspire-lean (tasks 916a57ce) vs aspire-skills | 6 vs 18 | -30% (p=0.006) | 0.70x [0.62-0.87] | -50% (p=0.000) | -36% (p=0.000) |
| slow-sql | gpt-6.1-terra | aspire-lean-agents vs aspire-lean (tasks 1479041e) | 6 vs 6 | +7% (p=0.026) | 1.07x [1.02-1.16] | +6% (p=0.310) | +12% (p=0.026) |
| slow-sql | gpt-6.1-terra | aspire-lean-agents vs aspire-lean (tasks 916a57ce) | 6 vs 6 | -13% (p=0.132) | 0.87x [0.82-0.97] | +1% (p=0.937) | +0% (p=0.818) |
| slow-sql | gpt-6.1-terra | aspire-cli-agents vs aspire-cli | 6 vs 6 | -26% (p=0.065) | 0.74x [0.65-1.05] | -28% (p=0.002) | -9% (p=0.041) |
| slow-sql | gpt-6.1-terra | aspire-skills-agents vs aspire-skills | 6 vs 18 | -35% (p=0.004) | 0.65x [0.59-0.85] | -21% (p=0.056) | -12% (p=0.047) |
| slow-sql | gpt-6.1-terra | aspire-mcp-compact2 vs aspire-mcp-compact | 6 vs 12 | -6% (p=0.601) | 0.94x [0.88-1.06] | +1% (p=0.682) | -9% (p=0.053) |
| slow-sql | gpt-6.1-terra | aspire-lean-tracetable vs aspire-lean-src | 6 vs 6 | +9% (p=0.002) | 1.09x [1.05-1.18] | +8% (p=0.240) | +2% (p=0.589) |
| slow-sql | gpt-6.2-sol | aspire-lean (tasks 1479041e) vs raw | 6 vs 9 | +2% (p=0.689) | 1.02x [0.90-1.07] | +50% (p=0.005) | +45% (p=0.000) |
| slow-sql | gpt-6.2-sol | aspire-lean (tasks 916a57ce) vs raw | 3 vs 9 | +12% (p=0.109) | 1.12x [1.00-1.17] | +72% (p=0.009) | +63% (p=0.009) |
| slow-sql | gpt-6.2-sol | aspire-skills-mcp vs raw | 6 vs 9 | +19% (p=0.002) | 1.19x [1.06-1.24] | +114% (p=0.000) | +76% (p=0.000) |
| slow-sql | gpt-6.2-sol | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 6 | -14% (p=0.002) | 0.86x [0.78-0.91] | -30% (p=0.002) | -17% (p=0.004) |
| slow-sql | gpt-6.2-sol | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 3 vs 6 | -6% (p=0.095) | 0.94x [0.91-0.99] | -19% (p=0.024) | -7% (p=0.095) |
| stuck-db | gpt-6-luna | aspire-skills-norouter vs aspire-skills | 12 vs 12 | -5% (p=0.514) | 0.95x [0.74-1.20] | +0% (p=0.887) | +3% (p=0.977) |
| stuck-db | gpt-6-luna | aspire-lean vs aspire-skills | 6 vs 12 | -8% (p=0.820) | 0.92x [0.71-1.32] | +8% (p=0.437) | +12% (p=0.616) |
| stuck-db | gpt-6.1-terra | aspire-skills-norouter vs aspire-skills | 6 vs 6 | -1% (p=1.000) | 0.99x [0.81-1.30] | +8% (p=0.485) | +7% (p=0.485) |
| stuck-db | gpt-6.1-terra | aspire-lean vs aspire-skills | 6 vs 6 | -22% (p=0.223) | 0.78x [0.70-1.36] | -22% (p=0.589) | +1% (p=0.937) |

## Pin 2026-11-17, harness vscode

| Scenario | Model | A vs B | n | Agent seconds | Time ratio, 90 % bootstrap | Input tokens | Cost |
|---|---|---|---|---|---|---|---|
| cold-start | gpt-6-luna | aspire-lean vs raw | 6 vs 6 | +14% (p=0.041) | 1.14x [1.00-1.29] | +204% (p=0.002) | +60% (p=0.002) |
| cold-start | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 6 | +5% (p=0.132) | 1.05x [0.99-1.19] | +86% (p=0.015) | +9% (p=0.310) |
| cold-start | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +9% (p=0.180) | 1.09x [0.96-1.14] | +63% (p=0.093) | +46% (p=0.065) |
| cold-start | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | +6% (p=0.180) | 1.06x [0.98-1.10] | +79% (p=0.002) | +37% (p=0.002) |
| cold-start | gpt-6.1-terra | aspire-skills-mcp vs raw | 6 vs 6 | -0% (p=0.937) | 1.00x [0.95-1.05] | +42% (p=0.002) | +27% (p=0.002) |
| cold-start | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +7% (p=0.180) | 1.07x [0.99-1.10] | +26% (p=0.485) | +8% (p=0.310) |
| slow-redis | gpt-6-luna | aspire-lean vs raw | 6 vs 6 | +53% (p=0.002) | 1.53x [1.31-1.64] | +122% (p=0.004) | +82% (p=0.009) |
| slow-redis | gpt-6-luna | aspire-skills-mcp vs raw | 6 vs 6 | +27% (p=0.015) | 1.27x [1.12-1.71] | +244% (p=0.004) | +116% (p=0.004) |
| slow-redis | gpt-6-luna | aspire-lean vs aspire-skills-mcp | 6 vs 6 | +21% (p=0.485) | 1.21x [0.87-1.34] | -36% (p=0.180) | -16% (p=0.818) |
| slow-redis | gpt-6.1-terra | aspire-lean vs raw | 6 vs 5 | -4% (p=0.355) | 0.96x [0.82-1.09] | -16% (p=0.537) | -11% (p=0.247) |
| slow-redis | gpt-6.1-terra | aspire-skills-mcp vs raw | 5 vs 5 | +18% (p=0.032) | 1.18x [1.05-1.32] | +108% (p=0.032) | +69% (p=0.032) |
| slow-redis | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 5 | -18% (p=0.009) | 0.82x [0.72-0.90] | -59% (p=0.009) | -47% (p=0.009) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs raw | 6 vs 6 | +29% (p=0.180) | 1.29x [0.94-1.74] | +42% (p=0.310) | +24% (p=0.394) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs raw | 3 vs 6 | +3% (p=0.714) | 1.03x [0.87-1.31] | +9% (p=0.548) | +3% (p=0.905) |
| slow-sql | gpt-6-luna | aspire-skills-mcp vs raw | 5 vs 6 | +72% (p=0.004) | 1.72x [1.33-2.05] | +213% (p=0.004) | +125% (p=0.004) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 1479041e) vs aspire-skills-mcp | 6 vs 5 | -25% (p=0.082) | 0.75x [0.57-1.03] | -55% (p=0.004) | -45% (p=0.429) |
| slow-sql | gpt-6-luna | aspire-lean (tasks 916a57ce) vs aspire-skills-mcp | 3 vs 5 | -40% (p=0.036) | 0.60x [0.54-0.77] | -65% (p=0.036) | -54% (p=0.036) |
| slow-sql | gpt-6.1-terra | aspire-lean vs raw | 6 vs 6 | +6% (p=0.002) | 1.06x [1.02-1.11] | -15% (p=0.240) | -16% (p=0.240) |
| slow-sql | gpt-6.1-terra | aspire-skills-mcp vs raw | 5 vs 6 | +12% (p=0.004) | 1.12x [1.08-1.17] | +36% (p=0.009) | +24% (p=0.004) |
| slow-sql | gpt-6.1-terra | aspire-lean vs aspire-skills-mcp | 6 vs 5 | -5% (p=0.052) | 0.95x [0.91-0.99] | -38% (p=0.009) | -33% (p=0.004) |

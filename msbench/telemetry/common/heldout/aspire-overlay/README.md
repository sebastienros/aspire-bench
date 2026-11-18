# Shop application

Requires .NET 10 SDK, Docker, and the Aspire CLI.
`apphost.cs` orchestrates SQL Server (`sql`, database `shopdb`), RabbitMQ
(`messaging`), the API (`api`, which also serves the storefront), and the
order worker (`worker`). ServiceDefaults enables OpenTelemetry and health checks.
The environment supplies `BENCH_RUN_ID`.

Start with `aspire start --apphost apphost.cs --non-interactive --isolated`,
then `aspire wait api` and `aspire wait worker`.

Endpoints are allocated dynamically; `aspire describe` lists them along with
resource state and health.
The Aspire CLI also exposes each resource's console logs and the
OpenTelemetry logs and traces collected from the running application.

The API exposes `GET /api/products`, `POST /api/orders` (JSON
customer/productId/quantity), `GET /api/orders?customer=`, the order page
`GET /api/orders/{number}` with its carrier tracking updates, and the carrier
webhook `POST /api/carrier/events`. SQL Server (database `shopdb`) stores
products, orders and carrier events. Placing an order stores it as `Pending`
and publishes a message on RabbitMQ; the worker consumes it, allocates stock
and marks the order `Confirmed`.

The harness owns cleanup. Never reuse another run's containers, ports, or data.

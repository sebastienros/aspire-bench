# Shop application

Requires .NET 10 SDK, Node 24, Docker Compose, Bash, and curl.
`compose.yaml` defines SQL Server and RabbitMQ; the API (which also serves the
storefront) and the order worker run as local processes.
The environment supplies `COMPOSE_PROJECT_NAME`, `SQL_PORT`, `SQL_PASSWORD`
(for `sa`), `RABBITMQ_PORT`, `RABBITMQ_MANAGEMENT_PORT`, `RABBITMQ_PASSWORD`
(user `shop`), and `API_PORT`.

Start with `bash scripts/start.sh` and wait for it to return. It builds the
solution, starts SQL Server and RabbitMQ, and starts the API and the worker
under a detached supervisor.

Storefront and API: `http://localhost:$API_PORT`.
Process logs are in `.script-state/` (`startup.log`, `api.log`,
`worker.log`); `docker compose ps` and `docker compose logs` cover the
dependencies.

The API exposes `GET /api/products`, `POST /api/orders` (JSON
customer/productId/quantity), `GET /api/orders?customer=`, the order page
`GET /api/orders/{number}` with its carrier tracking updates, and the carrier
webhook `POST /api/carrier/events`. SQL Server (database `shopdb`) stores
products, orders and carrier events. Placing an order stores it as `Pending`
and publishes a message on RabbitMQ; the worker consumes it, allocates stock
and marks the order `Confirmed`.

The harness owns cleanup. Never reuse another run's containers, ports, or data.

| Row | Q1 container | Q2 credentials | Q3 generic recipe | Tool in image | TLS on primary | Works instead | Q4 client span | Q5 health text | Q6 restart | Restart replaces container / data kept |
|---|---|---|---|---|---|---|---|---|---|---|
| postgres | pass | pass: env POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST_AUTH_METHOD; describe values | pass | yes | no |  | pass: postgresql | FAIL | pass | replaced / lost |
| redis | pass | pass: env REDIS_PASSWORD; describe names only | FAIL | yes | yes | `REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -p 6380 PING` | pass: SET | pass | pass | replaced / lost |
| sqlserver | pass | pass: env MSSQL_SA_PASSWORD; describe names only | FAIL | yes | no | `/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -h -1 -Q 'set nocount on; select 1'` | pass: SELECT sys.databases | FAIL | pass | replaced / lost |
| mysql | pass | pass: env MYSQL_ROOT_PASSWORD; describe names only | pass | yes | no |  | pass: Execute | pass | pass | replaced / lost |
| mongo | pass | pass: env MONGO_INITDB_ROOT_PASSWORD, MONGO_INITDB_ROOT_USERNAME; describe values | FAIL | yes | no | nothing listed worked | pass: isMaster admin | FAIL | pass | replaced / not written |
| rabbitmq | pass | pass: env RABBITMQ_DEFAULT_USER, RABBITMQ_DEFAULT_PASS, RABBITMQ_PGP_KEY_ID; describe values | pass | yes | no |  | FAIL: span, no statement (rabbitmq connect) | pass | pass | replaced / lost |
| kafka | pass | n/a (no auth) | FAIL | no | no | `kafka-topics --bootstrap-server localhost:29092 --list` | pass: audit publish | FAIL | pass | replaced / lost |
| nats | pass | FAIL: env none; args; describe names only | FAIL | no (no shell) | no | `host: docker run --rm --network container:{id} docker.io/natsio/nats-box:latest nats --server nats://{arg:--user}:{arg:--pass}@localhost:4222 server check connection` | pass: audit.events publish | FAIL | pass | replaced / n/a |
| storage | pass | n/a (no auth) | FAIL | no | no | `host: az storage container list --connection-string 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:{port:10000}/devstoreaccount1;' -o tsv` | pass: PUT | FAIL | pass | replaced / n/a |
| cosmos | pass | pass: env CERT_SECRET, OTEL_POSTGRES_USER, OTEL_POSTGRES_PASSWORD, ORIGINAL_USER; describe names only | FAIL | yes | no | `curl -ksS https://localhost:8081/ -o /dev/null -w '%{http_code}'` | pass: GET | pass | pass | replaced / n/a |
| qdrant | pass | pass: env QDRANT__SERVICE__API_KEY; describe names only | FAIL | no | no | `host: curl -fsS -H 'api-key: {env:QDRANT__SERVICE__API_KEY}' http://127.0.0.1:{port:6333}/collections` | pass: POST | FAIL | pass | replaced / n/a |
| keycloak | pass | pass: env KC_BOOTSTRAP_ADMIN_USERNAME, KC_BOOTSTRAP_ADMIN_PASSWORD, KC_HTTPS_CERTIFICATE_KEY_FILE; describe values | pass | yes | yes |  | pass: GET | pass | pass | replaced / n/a |
| valkey | pass | pass: env VALKEY_PASSWORD, VALKEY_VERSION; describe names only | pass | yes | no |  | pass: SET | pass | pass | replaced / lost |
| garnet | pass | pass: env GARNET_PASSWORD; describe names only | FAIL | no | no | `host: REDISCLI_AUTH='{env:GARNET_PASSWORD}' redis-cli -p {port:6379} PING` | pass: SET | pass | pass | replaced / lost |
| seq | pass | pass: env SEQ_FIRSTRUN_NOAUTHENTICATION; describe values | pass | yes | no |  | n/a (telemetry sink, no client call to trace) | pass | pass | replaced / n/a |
| elasticsearch | no package at pin: microsoft/aspire 30326eb8 has no Aspire.Hosting.Elasticsearch (git ls-tree 30326eb8 src/) ||||||||||

Health text read from `describe` (Q5; refusing writes not induced):

| Row | Healthy | Hung (docker pause) | Down (docker kill, +15 s) |
|---|---|---|---|
| postgres | state=Running health=Healthy postgres_check=Healthy | state=Running health=Healthy postgres_check=Healthy | state=Exited health=none postgres_check=Unhealthy (Exception while reading from stream) |
| redis | state=Running health=Healthy redis_check=Healthy | state=Running health=Unhealthy redis_check=Unhealthy | state=Exited health=none redis_check=Unhealthy |
| sqlserver | state=Running health=Healthy sqlserver_check=Healthy | state=Running health=Healthy sqlserver_check=Healthy | state=Exited health=none sqlserver_check=Healthy |
| mysql | state=Running health=Healthy mysql_check=Healthy | state=Running health=Unhealthy mysql_check=Unhealthy | state=Exited health=none mysql_check=Healthy |
| mongo | state=Running health=Healthy mongo_check=Healthy | state=Running health=Healthy mongo_check=Healthy | state=Exited health=none mongo_check=Healthy |
| rabbitmq | state=Running health=Healthy rabbitmq_check=Healthy | state=Running health=Unhealthy rabbitmq_check=Unhealthy | state=Exited health=none rabbitmq_check=Healthy |
| kafka | state=Running health=Healthy kafka_check=Healthy | state=Running health=Healthy kafka_check=Healthy | state=Exited health=none kafka_check=Healthy |
| nats | state=Running health=Healthy nats_check=Healthy | state=Running health=Healthy nats_check=Healthy | state=Exited health=none nats_check=Degraded (Connecting to NATS server...) |
| storage | state=Running health=Healthy storage_check=Healthy | state=Running health=Healthy storage_check=Healthy | state=Exited health=none storage_check=Healthy |
| cosmos | state=Running health=Healthy cosmos_emulatorhealth_/ready_200_check=Healthy | state=Running health=Unhealthy cosmos_emulatorhealth_/ready_200_check=Unhealthy (Request to http://localhost:39147/ready timed out) | state=Exited health=none cosmos_emulatorhealth_/ready_200_check=Healthy |
| qdrant | state=Running health=Healthy qdrant_check=Healthy | state=Running health=Healthy qdrant_check=Healthy | state=Exited health=none qdrant_check=Healthy |
| keycloak | state=Running health=Healthy keycloak_management_/health/ready_200_check=Healthy | state=Running health=Unhealthy keycloak_management_/health/ready_200_check=Unhealthy (Request to https://localhost:43977/health/ready timed out) | state=Exited health=none keycloak_management_/health/ready_200_check=Healthy |
| valkey | state=Running health=Healthy valkey_check=Healthy | state=Running health=Unhealthy valkey_check=Unhealthy | state=Exited health=none valkey_check=Healthy |
| garnet | state=Running health=Healthy garnet_check=Healthy | state=Running health=Unhealthy garnet_check=Unhealthy | state=Exited health=none garnet_check=Healthy |
| seq | state=Running health=Healthy seq_http_/health_200_check=Healthy | state=Running health=Unhealthy seq_http_/health_200_check=Unhealthy (Request to http://localhost:37563/health timed out) | state=Exited health=none seq_http_/health_200_check=Healthy |

### Warden as the Only Execution Surface

Warden runs the full local stack (PHP-FPM, nginx, MariaDB, Redis/Valkey,
OpenSearch, Varnish, RabbitMQ) inside Docker. The host machine is not a
supported execution environment for Magento commands. Every `php`,
`composer`, and `bin/magento` invocation must go through `warden shell`
(or `warden debug` when Xdebug is needed). Running these on the host
produces generated code for the wrong PHP version, a composer.lock that
does not match the container, and cache/permission state that only the
container can repair.

### Environment Lifecycle

Warden reads `WARDEN_ENV_NAME` (and other stack flags such as
`WARDEN_REDIS`, `WARDEN_VARNISH`, `WARDEN_RABBITMQ`) from the `.env`
file in the project root. Always run lifecycle commands from that
directory so Warden resolves the correct environment name and
docker-compose overrides.

Use lifecycle commands from the project root:

- `warden env start` — start a stopped environment
- `warden env stop` — stop without destroying volumes
- `warden env down -v` — **destructive**: removes all volumes (DB,
  Redis, search index). Only use when resetting a broken env.
- `warden env config` — print the resolved docker-compose configuration,
  useful when diagnosing service overrides
- `warden env logs --tail 0 -f nginx php-fpm php-debug` — tail the
  request/PHP logs live; `--tail 0` skips the backlog so you only see
  new events

### Shell Access

- `warden shell` — php-fpm container shell. Default entrypoint for all
  Magento CLI work: `bin/magento`, `composer`, `php`, `n98-magerun2`.
- `warden debug` — php-fpm container shell with Xdebug enabled. Use
  this only when stepping through code; Xdebug adds per-request overhead
  so keep it scoped to the debug session.

Both shells drop you into the project root inside the container with
the application user's uid/gid, so file ownership stays correct when
writing to `generated/`, `var/`, or `pub/static`.

### Database

- Import a dump (preferred, streaming):
  `pv /path/to/dump.sql.gz | gunzip -c | warden db import`
  Substitute `cat` for `pv` if the progress bar is unavailable.
- Live connection: `warden db connect` (drops into the MariaDB client)
- Watch the processlist:
  `watch -n 3 "warden db connect -A -e 'show processlist'"`
  Useful for spotting stuck upgrades, runaway indexers, or slow admin
  grids during investigation.

### Redis and Valkey

Magento stores cache and session data in Redis (or Valkey, the Redis
fork some stacks use). Warden exposes both:

- `warden redis` / `warden valkey` — connect to the CLI
- `warden redis flushall` / `warden valkey flushall` — clear every key.
  Reach for this when `bin/magento cache:flush` alone does not resolve
  stale behavior; page-cache entries and session data live outside
  Magento's cache-type registry.
- `warden redis --stat` — continuous stat mode for watching connection
  and memory pressure during load tests.

### Varnish

Varnish sits in front of nginx and caches full-page responses. Operate
it through the container directly:

- Tail activity: `warden env exec -T varnish varnishlog`
- Ban all cached objects (preferred over restart):
  `warden env exec -T varnish varnishadm 'ban req.url ~ .'`

A ban keeps warm connections and lets Varnish rebuild lazily; restarting
the container evicts everything at once and disrupts active traffic.

### Troubleshooting

When commands fail in unexpected ways — `warden shell` hangs, nginx
502s, SSL warnings, DNS resolver errors — run `warden doctor` before
investigating the application. It inspects Docker state, the local
DNS resolver, root CA trust, and mutagen session health. Add `-v`
(`warden doctor -v`) to include environment variables in the output.

### n98-magerun2

n98-magerun2 is pre-installed inside the php-fpm container and is
accessible from any `warden shell` session. Use it for admin tasks and
one-off data operations that would otherwise require a custom PHP script:

- `n98-magerun2 sys:info` — PHP version, Magento edition/version, and
  active modules summary
- `n98-magerun2 config:store:get web/secure/base_url` — read a
  core_config_data value without touching the DB directly
- `n98-magerun2 config:store:set --scope=default --scope-id=0 \
dev/debug/template_hints_storefront 1` — write a config value
- `n98-magerun2 admin:user:create` — interactive wizard to create an
  admin user (avoids writing a throwaway script)
- `n98-magerun2 admin:user:change-password admin@example.com` — reset
  a password without touching the DB
- `n98-magerun2 db:query "SELECT entity_id, sku FROM catalog_product_entity LIMIT 10"` — one-off SQL without opening a full DB session
- `n98-magerun2 cache:clean` — clean specific cache types interactively
- `n98-magerun2 index:list` — show indexer status (same data as
  `bin/magento indexer:status` but in a compact table)

### OpenSearch / Elasticsearch

Magento's catalog and search indexers store data in OpenSearch (or
Elasticsearch on older stacks). Access it through the `opensearch`
container:

- Cluster health:
  `warden env exec -T opensearch curl -s localhost:9200/_cluster/health | python3 -m json.tool`
- List all indices and their document counts:
  `warden env exec -T opensearch curl -s 'localhost:9200/_cat/indices?v'`
- Delete a specific Magento index (forces a full rebuild on next reindex):
  `warden env exec -T opensearch curl -s -X DELETE localhost:9200/magento2_product_1`
- Reset indexers and rebuild from inside `warden shell`:
  ```
  bin/magento indexer:reset catalogsearch_fulltext
  bin/magento indexer:reindex catalogsearch_fulltext
  ```
- Tail OpenSearch logs:
  `warden env logs --tail 0 -f opensearch`

When a reindex fails with a connection error, check cluster health first
before investigating the PHP layer — a yellow or red cluster status (too
few replicas or an out-of-disk node) blocks all write operations.

### RabbitMQ

Magento uses RabbitMQ to process asynchronous operations (bulk API,
Async/Bulk REST, inventory reservations). Inspect and manage queues
through the `rabbitmq` container:

- List all queues and their message counts:
  `warden env exec -T rabbitmq rabbitmqctl list_queues name messages consumers`
- Purge a stale queue (removes all unconsumed messages):
  `warden env exec -T rabbitmq rabbitmqctl purge_queue async.operations.all`
- Run a Magento consumer from inside `warden shell`:
  `bin/magento queue:consumers:start async.operations.all --max-messages=100`
- Run all consumers in the background (development shortcut):
  `bin/magento queue:consumers:start --all &`
- Management UI: available at
  `https://rabbitmq.{WARDEN_ENV_NAME}.test` (default credentials:
  `guest` / `guest`). Useful for inspecting bindings, exchanges, and
  per-queue message rates without CLI commands.

### File Sync (mutagen)

Warden uses mutagen to keep files on the host and inside the php-fpm
container in sync. The sync session can stall after Docker Desktop
restarts, wakes from sleep, or following a `warden env stop/start`
cycle.

- `warden sync list` — show all active sync sessions and their state
- `warden sync monitor` — stream live sync events (Ctrl-C to exit);
  confirms whether the session is actively propagating changes
- `warden sync pause` / `warden sync resume` — temporarily halt sync
  without destroying the session (useful during large file operations)
- `warden sync restart` — stop and recreate all sync sessions; the
  first choice when edits on the host are not reaching the container
- `warden sync reset` — nuke the sync state entirely and force a full
  re-scan; use only when `warden sync restart` does not resolve the
  conflict

If a file edited on the host never appears inside `warden shell`, run
`warden sync monitor` first to confirm sync is live before investigating
file permissions or editor save behaviour.

### Where to Learn More

- `warden help` — top-level command index
- `warden env -h` — environment-subcommand reference
- https://docs.warden.dev/ — canonical documentation

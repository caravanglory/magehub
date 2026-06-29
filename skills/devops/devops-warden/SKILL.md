---
name: devops-warden
description: "Run Magento 2 CLI commands through Warden's Docker environment: warden shell, bin/magento, composer, Redis/Valkey, Varnish, OpenSearch, RabbitMQ, n98-magerun2, mutagen sync, and env lifecycle."
installed_version: 1.1.0
magehub_version: 0.1.13
---

# Warden Local Environment

### Activation

#### Use When

- The task needs Magento CLI, Composer, PHP, database, cache, search, queue, or filesystem-sync work inside a Warden-managed local environment.
- The user mentions warden, Docker local stack, Redis/Valkey, Varnish, OpenSearch/Elasticsearch, RabbitMQ, Mutagen, or n98-magerun2.

#### Do Not Use When

- The project uses DDEV, docker compose, Kubernetes, Adobe Cloud tooling, or another wrapper and no Warden files or commands are present.
- The request is purely code editing and does not require running Magento/runtime commands.

#### Required Inputs

- Project root containing the Warden .env file and the specific service or Magento command to operate.
- Whether the operation is read-only, cache-clearing, data-changing, or destructive.

### Workflow

1. Start with read-only environment discovery from the project root: git status, Warden env name, service status, and relevant logs.
2. Run PHP, Composer, bin/magento, and n98-magerun2 only through warden shell or the project wrapper.
3. Prefer targeted service operations over broad restarts or full cache/storage resets.
4. After any operational change, run the smallest command that proves the service or Magento state recovered.

### Guardrails

- Never run project PHP, Composer, or bin/magento directly on the host when a Warden environment is in use.
- Ask before running warden env down -v, deleting search indices, purging RabbitMQ queues, flushing Redis/Valkey, or importing a database. (approval required)
- Do not run destructive or data-changing commands against production or shared staging environments. (approval required)

### Verification

- For shell/Magento work, report the exact warden shell command or wrapper used and the command exit result.
- For cache/search/queue changes, run a read-only status command afterward, such as cache:status, indexer:status, cluster health, or list_queues.
- For sync issues, confirm warden sync list or warden sync monitor output before and after recovery.

### Output Contract

- Classify commands as read-only, reversible, data-changing, or destructive.
- Report the environment name, service touched, command results, and any approval-sensitive command skipped or executed.

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

### Conventions

- Never run php, composer, or bin/magento on the host — always enter the container first with `warden shell`
  Example: warden shell  # then inside: bin/magento setup:upgrade
  Rationale: The host machine usually has a different PHP version, no Magento extensions (sodium, intl, bcmath at the right versions), and no access to the MySQL/Redis/OpenSearch services on the internal Docker network. Running commands on the host either fails outright or — worse — succeeds with the wrong toolchain and corrupts generated/, var/cache, or composer.lock in ways that only show up later.
- Use `warden debug` when you need Xdebug — `warden shell` starts a non-debug PHP-FPM session
  Example: warden debug  # Xdebug auto-connects to the IDE on the configured port
  Rationale: Xdebug adds measurable overhead on every request, so the default shell omits it. Opening a debug shell is an explicit opt-in that isolates slow paths to the session that actually needs the debugger.
- Pipe gzipped SQL dumps into `warden db import` rather than copying the file into the container first
  Example: pv /path/to/dump.sql.gz | gunzip -c | warden db import
  Rationale: Streaming avoids materializing a multi-gigabyte SQL file inside the db container volume. `pv` also shows a progress bar so long imports are observable; fall back to `cat` when `pv` is not installed.
- Flush Redis/Valkey after configuration changes or cache-related debugging, not just bin/magento cache:flush
  Example: warden redis flushall   # or: warden valkey flushall
  Rationale: bin/magento cache:flush only clears the cache types Magento knows about. Session data, page cache entries written by Varnish/Redis directly, and keys from third-party modules can persist and mask the change you just made. A full flush is the only way to know you're seeing fresh state.
- Invalidate Varnish with a ban rule rather than restarting the container
  Example: warden env exec -T varnish varnishadm 'ban req.url ~ .'
  Rationale: Restarting Varnish drops warm connections and evicts every object. A ban with `req.url ~ .` matches every URL and lets Varnish rebuild lazily as traffic returns, which is faster and less disruptive than a cold start.
- Run `warden env down -v` only when you intentionally want to discard volumes (database, Redis, Elasticsearch data)
  Example: warden env down -v   # destructive — wipes all env volumes
  Rationale: The `-v` flag removes named volumes. Use `warden env stop` for a reversible pause. Reach for `down -v` only when resetting a corrupted DB or freeing disk — and confirm there is no unsaved state first.
- Use n98-magerun2 for admin tasks and one-off data queries instead of writing throwaway scripts
  Example: n98-magerun2 admin:user:create  # interactive; no need for a custom PHP script
  Rationale: n98-magerun2 is available inside warden shell and covers the most frequent admin tasks (user management, config reads/writes, one-off SQL, cache operations) faster and more safely than a raw bin/magento or custom PHP script.
- Run `warden sync monitor` when files edited on the host are not reflected inside the container
  Example: warden sync monitor  # streams mutagen sync events until Ctrl-C
  Rationale: Warden uses mutagen for bidirectional file sync. When the sync session stalls (common after Docker Desktop restarts or long sleep cycles), edited files silently stop reaching the container. `warden sync monitor` confirms whether sync is live; if it shows conflicts or a stalled state, restart with `warden sync restart`.

### Examples

#### Entering the shell and running Magento commands

Canonical flow for any bin/magento, composer, or php task — enter the container, run the command, exit

```bash
#!/usr/bin/env bash
# Enter the php-fpm container and run Magento CLI work inside it.
# NEVER run these commands on the host — the PHP version, extensions,
# and file ownership all differ from the container.

warden shell

# Inside the container:
bin/magento setup:upgrade
bin/magento setup:di:compile
bin/magento setup:static-content:deploy -f en_US
bin/magento cache:flush
bin/magento indexer:reindex

composer install --no-interaction
composer require vendor/module:^1.2

php -v           # confirm the container PHP version
php -m | grep -i intl

exit             # leave the container
```

#### Importing a gzipped database dump

Stream a compressed SQL file into the db container with a progress bar

```bash
#!/usr/bin/env bash
# Stream a gzipped SQL dump into the db container.
# Nothing is written to disk inside the container; pv shows progress.

pv /path/to/dump.sql.gz | gunzip -c | warden db import

# If pv is not available, cat works as a drop-in replacement
# (you lose the progress indicator but the import still streams):
cat /path/to/dump.sql.gz | gunzip -c | warden db import

# Uncompressed dump:
pv /path/to/dump.sql | warden db import

# Watch what the DB is doing during a long import or upgrade:
watch -n 3 "warden db connect -A -e 'show processlist'"
```

#### Redis and Valkey operations

Connect, flush, and monitor Redis or Valkey through Warden

```bash
#!/usr/bin/env bash
# Redis / Valkey operations through Warden.
# Use flushall after config changes or cache-related debugging —
# bin/magento cache:flush does NOT clear keys written directly by
# Varnish, sessions, or third-party modules.

# Interactive CLI
warden redis
warden valkey

# Clear every key
warden redis flushall
warden valkey flushall

# Continuous stats (throughput, memory, connections)
warden redis --stat

# One-off commands via the CLI
warden redis INFO memory
warden redis DBSIZE
warden redis KEYS 'zc:*' | head
```

#### Varnish cache invalidation

Tail Varnish activity and ban all cached objects without restarting the service

```bash
#!/usr/bin/env bash
# Tail Varnish and invalidate its cache without restarting the container.
# A ban lets Varnish rebuild lazily as traffic returns, which is faster
# and less disruptive than `warden env restart varnish`.

# Live request log (hit/miss, backend, response codes)
warden env exec -T varnish varnishlog

# Ban every cached object — matches all URLs
warden env exec -T varnish varnishadm 'ban req.url ~ .'

# Narrower ban — only product pages
warden env exec -T varnish varnishadm 'ban req.url ~ ^/catalog/product/'

# Inspect current ban list
warden env exec -T varnish varnishadm 'ban.list'
```

#### Environment lifecycle and diagnostics

Start, stop, inspect logs, resolve config, and run warden doctor

```bash
#!/usr/bin/env bash
# Start, stop, inspect, and diagnose a Warden environment.

# Start / stop (reversible)
warden env start
warden env stop

# Full teardown — REMOVES VOLUMES (db, redis, search index).
# Use only when resetting a corrupted environment.
warden env down -v

# Resolved docker-compose configuration for the current env
warden env config

# Tail nginx + php logs live (skip backlog with --tail 0)
warden env logs --tail 0 -f nginx php-fpm php-debug

# Environment and Docker diagnostics — run this FIRST when something
# behaves unexpectedly (shell hangs, 502s, SSL warnings, DNS errors).
warden doctor
warden doctor -v   # also prints environment variables

# Command reference
warden help
warden env -h
```

#### n98-magerun2 common commands

Admin user management, config reads, one-off SQL queries, and cache operations via n98-magerun2 inside warden shell

```bash
#!/usr/bin/env bash
# n98-magerun2 commands inside warden shell.
# Run these from inside the php-fpm container (warden shell),
# not on the host. n98-magerun2 is pre-installed in the container.

# ── Environment info ─────────────────────────────────────────────────────────

# PHP version, Magento edition/version, enabled modules, base URL
n98-magerun2 sys:info

# List all enabled modules with their versions
n98-magerun2 module:list --status=enabled

# ── Configuration reads and writes ───────────────────────────────────────────

# Read a single config value from core_config_data
n98-magerun2 config:store:get web/secure/base_url
n98-magerun2 config:store:get --scope=websites --scope-id=1 web/unsecure/base_url

# Write a config value (no bin/magento cache:flush required — magerun does it)
n98-magerun2 config:store:set --scope=default --scope-id=0 \
  dev/debug/template_hints_storefront 1

# Remove a config override and fall back to the default
n98-magerun2 config:store:delete dev/debug/template_hints_storefront

# ── Admin users ───────────────────────────────────────────────────────────────

# Interactive wizard — creates a new admin user without a throwaway script
n98-magerun2 admin:user:create

# Reset an admin password interactively
n98-magerun2 admin:user:change-password admin@example.com

# List all admin users
n98-magerun2 admin:user:list

# ── One-off database queries ──────────────────────────────────────────────────

# Run a SELECT without opening a full DB session
n98-magerun2 db:query "SELECT entity_id, sku, type_id FROM catalog_product_entity LIMIT 10"

# Check what base URLs are configured across all scopes
n98-magerun2 db:query \
  "SELECT scope, scope_id, value FROM core_config_data WHERE path = 'web/secure/base_url'"

# ── Cache ─────────────────────────────────────────────────────────────────────

# Interactive cache-type picker — select which types to clean
n98-magerun2 cache:clean

# Flush everything (equivalent to bin/magento cache:flush)
n98-magerun2 cache:flush

# List cache types and their status
n98-magerun2 cache:list

# ── Indexers ──────────────────────────────────────────────────────────────────

# Compact status table — equivalent to bin/magento indexer:status
n98-magerun2 index:list

# Reindex all (same as bin/magento indexer:reindex without specifying names)
n98-magerun2 index:reindex:all
```

#### OpenSearch / Elasticsearch operations

Check cluster health, list indices, reset and reindex Magento indexers, and tail OpenSearch logs

```bash
#!/usr/bin/env bash
# OpenSearch / Elasticsearch operations through Warden.
# API commands run against the opensearch container directly.
# Indexer commands run from inside warden shell.

# ── Cluster health ────────────────────────────────────────────────────────────

# Pretty-print cluster health (status: green / yellow / red)
warden env exec -T opensearch curl -s localhost:9200/_cluster/health \
  | python3 -m json.tool

# One-liner for quick status check
warden env exec -T opensearch curl -s 'localhost:9200/_cluster/health?pretty'

# ── Index inspection ──────────────────────────────────────────────────────────

# List all indices with document counts, size, and status
warden env exec -T opensearch curl -s 'localhost:9200/_cat/indices?v'

# Filter to Magento indices only
warden env exec -T opensearch curl -s 'localhost:9200/_cat/indices/magento2*?v'

# Inspect index settings and mappings (useful when mapping conflicts cause errors)
warden env exec -T opensearch \
  curl -s 'localhost:9200/magento2_product_1/_settings' | python3 -m json.tool

# ── Index management ──────────────────────────────────────────────────────────

# Delete a specific Magento index (forces a full rebuild on next reindex)
warden env exec -T opensearch curl -s -X DELETE localhost:9200/magento2_product_1

# Delete all Magento indices (nuclear option — triggers full reindex for everything)
warden env exec -T opensearch curl -s -X DELETE 'localhost:9200/magento2*'

# ── Indexer reset and rebuild (run inside warden shell) ───────────────────────

# Reset and reindex only the full-text search indexer
bin/magento indexer:reset catalogsearch_fulltext
bin/magento indexer:reindex catalogsearch_fulltext

# Reset and reindex all Elasticsearch-backed indexers
bin/magento indexer:reset \
  catalogsearch_fulltext \
  catalog_category_product \
  catalog_product_category \
  catalog_product_price
bin/magento indexer:reindex

# Check indexer status after reindex
bin/magento indexer:status

# ── Logs ─────────────────────────────────────────────────────────────────────

# Tail OpenSearch logs live (useful during reindex to catch mapping errors)
warden env logs --tail 0 -f opensearch

# Show last 100 lines of OpenSearch logs without following
warden env logs --tail 100 opensearch
```

#### RabbitMQ queue management

List queues, purge stale messages, run consumers, and access the Management UI

```bash
#!/usr/bin/env bash
# RabbitMQ queue management through Warden.
# rabbitmqctl commands run against the rabbitmq container.
# Consumer commands run from inside warden shell.

# ── Queue inspection ──────────────────────────────────────────────────────────

# List all queues with message count and active consumer count
warden env exec -T rabbitmq rabbitmqctl list_queues name messages consumers

# List queues sorted by message count (busiest first)
warden env exec -T rabbitmq rabbitmqctl list_queues name messages consumers \
  | sort -k2 -rn

# Show queue details: state, memory usage, and idle time
warden env exec -T rabbitmq rabbitmqctl list_queues \
  name state messages memory idle_since

# ── Message management ────────────────────────────────────────────────────────

# Purge all unconsumed messages from a specific queue
# Use when stale messages from a failed bulk operation are blocking consumers.
warden env exec -T rabbitmq rabbitmqctl purge_queue async.operations.all

# Common Magento queues to purge during development resets:
warden env exec -T rabbitmq rabbitmqctl purge_queue async.operations.all
warden env exec -T rabbitmq rabbitmqctl purge_queue inventory.reservations.update
warden env exec -T rabbitmq rabbitmqctl purge_queue media.storage.catalog.image.resize

# ── Consumers (run from inside warden shell) ──────────────────────────────────

# Run a specific consumer and stop after processing 100 messages
bin/magento queue:consumers:start async.operations.all --max-messages=100

# Run a consumer in single-thread mode (useful for debugging)
bin/magento queue:consumers:start async.operations.all \
  --single-thread \
  --max-messages=10

# Start all configured consumers in the background (development shortcut)
bin/magento queue:consumers:start --all &

# Check which consumers Magento has configured
bin/magento queue:consumers:list

# ── Connection and exchange inspection ───────────────────────────────────────

# List all virtual hosts
warden env exec -T rabbitmq rabbitmqctl list_vhosts

# List all exchanges on the default vhost
warden env exec -T rabbitmq rabbitmqctl list_exchanges

# List active connections (useful to confirm consumers are connected)
warden env exec -T rabbitmq rabbitmqctl list_connections \
  peer_host peer_port user state

# ── Management UI ─────────────────────────────────────────────────────────────
# Available at https://rabbitmq.{WARDEN_ENV_NAME}.test
# Default credentials: guest / guest
# Provides a visual overview of queues, exchanges, bindings, and message rates.
# Use it for ad-hoc inspection; prefer rabbitmqctl for scripted operations.

# ── Logs ─────────────────────────────────────────────────────────────────────

# Tail RabbitMQ logs live
warden env logs --tail 0 -f rabbitmq
```

#### File sync (mutagen) operations

Start, stop, monitor, and recover the mutagen sync session that keeps host and container files in sync

```bash
#!/usr/bin/env bash
# Mutagen file sync operations through Warden.
# Run these on the host (not inside warden shell).
# Warden manages mutagen sessions automatically; these commands let you
# inspect and recover them when the sync stalls.

# ── Status ────────────────────────────────────────────────────────────────────

# Show all active sync sessions and their current state
# Look for "Watching for changes" — anything else indicates a problem.
warden sync list

# Stream live sync events until Ctrl-C.
# Use this first when edits on the host are not appearing inside the container.
warden sync monitor

# ── Lifecycle ─────────────────────────────────────────────────────────────────

# Start the sync session (also runs automatically with `warden env start`)
warden sync start

# Stop the sync session without destroying its state
warden sync stop

# Temporarily halt sync — useful during large file operations (e.g. composer install)
# that would otherwise trigger thousands of sync events and slow down the host.
warden sync pause

# Resume a paused session
warden sync resume

# ── Recovery ──────────────────────────────────────────────────────────────────

# Restart all sync sessions — first choice when edits are not reaching the container.
# Stops and recreates every session; faster than a full reset.
warden sync restart

# Full reset — nukes sync state and forces a complete re-scan of all files.
# Use only when `warden sync restart` does not clear the conflict or stall.
# Expect a longer initial sync (seconds to minutes depending on project size).
warden sync reset

# ── Debugging ─────────────────────────────────────────────────────────────────

# If warden sync commands hang or error, check Docker and mutagen daemon state:
warden doctor

# Verbose output — also prints environment variables that affect sync behaviour
warden doctor -v

# Inspect the raw mutagen daemon log for protocol-level errors
# (mutagen must be installed on the host for this to work)
mutagen daemon stop && mutagen daemon start
warden sync start
```


### Anti-patterns

- Running `composer install` or `bin/magento setup:upgrade` on the host machine: The host PHP binary and extensions almost never match the container. Composer resolves platform requirements against the wrong PHP version, writes an incompatible composer.lock, and Magento setup writes generated code (generated/code, generated/metadata) built for the host toolchain. The app then fails to boot inside the container with cryptic class-loading errors.
  Solution: Always `warden shell` first. Run composer, bin/magento, and any php script from inside the php-fpm container so the toolchain, extensions, and file ownership match what the running application sees.
- Copying a SQL dump into the db container with `docker cp` before importing: Large dumps balloon the container filesystem, slow down disk I/O for the live DB, and leave orphan files that are easy to forget. The copy step also doubles the time to import.
  Solution: Stream directly: `pv dump.sql.gz | gunzip -c | warden db import`. Nothing is written to disk inside the container, and `pv` reports throughput so you know the import is making progress.
- Restarting containers to clear caches: Container restarts drop all in-memory state (Redis keys, Varnish objects, OPcache), break active debugging sessions, and take far longer than targeted cache operations. They also mask real bugs by forcing a cold-start that hides stale-config issues.
  Solution: Use the targeted tool: `warden redis flushall` for Redis, `warden valkey flushall` for Valkey, the varnishadm ban for Varnish, and `bin/magento cache:flush` for Magento-managed caches. Restart only when a service is actually unhealthy.
- Debugging silent failures without checking `warden doctor`: Warden depends on Docker, mutagen, DNS resolution, and traefik routing. When one piece drifts (expired certs, stale resolver, Docker Desktop update), commands fail in confusing ways — `warden shell` hangs, URLs 502, or env vars don't load. Hours get spent chasing application-layer causes for an environment-layer problem.
  Solution: Run `warden doctor` (or `warden doctor -v` for environment variables) at the first sign of unexplained environment behavior. It reports Docker state, DNS resolver config, root certificate trust, and mutagen session health in one pass.

### References

- [Warden documentation](https://docs.warden.dev/)
- [Warden environment commands](https://docs.warden.dev/environments/commands.html)
- [Warden database import](https://docs.warden.dev/environments/databases.html)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Warden local development documentation, Adobe Commerce 2.4.x operations docs

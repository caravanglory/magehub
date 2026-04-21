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

Use lifecycle commands from the project root (where `.env` resolves
the Warden environment name):

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

### Where to Learn More

- `warden help` — top-level command index
- `warden env -h` — environment-subcommand reference
- https://docs.warden.dev/ — canonical documentation

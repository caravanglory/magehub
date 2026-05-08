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

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

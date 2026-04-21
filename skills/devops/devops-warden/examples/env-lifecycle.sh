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

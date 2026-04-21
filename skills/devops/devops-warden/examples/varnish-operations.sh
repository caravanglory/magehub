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

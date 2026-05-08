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

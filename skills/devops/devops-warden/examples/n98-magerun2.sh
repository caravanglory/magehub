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

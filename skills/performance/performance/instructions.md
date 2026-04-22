### Performance Profiling Philosophy

Always measure first, optimize second. Magento performance issues cluster in
predictable layers — database queries, block rendering, collection loading, and
frontend assets. The profiler tells you which layer is the bottleneck; guessing
leads to wasted effort and added complexity.

### Measurement-Driven Workflow

Follow this workflow for every performance investigation:

1. **Reproduce** — replicate the issue in production-like conditions (caches on,
   production mode, realistic dataset)
2. **Baseline** — measure current response time, query count, and memory usage
3. **Profile** — use profiler, APM, or query log to identify the single largest
   bottleneck
4. **Hypothesize** — form a theory about the root cause (missing index, N+1
   query, uncached block, etc.)
5. **Fix** — apply the smallest change that addresses only that bottleneck
6. **Verify** — re-measure and confirm the improvement; if no improvement,
   revert and revisit the hypothesis
7. **Repeat** — return to step 3 until performance targets are met

Never skip the verify step. Many "obvious" optimizations do not move the needle,
and reverting keeps the codebase clean.

### Built-in Magento Profiler

Magento ships with a built-in profiler that wraps code blocks in timing
measurements. Enable it via CLI:

```bash
bin/magento dev:profiler:enable html
```

The CLI command creates a `var/profiler.flag` file. Once enabled, the profiler
automatically attaches to all storefront requests that accept `text/html` and
renders a nested tree of timers with memory usage, call counts, and elapsed
time at the bottom of the page. Look for:

- **Large time deltas in `db_query` nodes** — indicates slow or excessive SQL
- **Repeated identical blocks under `magento` → `block` → `toHtml`** — signals duplicate block rendering
- **High memory in collection nodes** — unbounded collection loading without page limits

Disable profiler before any production deployment:

```bash
bin/magento dev:profiler:disable
```

### Database Query Analysis

Enable the database query log to capture every SQL statement executed during a
request:

```bash
bin/magento dev:query-log:enable
```

Logs write to `var/debug/db.log`. Analyze for:

- **N+1 query patterns** — a parent query followed by many identical child queries in a loop
- **Missing `LIMIT` clauses** — collections fetching thousands of rows
- **Queries without indexes** — full table scans appearing as `type: ALL` in EXPLAIN output

For each suspicious query, copy the SQL and prefix it with `EXPLAIN` in a MySQL
client. Focus on the `type`, `key`, `rows`, and `Extra` columns. `type: ALL`
with high `rows` and `Extra: Using filesort` or `Using temporary` are the
primary red flags.

Use the slow query log on the MySQL server for production-grade analysis:

```ini
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1
```

### APM Integration (New Relic)

New Relic APM segments transactions by controller and provides database trace
details. Configure meaningful transaction names so traces map to actual business
operations rather than generic front names:

Use the `newrelic_name_transaction` function in a plugin or observer to set
the transaction name based on the actual route. Group by controller action or
API endpoint so the APM dashboard shows which pages are slowest.

Key New Relic metrics to watch:

- **Apdex score** — user satisfaction threshold (target > 0.85)
- **Database time as % of total** — if > 50%, optimize queries first
- **External service time** — payment gateways, ERP APIs, shipping rate fetchers
- **Error rate** — 5xx responses that may correlate with timeouts

### Blackfire Profiling

Blackfire provides function-level call graphs with memory and CPU attribution.
Install the probe and run profiles from CLI or browser extension:

```bash
blackfire run --samples 3 php bin/magento indexer:reindex catalog_product_price
```

Interpret Blackfire output by sorting the call graph by **exclusive wall time**.
The functions at the top are where CPU cycles are actually spent. Common Magento
findings:

- **`Magento\Framework\DB\Adapter\Pdo\Mysql::query` high exclusive time** —
  slow SQL, missing indexes, or too many queries
- **`Magento\Eav\Model\Entity\Collection\AbstractCollection::load` called
  repeatedly** — N+1 loading of EAV entities
- **`file_get_contents` or `fopen` in template/Block classes** — synchronous
  remote or filesystem I/O inside rendering

Use Blackfire assertions in CI to prevent regressions. Define a `.blackfire.yaml`
scenario that asserts maximum wall time and memory per critical page type.

### Magento 2 Cache Architecture

Magento provides multiple built-in cache types that store different categories
of generated data. The most performance-critical types are:

- `config` — merged XML configuration from all modules
- `layout` — compiled layout instructions
- `block_html` — rendered block HTML fragments
- `collections` — database query results for collections
- `full_page` — fully rendered HTML pages (FPC)

Understand which cache type applies before introducing caching logic. Misusing
a cache type leads to stale data or unnecessary invalidation storms.

### Full Page Cache and Varnish

Production stores must run Varnish as the full page cache backend. Varnish
serves cached responses without invoking PHP, reducing TTFB to single-digit
milliseconds. Mark pages as cacheable by default — only add `cacheable="false"`
to a layout block when the entire page truly cannot be cached. A single
non-cacheable block disables FPC for the entire page, so isolate dynamic
content via private content sections or UI component AJAX instead.

### Block-Level Caching

Implement `\Magento\Framework\DataObject\IdentityInterface` on every block
that renders entity-dependent content. Return entity-specific cache tags from
`getIdentities()` so Magento invalidates only the affected HTML fragments when
data changes. Override `getCacheKeyInfo()` to include all variables that affect
output — store ID, customer group, currency — ensuring each variant gets its
own cache entry. Set `getCacheLifetime()` to a finite TTL; returning `null`
disables block caching entirely.

### Custom Cache Types

Register a custom cache type when module data is expensive to compute and
changes infrequently. Declare the type in `etc/cache.xml` and bind it to a
frontend model via `di.xml`. Custom types appear in the admin cache management
grid and can be flushed independently, giving operators fine-grained control.

### Cache Invalidation Strategies

Design invalidation before implementing storage. Use cache tags to group
related entries — when a product changes, the `cat_p_{id}` tag invalidates
every block, collection result, and FPC entry referencing that product.
Call `\Magento\Framework\App\CacheInterface::clean()` with specific tags
rather than flushing an entire cache type. For programmatic bulk operations,
use `TypeListInterface::invalidate()` to mark a cache type as outdated
without immediately purging storage.

### Customer-Specific Content

Never embed customer-specific data in cacheable page output. Use Magento's
private content (sections) mechanism to load personalized data via AJAX after
the cached page shell is served. Register sections in `etc/frontend/sections.xml`
and bind them to customer-data JS components on the frontend.

### Frontend Performance Auditing

Server-side optimization is only half the battle. Audit frontend performance
with Lighthouse or WebPageTest after backend changes:

- **Largest Contentful Paint (LCP)** — target < 2.5s; often driven by slow
  server response (TTFB) and unoptimized hero images
- **Total Blocking Time (TBT)** — target < 200ms; caused by heavy JavaScript
  bundles and long-running RequireJS module definitions
- **Cumulative Layout Shift (CLS)** — target < 0.1; caused by images or blocks
  without explicit dimensions loading asynchronously

Magento-specific frontend optimizations:

- Enable JS bundling and minification in production:
  `Stores → Configuration → Advanced → Developer → JavaScript Settings`
- Use lazy loading for below-the-fold images via `loading="lazy"`
- Defer non-critical JavaScript; load customer-data sections asynchronously
- Audit third-party tracking scripts; they often block the main thread

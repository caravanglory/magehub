---
name: performance
description: "Profile, diagnose, and optimize Magento 2 performance — caching strategies, database query analysis, APM tools (New Relic, Blackfire), and frontend performance auditing"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# Performance

### Activation

#### Use When

- The task is to investigate, profile, or optimize Magento performance in backend, database, cache, search, queue, or frontend layers.
- The task mentions TTFB, query count, N+1, slow queries, block cache, FPC, Varnish, New Relic, Blackfire, Lighthouse, or WebPageTest.

#### Do Not Use When

- The task is a correctness bug with no measured latency, throughput, memory, or resource symptom.
- The user asks for a code style review rather than a performance baseline and optimization cycle.

#### Required Inputs

- Affected page/API/CLI transaction, environment, dataset realism, cache mode, current symptom, and success metric.
- Available profiler/APM/logging tools and whether production traffic is in scope.

### Workflow

1. Reproduce the symptom in production-like conditions and capture baseline metrics before editing code.
2. Profile one layer at a time and form a falsifiable hypothesis for the largest bottleneck.
3. Apply the smallest change that targets that bottleneck only.
4. Re-measure with the same method and compare baseline vs result; revert or revisit if no improvement is proven.

### Guardrails

- Do not claim a performance improvement without before/after evidence.
- Do not enable Magento profiler, SQL logging, or verbose APM tracing on production customer-facing traffic. (approval required)
- Ask before cache flushes, reindex-all commands, or service restarts that can affect shared environments. (approval required)

### Verification

- Report baseline and post-change metrics using the same URL, command, dataset, cache state, and measurement tool.
- Run targeted tests for any changed code path plus a smoke test for the measured transaction.
- When cache behavior changes, prove invalidation correctness with cache tags, key info, or a stale-data check.

### Output Contract

- Provide baseline, hypothesis, change made, post-change measurement, delta, commands/tools used, and unresolved measurement risk.
- State any production-only assumptions that were not verified locally.

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

### Conventions

- Always reproduce performance issues in production-like conditions before profiling
  Example: Use production database snapshot, disable developer mode, enable all caches and minification
  Rationale: Profiling in developer mode or with small datasets produces misleading results that do not reflect real bottlenecks
- Profile before and after any optimization to measure actual impact
  Example: Record baseline TTFB and query count, apply index, re-profile and compare
  Rationale: Without measured before/after data, optimizations may hurt performance or solve the wrong problem
- Never enable profiler or SQL logging on production storefront traffic
  Example: Use profiler via CLI command (bin/magento dev:query-log:enable) or isolated staging environment
  Rationale: Profiler overhead adds 20-50% latency and can leak sensitive query data to responses
- Prioritize database query optimization over PHP micro-optimizations
  Example: A missing index causing 500ms queries will yield more improvement than caching a 2ms PHP loop
  Rationale: Database queries are the dominant bottleneck in most Magento deployments; PHP runtime is rarely the limiting factor
- Define the invalidation strategy before adding any cache storage
  Example: Document which cache tags will be cleaned and which events trigger the clean before writing cache save logic
  Rationale: Caching without a clear invalidation plan leads to stale data that is difficult to debug and erodes trust in the cache layer
- Implement IdentityInterface on every block that renders entity-dependent cached content
  Example: class ProductList extends AbstractBlock implements IdentityInterface
  Rationale: Without IdentityInterface the framework cannot associate cache tags with block HTML, causing stale fragments to persist after entity updates
- Use specific cache tags to group related cache entries instead of flushing entire cache types
  Example: clean([Product::CACHE_TAG . '_' . $productId]) instead of TypeListInterface::cleanType('full_page')
  Rationale: Targeted invalidation preserves the majority of cached data and avoids the thundering herd problem that full cache flushes cause under load

### Examples

#### Enable Magento built-in profiler and read output

Configure profiler in env.php and interpret the HTML output to identify slow code paths

```php
<?php
declare(strict_types=1);

/**
 * Example: Enable and read Magento's built-in profiler output.
 *
 * The profiler wraps execution blocks in timing measurements and emits
 * a nested HTML table when ?profiler=1 is appended to the URL.
 */

// 1. Enable the profiler via CLI (run as magento user)
//    bin/magento dev:profiler:enable html

// 2. Alternative: enable in code for a specific request scope
//    This should ONLY be used in staging or local environments.
\Magento\Framework\Profiler::enable();

// 3. Custom timer: wrap a suspicious code block to isolate its cost
\Magento\Framework\Profiler::start('custom:heavy_computation');

// Your module logic here
$result = $this->heavyComputationService->process($data);

\Magento\Framework\Profiler::stop('custom:heavy_computation');

// 4. Read the profiler output in browser by appending ?profiler=1
//    Look for nodes with:
//    - High elapsed time relative to parent
//    - High call counts (indicates N+1 patterns)
//    - Large memory deltas

// 5. Disable when done
//    bin/magento dev:profiler:disable
```

#### Analyze slow MySQL queries with EXPLAIN

Identify missing indexes and inefficient queries from the slow query log or Magento query log

```sql
-- Example: Analyze slow queries using EXPLAIN and the slow query log.

-- Step 1: Enable Magento query logging (staging/local only)
-- bin/magento dev:query-log:enable
-- Logs write to var/debug/db.log

-- Step 2: Identify a slow query from the log, then run EXPLAIN
EXPLAIN
SELECT e.*, price_index.price, price_index.tax_class_id
FROM catalog_product_entity e
INNER JOIN catalog_product_index_price price_index
    ON e.entity_id = price_index.entity_id
    AND price_index.customer_group_id = 0
    AND price_index.website_id = 1
WHERE e.attribute_set_id = 4
ORDER BY price_index.price DESC;

-- Expected healthy output:
-- +----+-------------+--------------+--------+---------------+---------+---------+------------------+------+-------------+
-- | id | select_type | table        | type   | possible_keys | key     | key_len | ref              | rows | Extra       |
-- +----+-------------+--------------+--------+---------------+---------+---------+------------------+------+-------------+
-- |  1 | SIMPLE      | e            | ref    | PRIMARY,...   | attr_set| 2       | const            |  500 | Using where |
-- |  1 | SIMPLE      | price_index  | eq_ref | PRIMARY       | PRIMARY | 8       | e.entity_id,...  |    1 | NULL        |
-- +----+-------------+--------------+--------+---------------+---------+---------+------------------+------+-------------+

-- Red flags in EXPLAIN output:
-- - type: ALL         → full table scan, needs an index
-- - rows: > 10000     → scanning too many rows
-- - Extra: Using filesort → ORDER BY not using an index
-- - Extra: Using temporary → GROUP BY or ORDER BY creating temp tables

-- Step 3: Add a composite index to fix filesort and reduce scanned rows
ALTER TABLE catalog_product_entity
ADD INDEX IDX_ATTRIBUTE_SET_ENTITY_TYPE (attribute_set_id, entity_type_id);

-- Step 4: Re-run EXPLAIN to verify the index is used and rows drop

-- Step 5: Common Magento slow query patterns and fixes

-- Pattern: Missing index on custom EAV attribute filter
-- Fix: Add index on the EAV value table
ALTER TABLE catalog_product_entity_varchar
ADD INDEX IDX_ATTRIBUTE_VALUE_ENTITY (attribute_id, entity_id, value(100));

-- Pattern: Catalog price rules with no index on rule conditions
-- Fix: Ensure catalogrule_product and catalogrule_product_price have
--      proper indexes on rule_id, product_id, and website_id

-- Step 6: Query the slow query log directly (MySQL 8.0+)
SELECT
    query_time,
    lock_time,
    rows_sent,
    rows_examined,
    sql_text
FROM mysql.slow_log
WHERE start_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY query_time DESC
LIMIT 20;
```

#### New Relic APM transaction trace configuration

Configure New Relic to segment Magento transactions and identify controller-level bottlenecks

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Plugin;

use Magento\Framework\App\FrontControllerInterface;
use Magento\Framework\App\Request\Http;
use Magento\Framework\App\ResponseInterface;

/**
 * Example: Configure New Relic APM with meaningful transaction names.
 *
 * Default New Relic names group all frontend routes under 'front', making
 * it impossible to tell which controller is slow. This plugin maps
 * transactions to meaningful business names for the APM dashboard.
 */
class NewRelicTransactionNamingPlugin
{
    public function afterDispatch(
        FrontControllerInterface $subject,
        ResponseInterface $result,
        Http $request
    ): ResponseInterface {
        if (!extension_loaded('newrelic')) {
            return $result;
        }

        $module = $request->getModuleName();
        $controller = $request->getControllerName();
        $action = $request->getActionName();
        $routeName = $request->getRouteName();

        // Skip admin routes — name them separately to avoid mixing with storefront
        if ($module === 'admin') {
            newrelic_name_transaction(sprintf('admin/%s/%s', $controller, $action));
            return $result;
        }

        // Name API routes by their endpoint pattern
        if (str_starts_with($request->getPathInfo(), '/rest/')) {
            $method = $request->getMethod();
            $path = $request->getPathInfo();
            // Normalize IDs in path: /rest/V1/products/123 → /rest/V1/products/{id}
            $normalized = preg_replace('#/\d+#', '/{id}', $path);
            newrelic_name_transaction(sprintf('api:%s %s', $method, $normalized));
            return $result;
        }

        // Name storefront by full route for granular APM visibility
        $transactionName = sprintf('%s/%s/%s', $module, $controller, $action);
        newrelic_name_transaction($transactionName);

        // Add custom attributes for filtering and segmentation in New Relic
        newrelic_add_custom_parameter('magento_module', $module);
        newrelic_add_custom_parameter('magento_controller', $controller);
        newrelic_add_custom_parameter('magento_action', $action);
        newrelic_add_custom_parameter('magento_store_id', $this->getStoreId());

        return $result;
    }

    private function getStoreId(): int
    {
        // Inject StoreManagerInterface in constructor for production use
        return 1;
    }
}
```

#### Blackfire probe integration for CI profiling

Add Blackfire assertions to CI pipeline for automated performance regression detection

```yaml
# Example: Blackfire scenario for CI performance regression detection.
#
# Add this to .blackfire.yaml in the project root. Blackfire runs these
# assertions on every profile and fails the build if thresholds are exceeded.

scenarios: |
  #!blackfire-player

  scenario
    name "Magento Storefront Performance"

    # Homepage
    visit url('/')
        name "Homepage"
        expect status_code() == 200
        assert metrics.sql.queries.count < 30
        assert main.wall_time < 500ms
        assert main.peak_memory < 80MB

    # Category page
    visit url('/men/tops-men.html')
        name "Category Page"
        expect status_code() == 200
        assert metrics.sql.queries.count < 50
        assert main.wall_time < 800ms
        assert main.peak_memory < 100MB

    # Product page
    visit url('/hero-hoodie.html')
        name "Product Detail Page"
        expect status_code() == 200
        assert metrics.sql.queries.count < 40
        assert main.wall_time < 600ms
        assert main.peak_memory < 90MB

    # Cart page
    visit url('/checkout/cart/')
        name "Cart Page"
        expect status_code() == 200
        assert metrics.sql.queries.count < 25
        assert main.wall_time < 400ms

    # Search results
    visit url('/catalogsearch/result/?q=hoodie')
        name "Search Results"
        expect status_code() == 200
        assert metrics.sql.queries.count < 35
        assert main.wall_time < 700ms

tests:
  'Pages should not trigger SQL errors':
    - assert metrics.sql.errors.count == 0

  'No function should dominate CPU':
    - assert main.peak_memory < 500MB
    - assert metrics.magento2.all.collections_load.time < 300ms
```

#### Block implementing IdentityInterface with cache key info

Complete block class that declares cache tags, cache key components, and a finite cache lifetime for block_html caching

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Block;

use Magento\Catalog\Api\Data\ProductInterface;
use Magento\Catalog\Model\Product;
use Magento\Framework\DataObject\IdentityInterface;
use Magento\Framework\View\Element\Template;
use Magento\Store\Model\StoreManagerInterface;

class FeaturedProduct extends Template implements IdentityInterface
{
    private const CACHE_LIFETIME_SECONDS = 3600;

    public function __construct(
        Template\Context $context,
        private readonly StoreManagerInterface $storeManager,
        array $data = []
    ) {
        parent::__construct($context, $data);
    }

    public function getIdentities(): array
    {
        /** @var ProductInterface|null $product */
        $product = $this->getData('product');
        if ($product === null) {
            return [];
        }

        return [Product::CACHE_TAG . '_' . $product->getId()];
    }

    public function getCacheKeyInfo(): array
    {
        return [
            'VENDOR_MODULE_FEATURED_PRODUCT',
            (string) $this->storeManager->getStore()->getId(),
            (string) $this->getData('product_id'),
            $this->getTemplate(),
        ];
    }

    public function getCacheLifetime(): int
    {
        return self::CACHE_LIFETIME_SECONDS;
    }
}
```

#### Custom cache type registration (cache.xml + di.xml)

Declare a custom cache type so it appears in the admin cache management grid and can be flushed independently

```xml
<!-- etc/cache.xml -->
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Cache/etc/cache.xsd">
    <type name="vendor_module_data"
          translate="label,description"
          instance="Vendor\Module\Cache\Frontend\Decorator\TagScope">
        <label>Vendor Module Data</label>
        <description>Cached results for expensive Vendor Module computations</description>
    </type>
</config>

<!-- etc/di.xml -->
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
    <virtualType name="Vendor\Module\Cache\Frontend\Decorator\TagScope"
                 type="Magento\Framework\Cache\Frontend\Decorator\TagScope">
        <arguments>
            <argument name="frontend" xsi:type="object">Magento\Framework\App\Cache</argument>
            <argument name="tag" xsi:type="string">VENDOR_MODULE_DATA</argument>
        </arguments>
    </virtualType>
</config>
```

#### Programmatic cache operations with TypeListInterface

Service class that performs targeted cache invalidation and direct cache load/save using the framework cache interfaces

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Model;

use Magento\Framework\App\Cache\TypeListInterface;
use Magento\Framework\App\CacheInterface;
use Magento\Framework\Serialize\SerializerInterface;

class CachedDataProvider
{
    private const CACHE_KEY_PREFIX = 'vendor_module_';
    private const CACHE_TAG = 'VENDOR_MODULE_DATA';
    private const CACHE_LIFETIME = 7200;

    public function __construct(
        private readonly CacheInterface $cache,
        private readonly TypeListInterface $cacheTypeList,
        private readonly SerializerInterface $serializer,
        private readonly ExpensiveDataSource $dataSource
    ) {
    }

    public function getData(int $entityId): array
    {
        $cacheKey = self::CACHE_KEY_PREFIX . $entityId;
        $cached = $this->cache->load($cacheKey);

        if ($cached !== false) {
            return $this->serializer->unserialize($cached);
        }

        $data = $this->dataSource->compute($entityId);
        $this->cache->save(
            $this->serializer->serialize($data),
            $cacheKey,
            [self::CACHE_TAG, self::CACHE_TAG . '_' . $entityId],
            self::CACHE_LIFETIME
        );

        return $data;
    }

    public function invalidateByEntity(int $entityId): void
    {
        $this->cache->clean([self::CACHE_TAG . '_' . $entityId]);
    }

    public function invalidateAll(): void
    {
        $this->cacheTypeList->invalidate('vendor_module_data');
    }
}
```


### Anti-patterns

- Running profiler on production customer-facing requests: Profiler output is embedded in HTML responses, exposing internal paths, query strings, and potentially sensitive data. The profiling overhead also degrades customer experience.
  Solution: Enable profiler only via CLI commands, admin-restricted routes, or dedicated staging:
bin/magento dev:profiler:enable html
bin/magento dev:query-log:enable
Use IP whitelisting or admin session checks before emitting profile data.

- Optimizing without a clear bottleneck identified: Blindly adding indexes, caching layers, or code changes without profiling data often introduces complexity without measurable benefit, and can mask the real issue.
  Solution: Follow the measurement-driven workflow:
1. Establish baseline (response time, query count, memory)
2. Profile to identify the top bottleneck
3. Apply targeted fix to that bottleneck only
4. Re-measure to confirm improvement

- Caching as a substitute for fixing slow queries: Adding cache layers on top of N+1 queries or missing indexes defers the root cause. When cache invalidates, the underlying slowness returns and may cascade.
  Solution: Fix the query first, then add caching:
- Use EXPLAIN to find missing indexes
- Eliminate N+1 queries with joins or collection preloading
- Add caching only after the data access layer is optimized

- Embedding customer-specific data in full page cache output: FPC stores one response per URL regardless of session. Customer names, prices, or cart contents rendered in cacheable blocks leak across visitors and violate privacy regulations.
  Solution: Move personalized data to private content sections loaded via AJAX after page render:
<!-- etc/frontend/sections.xml -->
<action name="customer/account/login">
    <section name="customer"/>
</action>
Use customer-data JS components to render personalized blocks client-side.

- Cacheable block missing IdentityInterface and cache tags: Without IdentityInterface the block HTML cache entry has no tags. Entity updates cannot trigger targeted invalidation, causing stale output until the entire block_html cache type is flushed.
  Solution: Implement IdentityInterface and return entity-specific tags:
public function getIdentities(): array
{
    return [Product::CACHE_TAG . '_' . $this->getProductId()];
}

- Flushing all caches instead of targeted tag-based invalidation: Calling bin/magento cache:flush or cleaning an entire cache type purges all entries, triggering a thundering herd of uncached requests that can saturate backend servers under load.
  Solution: Use tag-based invalidation to remove only affected entries:
$this->cache->clean([Product::CACHE_TAG . '_' . $productId]);
For cache type-level invalidation, prefer invalidate() over cleanType()
because invalidate() marks the type as outdated without immediate purge.


### File Templates

#### etc/env.php

Path template:

```text
etc/env.php
```

Debug logging configuration for staging/development only (profiler is enabled via CLI or MAGE_PROFILER env var, not env.php)

```php
<?php
return [
    'system' => [
        'default' => [
            'dev' => [
                'debug' => [
                    'debug_logging' => '1',
                    'template_hints' => '0',
                ],
            ],
        ],
    ],
];
// Enable profiler via CLI: bin/magento dev:profiler:enable html
// Or set environment variable: MAGE_PROFILER=html
```

#### Block/<blockName>.php

Path template:

```text
Block/{{blockName}}.php
```

Cacheable block implementing IdentityInterface with cache key info and lifetime

```php
<?php
declare(strict_types=1);

namespace {{vendor}}\{{module}}\Block;

use Magento\Framework\DataObject\IdentityInterface;
use Magento\Framework\View\Element\Template;

class {{blockName}} extends Template implements IdentityInterface
{
    private const CACHE_TAG = '{{cacheTag}}';
    private const CACHE_LIFETIME_SECONDS = 3600;

    public function getIdentities(): array
    {
        $id = $this->getData('entity_id');

        return $id !== null ? [self::CACHE_TAG . '_' . $id] : [];
    }

    public function getCacheKeyInfo(): array
    {
        return [
            self::CACHE_TAG,
            (string) $this->_storeManager->getStore()->getId(),
            $this->getTemplate(),
        ];
    }

    public function getCacheLifetime(): int
    {
        return self::CACHE_LIFETIME_SECONDS;
    }
}
```

#### etc/cache.xml

Path template:

```text
etc/cache.xml
```

Custom cache type registration for module-specific cached data

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Cache/etc/cache.xsd">
    <type name="{{cacheTypeName}}"
          translate="label,description"
          instance="Magento\Framework\Cache\Frontend\Decorator\TagScope">
        <label>{{cacheTypeLabel}}</label>
        <description>{{cacheTypeDescription}}</description>
    </type>
</config>
```


### References

- [Adobe Commerce: Configure the profiler](https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/setup/config-services)
- [Adobe Commerce: Slow query and slow processing logs](https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/setup/config-services)
- [Blackfire.io Magento Documentation](https://blackfire.io/docs/introduction)
- [New Relic APM for Adobe Commerce](https://experienceleague.adobe.com/en/docs/commerce-operations/tools/site-wide-analysis-tools/new-relic)
- [MySQL EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- [Adobe Commerce: Cache overview and types](https://developer.adobe.com/commerce/php/development/cache/)
- [Adobe Commerce: Full page caching](https://developer.adobe.com/commerce/php/development/cache/page/public-content/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Adobe Commerce 2.4.x cache and performance docs, New Relic and Blackfire profiling guidance

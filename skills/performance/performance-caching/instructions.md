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

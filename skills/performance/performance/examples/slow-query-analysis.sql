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

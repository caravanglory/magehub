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

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

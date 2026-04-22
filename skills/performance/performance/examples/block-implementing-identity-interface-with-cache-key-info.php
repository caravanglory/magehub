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

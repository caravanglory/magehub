<?php
declare(strict_types=1);

namespace Vendor\Module\ViewModel;

use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Pricing\PriceCurrencyInterface;
use Magento\Framework\View\Element\Block\ArgumentInterface;

class ProductData implements ArgumentInterface
{
    public function __construct(
        private readonly ProductRepositoryInterface $productRepository,
        private readonly PriceCurrencyInterface $priceCurrency
    ) {
    }

    public function getFormattedPrice(int $productId): string
    {
        try {
            $product = $this->productRepository->getById($productId);
        } catch (NoSuchEntityException) {
            return '';
        }

        return $this->priceCurrency->format(
            (float) $product->getFinalPrice(),
            true,
            PriceCurrencyInterface::DEFAULT_PRECISION
        );
    }
}

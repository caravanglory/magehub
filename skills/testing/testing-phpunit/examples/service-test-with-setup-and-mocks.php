<?php
declare(strict_types=1);

namespace Vendor\Module\Test\Unit\Model;

use Magento\Catalog\Api\Data\ProductInterface;
use Magento\Catalog\Api\ProductRepositoryInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Vendor\Module\Model\ProductDataExporter;

class ProductDataExporterTest extends TestCase
{
    private ProductRepositoryInterface&MockObject $productRepository;
    private ProductDataExporter $subject;

    protected function setUp(): void
    {
        $this->productRepository = $this->createMock(ProductRepositoryInterface::class);
        $this->subject = new ProductDataExporter($this->productRepository);
    }

    public function testGetProductNameReturnsNameFromRepository(): void
    {
        $product = $this->createMock(ProductInterface::class);
        $product->method('getName')->willReturn('Test Product');

        $this->productRepository
            ->method('getById')
            ->with(42)
            ->willReturn($product);

        $result = $this->subject->getProductName(42);

        $this->assertSame('Test Product', $result);
    }
}

<?php
declare(strict_types=1);

namespace Vendor\Module\Test\Unit\Model;

use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Catalog\Api\ProductRepositoryInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Vendor\Module\Model\ProductDataExporter;

class ProductDataExporterExceptionTest extends TestCase
{
    private ProductRepositoryInterface&MockObject $productRepository;
    private ProductDataExporter $subject;

    protected function setUp(): void
    {
        $this->productRepository = $this->createMock(ProductRepositoryInterface::class);
        $this->subject = new ProductDataExporter($this->productRepository);
    }

    public function testGetProductNameThrowsWhenProductNotFound(): void
    {
        $this->productRepository
            ->method('getById')
            ->with(999)
            ->willThrowException(
                new NoSuchEntityException(__('No such entity with id = 999'))
            );

        $this->expectException(NoSuchEntityException::class);
        $this->expectExceptionMessage('No such entity with id = 999');

        $this->subject->getProductName(999);
    }
}

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

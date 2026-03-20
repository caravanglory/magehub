<?php
declare(strict_types=1);

namespace Vendor\Module\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Vendor\Module\Api\EntityRepositoryInterface;
use Vendor\Module\Api\Data\EntityInterfaceFactory;

class CreateCustomEntity implements ResolverInterface
{
    public function __construct(
        private readonly EntityRepositoryInterface $entityRepository,
        private readonly EntityInterfaceFactory $entityFactory
    ) {
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ): array {
        $input = $args['input'] ?? [];

        if (empty($input['name'])) {
            throw new GraphQlInputException(__('Name is required.'));
        }

        $entity = $this->entityFactory->create();
        $entity->setName($input['name']);
        $entity->setIsActive($input['is_active'] ?? true);

        $saved = $this->entityRepository->save($entity);

        return [
            'id' => (int) $saved->getId(),
            'name' => $saved->getName(),
            'is_active' => (bool) $saved->getIsActive(),
            'created_at' => $saved->getCreatedAt(),
        ];
    }
}

<?php
declare(strict_types=1);

namespace Vendor\Module\Model\Resolver;

use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Exception\GraphQlNoSuchEntityException;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Vendor\Module\Api\EntityRepositoryInterface;

class CustomEntity implements ResolverInterface
{
    public function __construct(
        private readonly EntityRepositoryInterface $entityRepository
    ) {
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ): array {
        if (!isset($args['id'])) {
            throw new GraphQlInputException(__('Entity ID is required.'));
        }

        try {
            $entity = $this->entityRepository->getById((int) $args['id']);
        } catch (NoSuchEntityException $e) {
            throw new GraphQlNoSuchEntityException(
                __('Entity with ID "%1" does not exist.', $args['id'])
            );
        }

        return [
            'id' => (int) $entity->getId(),
            'name' => $entity->getName(),
            'is_active' => (bool) $entity->getIsActive(),
            'created_at' => $entity->getCreatedAt(),
        ];
    }
}

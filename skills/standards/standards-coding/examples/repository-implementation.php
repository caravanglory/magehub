<?php
declare(strict_types=1);

namespace Vendor\Module\Model;

use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Api\SearchCriteria\CollectionProcessorInterface;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\NoSuchEntityException;
use Vendor\Module\Api\Data\EntityInterface;
use Vendor\Module\Api\Data\EntitySearchResultsInterface;
use Vendor\Module\Api\Data\EntitySearchResultsInterfaceFactory;
use Vendor\Module\Api\EntityRepositoryInterface;
use Vendor\Module\Model\ResourceModel\Entity as EntityResource;
use Vendor\Module\Model\ResourceModel\Entity\CollectionFactory;

class EntityRepository implements EntityRepositoryInterface
{
    public function __construct(
        private readonly EntityResource $resource,
        private readonly EntityFactory $entityFactory,
        private readonly CollectionFactory $collectionFactory,
        private readonly CollectionProcessorInterface $collectionProcessor,
        private readonly EntitySearchResultsInterfaceFactory $searchResultsFactory
    ) {
    }

    public function getById(int $entityId): EntityInterface
    {
        $entity = $this->entityFactory->create();
        $this->resource->load($entity, $entityId);

        if (!$entity->getId()) {
            throw new NoSuchEntityException(
                __('Entity with ID "%1" does not exist.', $entityId)
            );
        }

        return $entity;
    }

    public function save(EntityInterface $entity): EntityInterface
    {
        try {
            $this->resource->save($entity);
        } catch (\Exception $e) {
            throw new CouldNotSaveException(
                __('Could not save entity: %1', $e->getMessage()),
                $e
            );
        }

        return $entity;
    }

    public function delete(EntityInterface $entity): bool
    {
        $this->resource->delete($entity);

        return true;
    }

    public function getList(SearchCriteriaInterface $searchCriteria): EntitySearchResultsInterface
    {
        $collection = $this->collectionFactory->create();
        $this->collectionProcessor->process($searchCriteria, $collection);

        $searchResults = $this->searchResultsFactory->create();
        $searchResults->setSearchCriteria($searchCriteria);
        $searchResults->setItems($collection->getItems());
        $searchResults->setTotalCount($collection->getSize());

        return $searchResults;
    }
}

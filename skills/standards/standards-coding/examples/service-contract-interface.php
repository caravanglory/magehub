<?php
declare(strict_types=1);

namespace Vendor\Module\Api;

use Magento\Framework\Api\SearchCriteriaInterface;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\NoSuchEntityException;
use Vendor\Module\Api\Data\EntityInterface;
use Vendor\Module\Api\Data\EntitySearchResultsInterface;

interface EntityRepositoryInterface
{
    /**
     * @param int $entityId
     * @return EntityInterface
     * @throws NoSuchEntityException
     */
    public function getById(int $entityId): EntityInterface;

    /**
     * @param EntityInterface $entity
     * @return EntityInterface
     * @throws CouldNotSaveException
     */
    public function save(EntityInterface $entity): EntityInterface;

    /**
     * @param EntityInterface $entity
     * @return bool
     */
    public function delete(EntityInterface $entity): bool;

    /**
     * @param SearchCriteriaInterface $searchCriteria
     * @return EntitySearchResultsInterface
     */
    public function getList(SearchCriteriaInterface $searchCriteria): EntitySearchResultsInterface;
}

#!/usr/bin/env bash
# Enter the php-fpm container and run Magento CLI work inside it.
# NEVER run these commands on the host — the PHP version, extensions,
# and file ownership all differ from the container.

warden shell

# Inside the container:
bin/magento setup:upgrade
bin/magento setup:di:compile
bin/magento setup:static-content:deploy -f en_US
bin/magento cache:flush
bin/magento indexer:reindex

composer install --no-interaction
composer require vendor/module:^1.2

php -v           # confirm the container PHP version
php -m | grep -i intl

exit             # leave the container

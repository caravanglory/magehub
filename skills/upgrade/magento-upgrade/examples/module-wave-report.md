# Module Wave Report

## Wave 1

Modules with no custom-module dependencies. Fix these before dependent modules.

| Module            | Depends on    | Impact | Reason                          |
| ----------------- | ------------- | ------ | ------------------------------- |
| Vendor_Foundation | Magento_Store | MEDIUM | Plugin on core service contract |

## Wave 2

Modules that depend on Wave 1 providers.

| Module          | Depends on                          | Impact | Reason                               |
| --------------- | ----------------------------------- | ------ | ------------------------------------ |
| Vendor_Checkout | Vendor_Foundation, Magento_Checkout | HIGH   | Checkout plugin and GraphQL resolver |

## Stop Conditions

- Composer cannot resolve target package set.
- A HIGH impact module lacks approval for the proposed fix.
- `setup:di:compile` fails after a wave and the failure cannot be isolated.
- Database schema/data migration is not reversible without a fresh backup.

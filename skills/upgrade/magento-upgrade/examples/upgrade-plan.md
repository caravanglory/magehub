# Magento Upgrade Plan

## Summary

- Source version:
- Target version:
- Edition:
- Runtime changes:
- Custom modules:
- Third-party packages:
- Deployment model:

## Readiness Gates

- [ ] Clean working tree or dedicated upgrade branch
- [ ] Database backup policy confirmed
- [ ] Composer credentials available
- [ ] Target system requirements checked
- [ ] Third-party extension compatibility checked
- [ ] UCT availability decided

## Wave Plan

| Wave  | Scope                 | Modules or packages | Risk | Verification          |
| ----- | --------------------- | ------------------- | ---- | --------------------- |
| 0     | Platform and Composer |                     |      | composer install      |
| 1     | Base custom modules   |                     |      | setup:di:compile      |
| 2     | Dependent modules     |                     |      | targeted tests        |
| Final | Themes and deployment |                     |      | static-content deploy |

## Impact Table

| Module        | Impact | Evidence | Proposed fix | Verification |
| ------------- | ------ | -------- | ------------ | ------------ |
| Vendor_Module | HIGH   |          |              |              |

## Pending Manual Work

| Owner | Module/file | Risk | Next action |
| ----- | ----------- | ---- | ----------- |

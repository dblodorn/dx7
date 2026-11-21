# Spec Delta

## REMOVED Requirements

### Requirement: Silent engine skeleton
**Reason**: The emulator replaces the silent engine; `dx7-engine` defines what it plays.
**Migration**: None for hosts: the API is unchanged, and `setOperators` is added.

# Spec Delta

## Purpose

Defines how DX7 voices are kept in the browser and moved as `.syx` files.

## ADDED Requirements

### Requirement: Local library
The LIBRARY sheet's LOCAL tab SHALL keep voices in the browser across visits, with save, open, send, delete (confirmed) and search by name.

#### Scenario: Save and reload
- **WHEN** a voice is saved and the page is reloaded
- **THEN** it is in LOCAL with the same 155 bytes

### Requirement: Import and export
IMPORT .SYX SHALL accept files of VCED and VMEM messages, in any mix, and add the chosen voices. EXPORT SHALL write one voice as a VCED file. EXPORT BANK SHALL write up to 32 checked voices, in list order, as one VMEM file, filling the rest with INIT VOICE.

#### Scenario: Bank export round trip
- **WHEN** 20 voices are exported as a bank and the file is imported again
- **THEN** the import offers those 20 voices, in order, followed by 12 INIT VOICEs, with identical bytes

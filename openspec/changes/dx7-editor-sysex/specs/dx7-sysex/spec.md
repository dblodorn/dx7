# Spec Delta

## Purpose

Defines how Yamaha DX7 voice and bank System Exclusive messages are read and written, so dumps from the hardware, from `.syx` files and from this editor are interchangeable byte for byte.

## ADDED Requirements

### Requirement: Single voice framing
A single voice (VCED) SHALL be `F0 43 0n 00 01 1B`, then 155 data bytes, then a checksum, then `F7` (163 bytes), where `n` is the channel minus one. The checksum SHALL be the two's complement of the sum of the 155 data bytes, masked to 7 bits.

#### Scenario: Round trip
- **WHEN** a VCED built by the editor is parsed and re-encoded
- **THEN** the same 163 bytes come back, and its name reads from data bytes 145–154

#### Scenario: Damaged dump
- **WHEN** one data byte of a VCED is changed
- **THEN** parsing reports a checksum mismatch and yields no voice

### Requirement: Bank framing and packing
A 32-voice bank (VMEM) SHALL be `F0 43 0n 09 20 00`, then 4096 data bytes (32 voices × 128), then a checksum over those bytes, then `F7` (4104 bytes). Each packed voice SHALL follow the data format sheet's layout, with operators OP6 first and the bit-packed bytes 11, 12, 13, 15, 110, 111 and 116. Unpacking SHALL give the same 155 bytes a VCED of that voice holds, except parameter 155, which neither format stores.

#### Scenario: Bank round trip
- **WHEN** a bank whose unused bits are 0 is unpacked to 32 voices and packed again
- **THEN** the 4104 bytes are identical

#### Scenario: Packed fields
- **WHEN** a voice with detune 14 and rate scaling 7 on OP6 is packed
- **THEN** packed byte 12 is `0x77`

### Requirement: Lossless edits
Changing a parameter SHALL change only that parameter's byte in the 155-byte voice. Every other byte, including out-of-range values received from elsewhere, MUST stay as received.

#### Scenario: One field
- **WHEN** a received voice has OP3's output level changed and is sent as a VCED
- **THEN** the sent dump differs from the received one only in data byte 79 and the checksum

### Requirement: Parameter changes
A voice parameter change SHALL be `F0 43 1n`, then `0x00` for parameters 0–127 or `0x01` for 128–155, then the low 7 bits of the parameter number, then the value, then `F7`.

#### Scenario: Operator enable
- **WHEN** OP1 is switched off with the other five on, on channel 1
- **THEN** `F0 43 10 01 1B 1F F7` is sent

### Requirement: Values are stored values
Parameters SHALL be shown as stored, except where the data format sheet or the owner's manual states a conversion (break point and transpose as note names, detune as −7…+7, curve and LFO wave names). Facts whose sources conflict or are only inferred SHALL be marked unverified until a hardware or known-good dump settles them.

#### Scenario: Range clamp
- **WHEN** FEEDBACK is set to 12
- **THEN** it is stored as 7

### Requirement: SysEx files
A `.syx` file SHALL be split into its messages; every VCED and VMEM in it SHALL be read in order, damaged ones reported, and other Yamaha formats reported as not supported.

#### Scenario: Mixed file
- **WHEN** a file holds a VCED, an ACED and a VMEM
- **THEN** 33 voices are offered for import and the ACED is reported as not supported

# Spec Delta

## ADDED Requirements

### Requirement: Shared voices
The LIBRARY sheet SHALL have a SHARED tab listing the public DX7 voices from dmbk-graphql-api, newest first, with ALL / YOURS and a name search. SHARE CURRENT SHALL save the voice being edited under this browser's device key. A voice saved with that key SHALL be marked YOURS and can be renamed, updated or deleted from here. OPEN SHALL load a listed voice into the editor, and SAVE TO LOCAL SHALL copy it to LOCAL. An obscene name SHALL be refused before any request.

#### Scenario: Share and see it
- **WHEN** the user presses SHARE CURRENT on a voice named MY VOICE
- **THEN** the save sends the 155 bytes as 208 base64 characters with a 43-character device key, and MY VOICE appears in the list marked YOURS

### Requirement: Shared banks
The LIBRARY sheet SHALL have a BANKS tab listing public DX7 banks of 32 slots (the factory ROM1A–ROM4B cards among them), newest first, with ALL / YOURS and a name search. Opening a bank SHALL show its 32 slots by number and name. A filled slot SHALL open its voice in the editor. SEND BANK SHALL send the bank as one 32-voice dump, with empty slots as INIT VOICE. .SYX SHALL download the same dump, and COPY TO LOCAL SHALL add the bank's voices to LOCAL. SHARE CHECKED AS BANK SHALL share LOCAL's checked voices (each once) and save them, in order, as a named bank owned by this browser's device key, which can rename or delete it.

#### Scenario: Send a factory card
- **WHEN** the user opens ROM1A and presses SEND BANK with a MIDI OUT port chosen
- **THEN** one 4104-byte message holding ROM1A's 32 voices is sent


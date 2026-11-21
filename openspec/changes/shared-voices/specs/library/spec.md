# Spec Delta

## ADDED Requirements

### Requirement: Shared voices
The LIBRARY sheet SHALL have a SHARED tab listing the public DX7 voices from dmbk-graphql-api, newest first, with ALL / YOURS and a name search. SHARE CURRENT SHALL save the voice being edited under this browser's device key. A voice saved with that key SHALL be marked YOURS and can be renamed, updated or deleted from here. OPEN SHALL load a listed voice into the editor, and SAVE TO LOCAL SHALL copy it to LOCAL. An obscene name SHALL be refused before any request.

#### Scenario: Share and see it
- **WHEN** the user presses SHARE CURRENT on a voice named MY VOICE
- **THEN** the save sends the 155 bytes as 208 base64 characters with a 43-character device key, and MY VOICE appears in the list marked YOURS

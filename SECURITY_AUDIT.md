# Security Audit

## Strengths

- AES-256-GCM is used with random 12-byte IVs and auth tags.
- Master key is stored via platform keychain APIs.
- Enrollment signature service fails closed instead of accepting unsigned identities.
- SQLite foreign keys are enabled at startup.
- Attendance and queue records are linked by foreign key.

## P0 Findings

- ECDSA enrollment verification is not implemented, so production enrollment is blocked.
- Missing MobileFaceNet model prevents real embedding verification.

## P1 Findings

- `SecurityService` caches the base64 AES key in JS memory for the session and does not scrub buffers after use.
- `AndroidKeystoreService` stores raw AES key material as a Keychain password instead of generating a non-exportable Android Keystore AES key.
- Offline queue rows are not signed/MACed. Local DB tampering can alter queue state or payload linkage.
- Attendance chain fields (`previous_hash`, `record_hash`, `signature`) exist but are not populated in `queueTransaction`.

## P2 Findings

- Encrypted embeddings are stored in a column named `embedding_hash`, which is misleading.
- No replay nonce or monotonic counter is persisted for offline sync payloads.
- Key rotation method overwrites under the same Keychain service without migration metadata.

## Required Hardening

- Implement server public-key signature verification for enrollment packages.
- Sign or HMAC attendance and queue rows with device-held key material.
- Fill attendance hash-chain/signature fields inside the same SQLite transaction.
- Avoid long-lived plaintext keys/embeddings in JS memory where possible.

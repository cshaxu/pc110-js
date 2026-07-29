# Asset Policy

ROMs, BIOS dumps, firmware, disk images, ISOs, VHDs, VMDKs, and similar media are protected local assets unless redistribution rights are explicitly documented.

## Rules

- Protected assets are not committed by default.
- Local assets belong under ignored `local-assets/` paths or are selected through the browser.
- Runtime and test configuration uses relative paths, never developer-machine absolute paths.
- Every required asset has a logical identifier, expected size, SHA-256, role, required/optional state, and provenance note.
- Hash mismatch and missing-asset errors must identify the logical asset and expected value without exposing unrelated local paths.
- Tests must use generated fixtures or redistributable assets whenever the protected content is not essential to the assertion.
- A screenshot or trace that exposes protected content must be reviewed before commit.
- Copying an asset from PCjs or PC110-EMU requires separate redistribution analysis; repository presence is not permission.

## Local Manifest Contract

M2 will define a machine-readable ignored local manifest. It must map logical asset identifiers to relative local paths and must not become a source of machine-specific paths in committed files.

An example manifest may contain placeholders and expected hashes but no protected bytes.

## Recorded Local Assets

- The known-good DOS floppy identity is recorded in [local-media-fdd-fadeb3a2.md](../baselines/local-media-fdd-fadeb3a2.md).
- PC110 reference firmware identities are recorded in [pc110-emu-81235b5.md](../baselines/pc110-emu-81235b5.md).

These records identify local inputs; they do not grant redistribution rights.

# M2 T1 S5 Verification: Local Assets

## Result

Pass.

## Evidence

- Descriptors reject absolute, parent, and backslash paths.
- Shared validation checks logical metadata, exact bytes, and SHA-256 using Web
  Crypto.
- Focused tests passed for matching and mismatched bytes.
- The manifest example records the known-good floppy identity while Git ignores
  all protected bytes in `local-assets/`.

# M2 T2 S3 P445 PCjs Change Report: System Selector Fault Classification

## Summary

- Affected PCjs-derived subsystem: rebuilt `0F 00` system-selector execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: valid but non-present LLDT/LTR descriptors deliver
  `#NP(selector)` instead of `#GP` without a selector error code.

## Justification

- Configuration or adapter code cannot classify generic CPU selector faults.
- NXVM `_s_load_ldtr`, `_s_load_tr`, and `_ksa_load_sreg` distinguish invalid
  selectors/types from non-present LDT/TSS descriptors.
- This preserves the project-native CPU and introduces no PC110 behavior.

## Verification

- Focused tests cover LLDT and LTR non-present descriptor faults, error codes,
  and unchanged LDTR/TR state.
- The full project gate remains required before commit.

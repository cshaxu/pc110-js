# M2 T2 S3 P450 PCjs Change Report: Segment-Load Fault Matrix

## Summary

- Affected PCjs-derived subsystem: rebuilt protected segment loading.
- Changed behavior: none; this part closes focused fault-classification
  evidence for existing project-native behavior.

## Justification

- NXVM `_ksa_load_sreg` distinguishes code, data, and stack selector faults.
- A compact direct matrix is required to prove vectors, error codes, and cache
  transaction behavior before claiming this shared CPU boundary is closed.

## Verification

- Focused tests cover type, presence, RPL/DPL, and unchanged-cache failures.
- The full project gate remains required before commit.

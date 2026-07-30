# M2 T2 S5 P6 PCjs Change Report: Rebuilt Machine Core

## Summary

- Affected PCjs-derived subsystem: generic PC/AT machine run/reset boundary.
- Changed behavior: project-native rebuilt components are composed into one
  deterministic core; no device behavior is introduced.

## Justification

- S5 requires reset, bounded stepping, and trace contracts to reach the next
  observable hardware boundary without reactivating the legacy CPU.
- The core keeps port behavior explicit and delegates device ownership to later
  subtasks or the S6 verification harness.

## Verification

- Focused tests cover reset state, bounded HLT run behavior, port dispatch, and
  unified CPU/port trace events.
- The full project gate remains required before commit.

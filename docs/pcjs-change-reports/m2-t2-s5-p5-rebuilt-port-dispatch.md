# M2 T2 S5 P5 PCjs Change Report: Rebuilt Port Dispatch

## Summary

- Affected PCjs-derived subsystem: generic PC/AT I/O bus contract.
- Changed behavior: the rebuilt CPU receives a project-native width-aware port
  dispatcher; no port device behavior is supplied.

## Justification

- CPU I/O instructions require a stable 8/16/32-bit dispatch boundary before
  machine composition can report the next real device blocker.
- Returning synthetic values for unclaimed ports would hide missing hardware.

## Verification

- Focused tests cover width masking, read/write ownership, trace events, range
  conflicts, and explicit unmapped-port errors.
- The full project gate remains required before commit.

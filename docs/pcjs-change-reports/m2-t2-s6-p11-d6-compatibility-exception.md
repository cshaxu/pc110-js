# M2 T2 S6 P11 PCjs Change Report: D6 Compatibility Exception

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential
  oracle.
- Changed product behavior: none.

## Justification

- The pinned PCjs oracle advances real-mode D6 without fault delivery.
- NXVM `vcpuins.c:13605` and ledger P363 require project-native vector-six
  undefined-opcode delivery.
- The owner approved retaining the NXVM/80386 behavior on 2026-07-30.

## Verification

- The minimized D6 fixture and normalized deltas remain in the conflict record.
- EXC-001 in the sole S6 exception register scopes the approved divergence to
  real-mode D6 only.

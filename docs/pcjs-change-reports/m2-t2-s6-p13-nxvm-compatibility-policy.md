# M2 T2 S6 P13 PCjs Change Report: NXVM Compatibility Policy

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential
  oracle.
- Changed product behavior: none.

## Justification

- The owner designated NXVM as the decisive M2 CPU behavior authority.
- NXVM-aligned PCjs differences require durable, scoped documentation, not
  per-case approval or a rebuilt behavior change.

## Verification

- EXC-001 and EXC-002 are both in the sole project-wide register.
- The P12 logical-AF conflict evidence remains in its verification record,
  while the runtime CPU behavior is unchanged.

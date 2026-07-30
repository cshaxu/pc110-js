# M2 T2 S3 P418: Protected I/O Admission

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU core behavior.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: scalar and string port I/O now checks protected CPL/IOPL,
  virtual-8086, and 32-bit TSS bitmap admission before observable side effects.
- Active milestone need: complete the NXVM-ordered CPU coverage path without
  synthetic device behavior.

## Justification

- Configuration and adapters cannot supply CPU privilege admission.
- NXVM defines the protected I/O admission condition, while its I/O-map helper
  is explicitly unfinished; the bitmap implementation is project-native.
- Denial is delivered as rebuilt `#GP(0)` and does not issue a port-bus access.
- Compatibility risk is limited to previously unguarded protected I/O paths.

## Implementation Boundary

- Source and destination files: rebuilt I/O instruction modules, executor, and
  `protection/io-permission.ts`.
- No PCjs source is modified or imported at runtime.
- Generic PC/AT impact: architectural I/O privilege enforcement only.
- PC110-specific impact: none.

## Verification

- Focused scalar, string, and permission tests cover direct access, bitmap
  allow/deny, v86, TSS layout, truncation, and `#GP(0)` delivery.
- The full project gate is recorded in the paired verification note.

## Future Path

- No device behavior was added; later S5 work supplies concrete device routing.
- Task switching remains a separate CPU architecture dependency.

# M2 T2 S6 P7 PCjs Change Report: Declared Differential Ports

## Summary

- Affected PCjs-derived subsystem: test-only Busx86 port-notification boundary.
- Changed behavior: none in PCjs or the product runtime.

## Justification

- A port journal must observe output-only ports without inventing a matching
  input device value.
- The declared-port contract supports the same 8-, 16-, and 32-bit surface as
  rebuilt port instructions while remaining test-only.

## Verification

- DX-addressed word IN/OUT on a declared 16-bit port matches both CPU paths.
- This configuration remains an oracle fixture and does not emulate hardware.

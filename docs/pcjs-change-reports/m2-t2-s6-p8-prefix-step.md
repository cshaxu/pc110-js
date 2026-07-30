# M2 T2 S6 P8 PCjs Change Report: Logical Prefix Step

## Summary

- Affected PCjs-derived subsystem: test-only CPUx86 debugger stepping behavior.
- Changed behavior: none in PCjs or the product runtime.

## Justification

- PCjs `stepCPU(0)` exposes each prefix as a debugger step, whereas one x86
  instruction includes its prefix sequence and opcode.
- The differential oracle must aggregate those implementation steps before
  comparing architectural instruction results.

## Verification

- `66 ED` and `66 EF` execute as two logical dword DX I/O instructions.
- Register state, EIP, and I/O journal match the rebuilt decoder boundary.

# M2 T2 S3 P326: Rebuilt Instruction-Step Boundary

## Summary

- Affected PCjs-derived subsystem: generic CPU stepping and instruction fetch.
- Changed behavior: none in the active machine runtime.
- Active milestone need: compose the rebuilt execution dependencies before a
  complete opcode interval is dispatched.

## Boundary And Verification

The rebuilt stepper fetches through cached CS:EIP, decodes prefixes locally,
retains instruction-start state for tracing, and delegates dispatch without
importing legacy CPU code, PCjs, or NXVM. Focused coverage verifies the high-ROM
80386 reset vector and EIP commit. The full project gate is required before
commit. No PC110 behavior is involved.

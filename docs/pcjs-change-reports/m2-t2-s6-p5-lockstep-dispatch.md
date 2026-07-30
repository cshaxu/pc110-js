# M2 T2 S6 P5 PCjs Change Report: Lockstep Dispatch Harness

## Summary

- Affected PCjs-derived subsystem: test-only CPUx86 one-step oracle.
- Changed behavior: none in PCjs or the product runtime.

## Justification

- Instruction coverage must be driven by execution through the shared rebuilt
  dispatcher, not by one handwritten differential fixture per opcode.
- A program-level lockstep loop records one comparison per executed instruction
  and scales to opcode matrices and ROM traces without an adapter per opcode.

## Verification

- A mixed real-mode program automatically compares MOV, memory store, DEC, and
  NOP as four separate execution steps.
- Each result includes pre-state, post-state, and changed-memory delta.

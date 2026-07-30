# M2 T2 S6 Differential Cases

## Harness Contract

Each case initializes two independent one-megabyte RAM images and equivalent
real-mode CPU state. A case is a program byte stream and an instruction budget,
not an individual opcode fixture. The rebuilt shared dispatcher and the PCjs
oracle each execute one instruction per loop iteration. The harness records
pre-state, post-state, and sorted changed-byte RAM deltas for every iteration.
It does not yet record writes whose value is unchanged.

## P3 Passing Cases

| Case | Bytes | Evidence |
| --- | --- | --- |
| NOP | `90` | EIP advance with unchanged architectural state |
| MOV AX, immediate | `B8 34 12` | 16-bit register write and EIP advance |
| MOV AL, immediate | `B0 5A` | low-byte write with upper-register preservation |
| ADD AX, immediate | `05 01 00` | arithmetic result and flags |
| DEC CX | `49` | register decrement and flags |
| MOV moffs, AL | `A2 00 02` | register/EIP state and changed RAM byte at `0200` |
| Mixed program | `B0 5A A2 00 02 49 90` | four automatic instruction-by-instruction comparisons |

## Active Expansion Order

1. ModR/M addressing and broader memory-delta families.
2. I/O journals and explicit unavailable-port classification.
3. Prefix, default-32, and 66/67 matrices.
4. Exceptions, fault EIP, protected mode, descriptor state, paging, and
   privilege transitions.
5. Selected-ROM lockstep slices subject to the same exclusion ledger.

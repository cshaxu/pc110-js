# M2 T2 S6 Differential Cases

## Harness Contract

Each case initializes two independent one-megabyte RAM images and equivalent
real-mode CPU state. The rebuilt CPU and the PCjs CPU oracle each execute one
guest instruction. P3 compares general registers, EIP, EFLAGS, and normalized
CS/DS/ES/SS fields.

## P3 Passing Cases

| Case | Bytes | Evidence |
| --- | --- | --- |
| NOP | `90` | EIP advance with unchanged architectural state |
| MOV AX, immediate | `B8 34 12` | 16-bit register write and EIP advance |
| MOV AL, immediate | `B0 5A` | low-byte write with upper-register preservation |
| ADD AX, immediate | `05 01 00` | arithmetic result and flags |
| DEC CX | `49` | register decrement and flags |

## Active Expansion Order

1. Memory-write deltas and ModR/M addressing.
2. I/O journals and explicit unavailable-port classification.
3. Prefix, default-32, and 66/67 matrices.
4. Exceptions, fault EIP, protected mode, descriptor state, paging, and
   privilege transitions.
5. Selected-ROM lockstep slices subject to the same exclusion ledger.

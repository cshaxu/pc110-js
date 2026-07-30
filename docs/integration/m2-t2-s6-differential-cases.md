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
| Byte port program | `E4 80 E6 80` | automatic input/output journal comparison |
| `00-3F` arithmetic slice | ADD, ADC, SBB, SUB, CMP accumulator forms | automatic register and flag lockstep |
| `40-4F` program | all INC and DEC register forms | automatic register and EFLAGS lockstep |
| `50-5F` program | all PUSH and POP register forms | automatic stack-memory and register lockstep |
| `60-61` program | PUSHA and POPA | automatic frame-memory and register lockstep |
| `68-6B` program | PUSH immediate and immediate IMUL forms | automatic stack, register, and flag lockstep |
| `6C-6E` program | INSB and OUTSB | automatic port, memory, and index lockstep |
| `70-7F` program | all short conditional branches | automatic EIP and flag-preservation lockstep |
| `80-83` arithmetic slice | ADD, ADC, SBB, SUB, CMP immediate registers | automatic register and flag lockstep |
| `84-8D` slice | TEST, XCHG, general MOV, LEA | automatic register, flag, and EIP lockstep |
| `90-99`, `9E-9F` slice | accumulator XCHG, sign extension, flag transfer | automatic register and flag lockstep |
| `A0-A3` program | byte and word accumulator moffs loads/stores | automatic register, memory, and EIP lockstep |
| `B0-BF` program | every byte and word immediate-register form | automatic register-width and EIP lockstep |

## Active Expansion Order

1. ModR/M addressing and broader memory-delta families.
2. Word/dword and DX-addressed I/O journal forms.
3. Prefix, default-32, and 66/67 matrices.
4. Exceptions, fault EIP, protected mode, descriptor state, paging, and
   privilege transitions.
5. Selected-ROM lockstep slices subject to the same exclusion ledger.

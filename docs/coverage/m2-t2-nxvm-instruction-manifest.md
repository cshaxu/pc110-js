# M2 T2 NXVM CPU Instruction Manifest

## Scope

This is the implementation inventory for M2 T2. Its audit source is the
external, read-only NXVM `src/device/vcpu.h` and `src/device/vcpuins.c`; NXVM
is not a build dependency and its C source is not copied. Every row requires a
project-native TypeScript implementation and focused tests before T2 closure.
Intel IA-32 documentation resolves semantic conflicts. PCjs remains the PC/AT
and whole-machine comparison reference.

## CPU Model And Execution Infrastructure

| Family | NXVM evidence | M2 status |
| --- | --- | --- |
| Register, EFLAGS, segment-cache, descriptor, control, debug, and test-register state | `vcpu.h` state and descriptor definitions | Partial |
| Real/protected segmentation, GDT, LDT, IDT, TSS, and privilege validation | `_ksa_*`, `_s_*`, and `_ser_*` helpers | Partial |
| Linear address translation, paging, page-table flags, and access checks | `_kma_*` helpers and paging definitions | Partial |
| Prefix, operand/address size, ModR/M, SIB, immediate, and moffs decoding | `_d_*` helpers and prefix handlers | Partial |
| Stack, near/far transfer, interrupt, return, and exception delivery | `_kec_*` and `_ser_*` helpers | Partial |
| Port I/O, trace, and instruction dispatch boundaries | `_p_*`, `ExecIns`, and `ExecInt` | Partial |

## One-Byte Instruction Families

| Family | NXVM handlers or groups | M2 status |
| --- | --- | --- |
| Integer arithmetic and logic | `ADD`, `OR`, `ADC`, `SBB`, `AND`, `SUB`, `XOR`, `CMP`; groups `80`, `81`, and `83` | Partial |
| Decimal and ASCII adjust | `DAA`, `DAS`, `AAA`, `AAS`, `AAM`, and `AAD` | Not started |
| Increment, decrement, negate, multiply, divide, and test | register `INC`/`DEC`; groups `F6`, `F7`, `FE`, and `FF` | Partial |
| Data movement and exchange | `MOV`, `XCHG`, `LEA`, `LES`, `LDS`, `MOVSX`, `MOVZX`, moffs, immediate, and segment forms | Partial |
| Stack and frame operations | register/immediate/segment `PUSH`/`POP`, `PUSHA`, `POPA`, `PUSHF`, `POPF`, `ENTER`, and `LEAVE` | Partial |
| Control transfer | `CALL`, `JMP`, `RET`, `RETF`, `INT`, `INTO`, `IRET`, conditional branches, `LOOP*`, and `JCXZ` | Partial |
| Shift and rotate | groups `C0`, `C1`, `D0` through `D3` | Partial |
| String and translation | `MOVS`, `CMPS`, `STOS`, `LODS`, `SCAS`, `INS`, `OUTS`, and `XLAT` | Partial |
| Port I/O | immediate and `DX` `IN`/`OUT`, plus string I/O | Partial |
| Flag, halt, and synchronization | `CLC`, `STC`, `CMC`, `CLI`, `STI`, `CLD`, `STD`, `HLT`, `WAIT`, and `LOCK` | Partial |
| Segment, repeat, and size prefixes | `ES`, `CS`, `SS`, `DS`, `FS`, `GS`, `REPNE`, `REP`, `66`, and `67` | Partial |

## Two-Byte Instruction Families

| Family | NXVM handlers or groups | M2 status |
| --- | --- | --- |
| System and descriptor operations | `0F 00`, `0F 01`, `LAR`, `LSL`, `CLTS`, `MOV` control/debug/test registers | Partial |
| Conditional transfer and state | `Jcc rel32` and `SETcc` | Partial |
| Bit and double-shift operations | `BT`, `BTS`, `BTR`, `BTC`, `0F BA`, `BSF`, `BSR`, `SHLD`, and `SHRD` | Partial |
| Extended segment operations | `PUSH`/`POP FS`, `PUSH`/`POP GS`, `LSS`, `LFS`, and `LGS` | Partial |
| Signed multiplication and extension | two-operand `IMUL`, `MOVSX`, and `MOVZX` | Partial |
| NXVM explicit undefined entries | `WBINVD`, `WRMSR`, `RDMSR`, `CPUID`, and `RSM` | Implemented: `#UD` behavior only |

## Audit Rule

`Partial` never counts as completion. Before an item changes to `Implemented`,
the coverage matrix must link focused tests for 16-bit and 32-bit execution
where applicable, faults and restart behavior where applicable, and the NXVM
source location used for the audit.

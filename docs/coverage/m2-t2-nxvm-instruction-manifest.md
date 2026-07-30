# M2 T2 NXVM CPU Instruction Manifest

## Scope

This is the implementation inventory for M2 T2. Its audit source is the
external, read-only NXVM `src/device/vcpu.h` and `src/device/vcpuins.c`; NXVM
is not a build dependency and its C source is not copied. Every row requires a
project-native TypeScript implementation and focused tests before T2 closure.
NXVM is the decisive CPU behavior authority. PCjs remains the PC/AT and
whole-machine comparison reference.

`Implemented NXVM handler coverage` records that the listed executable NXVM
handler set has project-native implementation and focused evidence. It is not
an S3 closure claim when it shares an unfinished descriptor, task, gate,
interrupt, paging, or fault-delivery dependency. `Partial architecture
closure` identifies those remaining cross-family dependencies.

## CPU Model And Execution Infrastructure

| Family | NXVM evidence | M2 status |
| --- | --- | --- |
| Register, EFLAGS, segment-cache, descriptor, control, debug, and test-register state | `vcpu.h` state and descriptor definitions | Partial architecture closure: state and executable register transfers, including NXVM's defined `MOV DRx` forms, are evidenced by P382, P384, P388, and P428. NXVM does not implement a hardware-breakpoint engine. Task-switch state is an NXVM TODO-aligned exclusion recorded by P441. |
| Real/protected segmentation, GDT, LDT, IDT, TSS, and privilege validation | `_ksa_*`, `_s_*`, and `_ser_*` helpers | Partial architecture closure: P388-P390, P396-P397, P400-P401, P415-P416, and P443 cover implemented paths and descriptor Accessed-bit writeback; complete descriptor fault classification remains. Task/call gates are NXVM TODO-aligned exclusions recorded by P441. |
| Linear address translation, paging, page-table flags, and access checks | `_kma_*` helpers and paging definitions | Partial architecture closure: P392, P394-P395, P411, P433, P447, and P451 cover rebuilt walks, permissions, A/D updates, delivery, escalation, supervisor system-table access, and cross-page preflight. |
| Prefix, operand/address size, ModR/M, SIB, immediate, and moffs decoding | `_d_*` helpers and prefix handlers | Implemented NXVM handler coverage: P369 and P431 close prefix and length behavior; family-level use is evidenced by P417-P430. |
| Stack, near/far transfer, interrupt, return, and exception delivery | `_kec_*` and `_ser_*` helpers | Partial architecture closure: implemented handler paths are evidenced by P400-P416, P422/P425/P427, and P444 target-code validation; remaining non-NXVM-TODO privilege and fault classification cases remain. Task/call-gate and outer-RETF boundaries are NXVM TODO-aligned exclusions recorded by P441. |
| Port I/O, trace, and instruction dispatch boundaries | `_p_*`, `ExecIns`, and `ExecInt` | Implemented CPU handler coverage: P355, P359, P410, P418, and P434; project-native concrete port routing remains S5 work. |

## One-Byte Instruction Families

| Family | NXVM handlers or groups | M2 status |
| --- | --- | --- |
| Integer arithmetic and logic | `ADD`, `OR`, `ADC`, `SBB`, `AND`, `SUB`, `XOR`, `CMP`; groups `80`, `81`, and `83` | Implemented NXVM handler coverage: P417 and P420. |
| Decimal and ASCII adjust | `DAA`, `DAS`, `AAA`, `AAS`, `AAM`, and `AAD` | Implemented NXVM handler coverage: P405, P417, and P426. |
| Increment, decrement, negate, multiply, divide, and test | register `INC`/`DEC`; groups `F6`, `F7`, `FE`, and `FF` | Implemented NXVM handler coverage: P417, P420, and P427; shared fault architecture remains separately tracked. |
| Data movement and exchange | `MOV`, `XCHG`, `LEA`, `LES`, `LDS`, `MOVSX`, `MOVZX`, moffs, immediate, and segment forms | Implemented NXVM handler coverage: P420, P423-P425, and P430; shared segment architecture remains separately tracked. |
| Stack and frame operations | register/immediate/segment `PUSH`/`POP`, `PUSHA`, `POPA`, `PUSHF`, `POPF`, `ENTER`, and `LEAVE` | Implemented NXVM handler coverage: P417, P419, P422, and P425; NXVM TODO-aligned task/call-gate transitions are recorded by P441. |
| Control transfer | `CALL`, `JMP`, `RET`, `RETF`, `INT`, `INTO`, `IRET`, conditional branches, `LOOP*`, and `JCXZ` | Implemented NXVM handler coverage: P422, P425, P427, P429, and P432; NXVM TODO-aligned task/call-gate paths are recorded by P441. |
| Shift and rotate | groups `C0`, `C1`, `D0` through `D3`; all `/6` forms fault with `#UD` | Implemented NXVM handler coverage: P425-P426. |
| String and translation | `MOVS`, `CMPS`, `STOS`, `LODS`, `SCAS`, `INS`, `OUTS`, and `XLAT` | Implemented NXVM handler coverage: P419, P423, and P426. |
| Port I/O | immediate and `DX` `IN`/`OUT`, plus string I/O | Implemented CPU handler coverage: P359, P418, P419, and P427; concrete port routing remains S5 work. |
| Flag, halt, and synchronization | `CLC`, `STC`, `CMC`, `CLI`, `STI`, `CLD`, `STD`, `HLT`, `WAIT`, and `LOCK` | Implemented NXVM handler coverage: P369, P410, P414, P421-P422, and P427. |
| Segment, repeat, and size prefixes | `ES`, `CS`, `SS`, `DS`, `FS`, `GS`, `REPNE`, `REP`, `66`, and `67` | Implemented NXVM handler coverage: P419, P423, and P431. |

## Two-Byte Instruction Families

| Family | NXVM handlers or groups | M2 status |
| --- | --- | --- |
| System and descriptor operations | `0F 00`, `0F 01`, `LAR`, `LSL`, `CLTS`, `MOV` control/debug/test registers | Implemented NXVM handler coverage: P428; NXVM TODO-aligned task and call-gate boundaries are recorded by P441. |
| Conditional transfer and state | `Jcc rel32` and `SETcc` | Implemented NXVM handler coverage: P429 and P432. |
| Bit and double-shift operations | `BT`, `BTS`, `BTR`, `BTC`, `0F BA`, `BSF`, `BSR`, `SHLD`, and `SHRD` | Implemented NXVM handler coverage: P430. |
| Extended segment operations | `PUSH`/`POP FS`, `PUSH`/`POP GS`, `LSS`, `LFS`, and `LGS` | Implemented NXVM handler coverage: P430; shared segment architecture remains separately tracked. |
| Signed multiplication and extension | two-operand `IMUL`, `MOVSX`, and `MOVZX` | Implemented NXVM handler coverage: P419 and P430. |
| NXVM explicit undefined entries | `WBINVD`, `WRMSR`, `RDMSR`, `CPUID`, and `RSM` | Implemented: `#UD` behavior only |

## Audit Rule

`Partial` never counts as completion. Before an item changes to `Implemented`,
the coverage matrix must link focused tests for 16-bit and 32-bit execution
where applicable, faults and restart behavior where applicable, and the NXVM
source location used for the audit.

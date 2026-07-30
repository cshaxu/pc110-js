# M2 T2 80386 Coverage Matrix

## Purpose

This matrix is the M2 T2 CPU completion ledger. It prevents a ROM-observed
opcode from being mistaken for complete 80386 coverage. `Implemented` requires
focused tests and a PCjs behavior record. `Partial` is not completion credit.

## Authorities

- PCjs at `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70` is the behavior and
  compatibility authority.
- Intel 80386 architecture is the semantic requirement.
- NXVM `vcpu.h` and `vcpuins.c` are M2-only structural and coverage references.
  They are not behavior authorities or source code inputs. NXVM BIOS, POST,
  I/O, global-state, macro, and guest-service behavior is excluded.

## CPU State And Translation

| Area | Status | Evidence and remaining boundary |
| --- | --- | --- |
| 32-bit general registers and EFLAGS | Implemented | Project CPU state and focused state tests. |
| Segment selectors and hidden caches | Partial | Base, limit, D/B, and selected protected-mode loads exist; complete descriptor validation remains required. |
| GDTR, IDTR, TR, CR0, CR2, and CR3 | Partial | State and selected system instructions exist; LDTR, debug registers, and complete control-register semantics remain absent. |
| Real/protected address translation | Partial | Segment translation and selected protection checks exist. |
| 80386 paging and page faults | Partial | Page-table translation helpers exist; complete execution-core integration and fault matrix remain required. |

## Decode And Data Paths

| Area | Status | Evidence and remaining boundary |
| --- | --- | --- |
| Prefix context (`66`, `67`, repeat, segment, LOCK boundary) | Partial | Context parsing and selected migrations exist; all opcode families and LOCK semantics remain. |
| 16-bit and 32-bit ModR/M plus SIB | Partial | Shared decoders and selected MOV/ALU paths exist; every instruction family must use them. |
| Integer ALU and flags | Partial | Word/dword register and selected immediate forms, plus focused context ALU tests; byte and group migration remain. |
| Shifts, rotates, multiply, divide, bit operations | Partial | Selected forms exist; complete 16/32-bit form, count, flags, and fault coverage remains. |
| String instructions | Partial | Selected MOVS/STOS/LODS/CMPS/SCAS and repeat paths exist; prefix/segment combinations remain. |
| Data transfer and stack | Partial | Selected MOV, LEA, extension, push/pop, frame, and exchange forms exist; full width and protected-mode coverage remains. |

## Control, System, And Fault Paths

| Area | Status | Evidence and remaining boundary |
| --- | --- | --- |
| Near and far control transfers | Partial | Selected near/far calls, jumps, returns, and conditions exist; complete privilege and gate cases remain. |
| Interrupts, traps, and IRET | Partial | Real mode and selected same-/cross-privilege protected-mode paths exist; complete gate, error-code, and nested-fault behavior remains. |
| Descriptor-table and system instructions | Partial | Selected LGDT/LIDT/SGDT/SIDT/LTR/STR/LMSW/SMSW/CLTS and CR moves exist; LDT, task, call-gate, and full validation remain. |
| Privilege model | Partial | Selected CPL-zero checks and TSS stack switching exist; complete CPL/RPL/DPL and conforming-segment behavior remains. |
| Exceptions and fault restart | Partial | Selected no-error and general-protection delivery exists; full architectural exception matrix, #PF codes, and restart coverage remain. |

## Explicitly Pending Before T2 Closure

1. Migrate remaining instruction families through the execution context; a `66`
   form alone never proves default-32 support.
2. Complete the instruction/system feature rows to the selected PCjs machine
   surface and record each PCjs comparison.
3. Complete paging-to-core, descriptor, privilege, interrupt, and fault tests.
4. Re-run the selected local ROM trace through the project-owned core and record
   the next whole-machine blocker without synthetic device behavior.
5. Perform the bounded M1-reference comparison and update this matrix before
   requesting T3 authorization.

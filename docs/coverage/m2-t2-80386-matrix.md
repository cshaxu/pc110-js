# M2 T2 NXVM CPU Coverage Matrix

## Purpose

This matrix is the M2 T2 CPU completion ledger. It prevents a ROM-observed
opcode from being mistaken for complete NXVM CPU coverage. `Implemented`
requires focused tests and an authority record. `Partial architecture closure`
is not completion credit, even where the corresponding executable NXVM opcode
handlers have already closed in the opcode ledger.

## Authorities

- NXVM `vcpu.h` and `vcpuins.c` are the owner-authorized CPU coverage and
  validated execution baseline.
- NXVM is the decisive CPU behavior authority for this reconstruction.
- PCjs at `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70` remains the PC/AT
  compatibility and whole-machine authority.
- NXVM BIOS, POST, I/O, global-state, macro, and guest-service behavior is
  excluded. No NXVM C source is copied.

## CPU State And Translation

| Area | Status | Evidence and remaining boundary |
| --- | --- | --- |
| 32-bit general registers and EFLAGS | Implemented | Project CPU state and focused state tests. |
| Segment selectors and hidden caches | Implemented NXVM handler coverage | P388-P390, P396-P397, P443, P447, and P450 cover cached loads, LDT lookup, access checks, paged system-table access, Accessed-bit writeback, and code/data/stack descriptor fault classification. Task/call gates are NXVM TODO-aligned exclusions recorded by P441. |
| GDTR, IDTR, LDTR, TR, CR0, CR2, and CR3 | Implemented NXVM handler coverage | P382-P384, P428, P445, and P449 cover executable system forms, defined `MOV DRx` transfers, LLDT/LTR selector classification, and paged descriptor faults. NXVM does not implement a hardware-breakpoint engine. Task-switch state is an NXVM TODO-aligned exclusion recorded by P441. |
| Real/protected address translation | Implemented NXVM handler coverage | P392, P394-P397, P433, P446, and P447 cover rebuilt translation, supervisor system-table paging, multi-byte protected segment-limit preflight, and access-fault boundaries. |
| 80386 paging and page faults | Implemented NXVM handler coverage | P392, P394-P395, P411, P433, P447, and P451 cover page walks, user permission checks, A/D updates, supervisor system-table translation, fault delivery, escalation, and cross-page atomicity. |

## Decode And Data Paths

| Area | Status | Evidence and remaining boundary |
| --- | --- | --- |
| Prefix context (`66`, `67`, repeat, segment, LOCK boundary) | Implemented NXVM handler coverage | P369 and P431 close prefix selection, LOCK admission, and the decode-length boundary; each handler family cites its focused use evidence in the opcode ledger. |
| 16-bit and 32-bit ModR/M plus SIB | Implemented NXVM handler coverage | P417-P430 contain family-level register/memory, ModR/M, SIB, default-size, and prefix evidence. |
| Integer ALU and flags | Implemented NXVM handler coverage | P417 and P420 close NXVM arithmetic/group-one forms; shared fault delivery remains separately tracked. |
| Shifts, rotates, multiply, divide, bit operations | Implemented NXVM handler coverage | P425-P427 and P430 close NXVM executable forms and their explicit undefined/fault paths. |
| String instructions | Implemented NXVM handler coverage | P419, P423, and P426 close generic/string-I/O/XLAT forms; concrete device routing remains S5. |
| Data transfer and stack | Implemented NXVM handler coverage | P417, P419-P425, and P430 close executable forms; shared protection boundaries remain separately tracked. |

## Control, System, And Fault Paths

| Area | Status | Evidence and remaining boundary |
| --- | --- | --- |
| Near and far control transfers | Implemented NXVM handler coverage | P422, P425, P427, P429, P432, and P444 cover executable NXVM handlers and target-code validation. Task/call-gate and outer-RETF paths are NXVM TODO-aligned exclusions recorded by P441. |
| Interrupts, traps, and IRET | Implemented NXVM handler coverage | P400-P416, P425, and P437-P440 cover executable gate/IRET/IRQ and privilege-delivery paths. Task gates are NXVM TODO-aligned exclusions recorded by P441. |
| Descriptor-table and system instructions | Implemented NXVM handler coverage | P380-P390, P415-P416, P428, P445, and P448 cover executable NXVM handler forms, LLDT/LTR non-present classification, and selector-query paging faults. Task/call-gate paths are NXVM TODO-aligned exclusions recorded by P441. |
| Privilege model | Implemented NXVM handler coverage | P388, P400-P404, P415-P416, P421-P422, and P437-P440 cover executable NXVM privilege paths. Task/call-gate behavior is an NXVM TODO-aligned exclusion recorded by P441. |
| Exceptions and fault restart | Implemented NXVM handler coverage | P394-P396, P406-P413, P431, P433, P446, and P447-P451 cover rebuilt fault handling, restart EIP, escalation, memory atomicity, segment-limit preflight, system-memory paging, and selector faults. |

## NXVM Post-80386 TODO Entries

| Opcode | NXVM behavior | Required M2 boundary |
| --- | --- | --- |
| `0F 09` `WBINVD` | Explicit `UndefinedOpcode()` TODO handler | Implemented `#UD` and fault-EIP test; no cache model. |
| `0F 30` `WRMSR` and `0F 32` `RDMSR` | Explicit `UndefinedOpcode()` TODO handlers | Implemented `#UD` and fault-EIP tests; no MSR model. |
| `0F A2` `CPUID` | Explicit `UndefinedOpcode()` TODO handler | Implemented `#UD` and fault-EIP test; no CPUID leaf model. |
| `0F AA` `RSM` | Explicit `UndefinedOpcode()` TODO handler | Implemented prefixed `#UD` and fault-EIP test; no SMM model. |

## Explicitly Pending Before T2 Closure

1. Migrate remaining instruction families through the execution context; a `66`
   form alone never proves default-32 support.
2. Inventory every NXVM CPU instruction family and implementation behavior,
   complete its project-native equivalent, and record each IA-32 and PCjs
   compatibility comparison.
3. Complete paging-to-core, descriptor, privilege, interrupt, and fault tests.
4. Re-run the selected local ROM trace through the project-owned core and record
   the next whole-machine blocker without synthetic device behavior.
5. Perform the bounded M1-reference comparison and update this matrix before
   requesting T3 authorization.

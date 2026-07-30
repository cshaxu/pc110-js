# M2 T2 NXVM Opcode Reconstruction Ledger

## Use

This ledger is the implementation order and completion record for the rebuilt
CPU. Source locations refer to `../nxvm/src/device/vcpuins.c`. "Legacy"
describes the frozen `src/cpu/x86/` reference, not new-CPU coverage. All rows
begin as planned; no row is complete until its focused tests, comparison record,
tracking, provenance, and full gate are recorded in the same verified part.

| Opcode or family                                      | NXVM source location                         | 80386 behavior                                                                   | Rebuilt destination                                                                                                                                                                             | Legacy coverage             | Required tests                                                | PCjs comparison | Status                                                                                                                  |
| ----------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Prefixes                                              | 1246-1282, 5545-5977, 7041-7073, 10968-11058 | Segment, LOCK, REP, operand-size, address-size, decode length, fault EIP         | `decode/prefix.ts`, `decode/decoder.ts`                                                                                                                                                         | Partial                     | Repeated prefixes; 16/default-32; 66/67; overrides; fault EIP | Required        | Implemented NXVM prefix coverage: P321-P322, P369, P431                                                                  |
| 00-05 ADD                                             | 4861-4941                                    | Byte and operand-sized add; ModR/M and accumulator immediates; flags             | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Register/memory; widths; CF/OF/AF/SF/ZF/PF                    | Required        | Implemented: P327, P391, P417                                                                                           |
| 08-0D OR                                              | 5001-5081                                    | Logical OR forms and defined flags                                               | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Register/memory; widths; 66/67                                | Required        | Implemented: P327, P417                                                                                                 |
| 10-15 ADC                                             | 5153-5233                                    | Add with carry forms and flags                                                   | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Carry boundaries; register/memory; widths                     | Required        | Implemented: P327, P417                                                                                                 |
| 18-1D SBB                                             | 5293-5373                                    | Subtract with borrow forms and flags                                             | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Borrow boundaries; register/memory; widths                    | Required        | Implemented: P327, P417                                                                                                 |
| 20-25 AND                                             | 5433-5513                                    | Logical AND forms and defined flags                                              | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Register/memory; widths; 66/67                                | Required        | Implemented: P327, P417                                                                                                 |
| 27-2F decimal and ASCII adjust                        | 5559-5991                                    | DAA, DAS, AAA, AAS                                                               | `instructions/first-interval.ts`                                                                                                                                                                | Partial                     | Defined flags and invalid-mode cases                          | Required        | Implemented: P327, P405, P417                                                                                           |
| 28-2D SUB                                             | 5582-5662                                    | Subtract forms and flags                                                         | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Borrow/overflow; register/memory; widths                      | Required        | Implemented: P327, P417                                                                                                 |
| 30-35 XOR                                             | 5731-5811                                    | Logical XOR forms and defined flags                                              | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Register/memory; widths; 66/67                                | Required        | Implemented: P327, P399                                                                                                 |
| 38-3D CMP                                             | 5878-5948                                    | Compare forms without destination write                                          | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Full subtraction flags; memory not written                    | Required        | Implemented: P327, P399                                                                                                 |
| 40-4F INC and DEC                                     | 6012-6447                                    | Register inc/dec with preserved CF                                               | `instructions/register-stack.ts`                                                                                                                                                                | Partial                     | 16/default-32; CF preservation; overflow                      | Required        | Implemented NXVM handler coverage: P329                                                                                  |
| 50-5F PUSH and POP                                    | 6476-6866                                    | General-register stack forms                                                     | `instructions/register-stack.ts`                                                                                                                                                                | Partial                     | Operand data versus SS stack address width                    | Required        | Implemented NXVM handler coverage: P329                                                                                  |
| 60-61 PUSHA and POPA                                  | 6892-6933                                    | Full register-frame stack forms                                                  | `instructions/frame-immediate.ts`                                                                                                                                                               | Partial                     | Original SP/ESP; 16/default-32; faults                        | Required        | Implemented: P330, P419                                                                                                  |
| 62-6F frame, bounds, immediate arithmetic, string I/O | 6972-7265                                    | BOUND, ARPL, FS/GS, PUSH/IMUL immediates, INS/OUTS                               | `instructions/frame-immediate.ts`, `instructions/string-io.ts`                                                                                                                                  | Partial                     | Bounds faults; privilege; 66/67; REP and I/O boundary         | Required        | Implemented: P330, P373, P375, P376, P378, P418, P419                                                                   |
| 70-7F short Jcc                                       | 7309-7494                                    | All short conditional transfers                                                  | `instructions/control.ts`                                                                                                                                                                       | Partial                     | Taken/not-taken; flags; 16/default-32 EIP                     | Required        | Implemented NXVM handler coverage: P331                                                                                  |
| 80, 81, 83 Group One                                  | 7507-7840                                    | Immediate arithmetic and compare groups                                          | `instructions/group-one.ts`                                                                                                                                                                     | Partial                     | Every extension; sign extension; register/memory; widths      | Required        | Implemented NXVM handler coverage: P332                                                                                  |
| 84-8F ModR/M, segment, and stack forms                | 7853-8130                                    | TEST, XCHG, MOV, segment moves, LEA, POP r/m                                     | `instructions/test.ts`, `instructions/exchange.ts`, `instructions/move.ts`, `instructions/lea.ts`, `instructions/register-stack.ts`                                                             | Partial                     | ModR/M/SIB; segment validation; 66/67                         | Required        | Implemented: P333-P336, P360, P370, P408, P412, P420                                                                      |
| 90-9F exchange, flags, far call, and flag transfer    | 8143-8626                                    | NOP, XCHG AX, CBW/CWD, far call, PUSHF/POPF, SAHF/LAHF                           | `instructions/accumulator-exchange.ts`, `instructions/sign-extension.ts`, `instructions/flag-transfer.ts`, `instructions/control.ts`, `instructions/register-stack.ts`                          | Partial                     | Flag privilege; operand width; far control transfer           | Required        | Implemented NXVM handler coverage: P337-P339, P361, P371-P372, P402, P421-P422                                         |
| A0-AF moffs, strings, TEST, immediates                | 8637-9589                                    | Moffs, MOVS/CMPS/STOS/LODS/SCAS, accumulator TEST, register immediates           | `instructions/moffs-move.ts`, `instructions/accumulator-test.ts`, `instructions/string.ts`, `instructions/move.ts`                                                                              | Partial                     | REP/REPNE; source overrides; 16/default-32; faults            | Required        | Implemented NXVM handler coverage: P340-P342, P377, P423; later architecture dependencies remain separately ledgered   |
| B0-BF immediate register moves                        | 9325-9589                                    | Byte and operand-sized register immediates                                       | `instructions/immediate-move.ts`                                                                                                                                                                | Partial                     | All registers; instruction length; 66                         | Required        | Implemented NXVM handler coverage: P340, P424                                                                            |
| C0-CF groups, returns, interrupts, frame              | 9613-10338                                   | Shifts/rotates, RET, LES/LDS, MOV immediate groups, ENTER/LEAVE, RETF, INT, IRET | `instructions/immediate-modrm-move.ts`, `instructions/stack-frame-control.ts`, `instructions/shift-rotate.ts`, `instructions/groups.ts`, `instructions/control.ts`, `instructions/interrupt.ts` | Partial                     | Every group extension; count/flags; privilege; fault EIP      | Required        | Implemented NXVM handler coverage: P343, P348, P351, P361-P362, P394-P416, P425                                      |
| D0-DF shifts, adjust, XLAT, loops, port I/O           | 10250-10941                                  | Shift/rotate count variants, AAM/AAD, XLAT, LOOP, JCXZ, IN/OUT                   | `instructions/shift-rotate.ts`, `instructions/ascii-adjust.ts`, `instructions/xlat.ts`, `instructions/loop.ts`, `instructions/groups.ts`, `instructions/control.ts`, `instructions/io.ts`       | Partial                     | Count zero; CL; 66/67; I/O permissions                        | Required        | Implemented NXVM handler coverage: P344-P345, P351, P406, P409, P426                                                  |
| E0-FF control, flags, Groups Three/Four/Five          | 10795-11610                                  | Near/far call and jump, flag control, F6/F7, FE/FF                               | `instructions/near-control.ts`, `instructions/group-three.ts`, `instructions/group-four-five.ts`, `instructions/flag-control.ts`, `instructions/control.ts`, `instructions/groups.ts`           | Partial                     | All extensions; divide faults; far privilege; SS width        | Required        | Implemented NXVM handler coverage: P346-P347, P349-P352, P359, P361, P406-P407, P410, P414, P427, P432                 |
| 0F decode and system groups                           | 5141, 11629-12637                            | Escape decoding, descriptor/table, CR/DR/TR, LAR/LSL, CLTS                       | `decode/decoder.ts`, `instructions/system.ts`                                                                                                                                                   | Partial                     | CPL; descriptor faults; 16/default-32; 66/67                  | Required        | Implemented NXVM handler coverage for 00-26: P380-P390, P400, P415-P416, P428, P445, P448; other 0F intervals remain separate |
| 0F 80-8F near Jcc and SETcc                           | 12649-12898                                  | Near conditional transfers and byte condition stores                             | `instructions/near-conditional-control.ts`, `instructions/set-condition.ts`, `instructions/control.ts`                                                                                          | Partial                     | Taken/not-taken; ModR/M; fault EIP                            | Required        | Implemented NXVM handler coverage: P353-P354, P429, P432                                                                |
| 0F A0-AF extended bit, shift, segment forms           | 12906-13203                                  | FS/GS stack forms, BT/BTS/BTR/BTC, SHLD/SHRD, IMUL, LSS/LFS/LGS, MOVZX           | `instructions/extended.ts`                                                                                                                                                                      | Partial                     | Bit addressing; flags; segment faults; 66/67                  | Required        | Implemented NXVM handler coverage: P378, P430; shared protected access faults remain separately ledgered                |
| 0F B0-BF extended scans and sign extension            | 13203-13251                                  | BTC, BSF/BSR, MOVSX and immediate bit group                                      | `instructions/extended.ts`                                                                                                                                                                      | Partial                     | Zero input; flags; ModR/M; widths                             | Required        | Implemented NXVM handler coverage: P379, P408, P430; B0-B1 retain required `#UD` behavior                              |
| Explicit NXVM undefined extensions                    | 12546-12552, 12637-12649, 12924-12977        | WBINVD, WRMSR, RDMSR, CPUID, RSM decode as `#UD`                                 | `instructions/system.ts`                                                                                                                                                                        | Complete reference evidence | Prefixes and fault EIP                                        | Required        | Implemented: P385, P393                                                                                                 |
| Segmentation, paging, exceptions, and trace           | 51-1145, 2033-3096, 13315-13917              | Logical/linear access, descriptors, stack, faults, interrupts, trace             | `protection/`, `events/`, `debug/`                                                                                                                                                              | Partial                     | PF/GP/SS/NP; privilege; ROM trace; differential state dumps   | Required        | In progress: P392, P433, P445-P447 system-table, descriptor, selector, and segment-range faults                       |

## P355 Rebuilt Dispatcher Boundary

P355 adds a project-owned dispatcher for completed rebuilt instruction families.
It supports sequence-level execution and does not switch the machine runtime,
which remains a later integration gate.

## P356 Rebuilt Reset-ROM Runner

P356 composes PhysicalMemory, the rebuilt executor, and dispatcher into an
independent runner. It proves high-ROM reset-alias execution without legacy CPU
runtime use; broad ROM trace compatibility remains an active completion gate.

## P327 `00-3F` Checklist And Deferred Dependencies

P327 was the in-progress execution slice that established the base ALU encodings
`00-05`, `08-0D`, `10-15`, `18-1D`, `20-25`, `28-2D`, `30-35`, and `38-3D`;
the adjust encodings `27`, `2F`, `37`, and `3F`; and real-mode forms of
`06/07`, `0E`, `16/17`, and `1E/1F`. Prefixes `26`, `2E`, `36`, and `3E` are
decoded and exercised where applicable. The covered ALU rows include
byte/word/dword, register/memory, default-16, default-32, `66`, `67`, flags,
and instruction-start preservation tests.

P391, P396, P398, P405, and P417 close the selector, fault-routing, v86, and
adjustment dependencies. `0F` remains an escape opcode owned by the separate
extended-system ledger rows and is outside the `00-3F` family completion claim.

## P445 LLDT/LTR Non-Present Descriptor Checklist

P445 follows NXVM `_s_load_ldtr`, `_s_load_tr`, and `_ksa_load_sreg` at
`vcpuins.c` 601-763 and 1065-1100. Rebuilt `LLDT` and `LTR` retain
`#GP(selector)` for invalid table/type paths but now deliver `#NP(selector)`
for a valid non-present LDT or available TSS descriptor. Focused protected-mode
tests verify both forms reach the `#NP` gate, retain the selector error code,
and leave LDTR/TR state unchanged.

## P446 Protected Segment-Range Preflight Checklist

P446 follows NXVM `_kma_linear_logical` at `vcpuins.c` 141-297, which checks
the complete requested byte range against the selected protected segment before
logical access. Rebuilt multi-byte reads and writes now preflight the complete
operand range before translating individual bytes. Focused tests verify a
16-bit protected data segment rejects word and dword accesses crossing its
limit before any memory access.

## P447 Paged System-Table Access Checklist

P447 follows NXVM `_kma_read_logical` and `_kma_write_logical` system-table
calls at `vcpuins.c` 516-596 and 872-969. Rebuilt GDT/LDT/IDT/TSS and TSS
I/O-map accesses now use supervisor linear translation, while page-table walks
remain physical. Focused tests load and update a GDT descriptor through a
mapped page and prove supervisor system access does not inherit CPL3 user-page
restrictions. Byte-masked page-table writes make Accessed/Dirty updates correct
for every byte-oriented memory bus.

## P448 Selector-Query Paging-Fault Checklist

P448 preserves the distinction between NXVM selector lookup failure and its
logical-memory access path. Rebuilt LAR, LSL, VERR, and VERW clear ZF for an
invalid selector lookup only; an actual descriptor-table page fault now reaches
the normal rebuilt `#PF` path. Focused VERR evidence uses an active unmapped
LDT while GDT and IDT pages remain mapped, then verifies the `#PF` handler and
CR2 descriptor address.

## P329 `40-5F` Checklist

P329 follows NXVM handlers `INC_EAX` through `DEC_EDI` and `PUSH_EAX` through
`POP_EDI`. It implements every encoding from `40` through `5F` in the rebuilt
`register-stack.ts` module: `40-47` INC, `48-4F` DEC, `50-57` PUSH, and
`58-5F` POP. Focused tests cover all register encodings, 16-bit defaults,
default-32 code, `66`, carry preservation, overflow, independent SS D/B stack
addressing, 16-bit stack wrap, `PUSH ESP`, and `POP ESP`. No ModR/M, address-
size (`67`), memory operand, privilege, or protection-fault behavior applies
to this register-only opcode interval.

## P330 `60-6F` Checklist And Dependencies

P330 follows NXVM handlers `PUSHA`, `POPA`, `PUSH_I32`,
`IMUL_R32_RM32_I32`, `PUSH_I8`, and `IMUL_R32_RM32_I8`. It executes `60`,
`61`, and `68-6B`, including 16/default-32 data widths, `66`, 16- and 32-bit
SS stack addressing, signed immediate extension, IMUL CF/OF truncation, and
`67` plus segment-overridden memory sources for IMUL.

P373, P375, P376, P378, P418, and P419 close the originally recorded `62-6F`
exception, selector, prefix, string-I/O, protected-I/O, and v86 selector
dependencies. P419 supplies the complete family-close review and evidence.

## P331 `70-7F` Checklist

P331 follows NXVM handlers `JO_REL8` through `JG_REL8` and implements all 16
short conditional-transfer opcodes in `control.ts`. Focused tests cover every
true and false EFLAGS predicate, signed forward and backward rel8 movement,
16-bit and 32-bit CS EIP wrapping, and `66` instruction length. No ModR/M,
memory operand, privilege, fault, or address-size (`67`) behavior applies.

## P332 Group One Checklist

P332 follows NXVM `INS_80`, `INS_81`, and `INS_83` and implements all `/0-7`
ADD, OR, ADC, SBB, AND, SUB, XOR, and CMP forms. Tests cover byte and dword
operation, every extension, register and memory destinations, CMP non-writeback,
`66`, `67`, segment override, and `83` immediate sign extension.

## P333 `84-85` TEST Checklist

P333 follows NXVM `TEST_RM8_R8` and `TEST_RM32_R32` and completes both TEST
ModR/M forms. Focused tests cover non-writeback, defined logical flags, byte
and dword operands, register and memory forms, `66`, `67`, segment override,
and instruction length. XCHG, MOV, LEA, segment-register, and POP r/m forms
remain in the active `84-8F` family.

## P334 `86-87` XCHG Checklist

P334 follows NXVM `XCHG_RM8_R8` and `XCHG_RM32_R32` and completes both XCHG
ModR/M forms. Focused tests cover byte and dword exchange, register and memory
operands, `66`, `67`, segment override, and EFLAGS preservation. MOV, LEA,
segment-register, and POP r/m forms remain in the active `84-8F` family.

## P335 `88-8B` MOV Checklist

P335 follows NXVM's four general-register MOV ModR/M handlers and completes
`88-8B`. Focused tests cover both transfer directions, byte and dword widths,
register and memory operands, `66`, `67`, segment override, and no EFLAGS
change. Segment-register MOV, LEA, and POP r/m remain active work.

## P336 `8D` LEA Checklist

P336 follows NXVM `LEA_R32_M32` and completes LEA. Focused tests cover
16-bit effective-address wrapping, independent `66` and `67`, SIB addressing,
instruction length, and rejection of register-only ModR/M. Segment-register
MOV and POP r/m remain active work.

## P337 `90-97` Accumulator XCHG Checklist

P337 follows NXVM's accumulator XCHG handlers and completes `90-97`: `90` is
NOP and `91-97` exchange AX/EAX with a general register. Focused tests cover
all exchange registers, `66`, instruction length, and EFLAGS preservation.
CBW/CWD, far call, flag transfer, and other `90-9F` forms remain active work.

## P338 `98-99` Sign Extension Checklist

P338 follows NXVM CBW/CWDE and CWD/CDQ handlers and completes `98-99`. Focused
tests cover positive and negative values, default 16-bit mode, `66` dword
selection, and EFLAGS preservation. Far call and flag-transfer forms remain
active work.

## P339 `9E-9F` Flag Transfer Checklist

P339 follows NXVM SAHF and LAHF handlers and completes `9E-9F`. Focused tests
cover selected AH-to-EFLAGS and EFLAGS-to-AH bits, LAHF's fixed bit 1, and
preservation of unrelated EFLAGS bits. Far call and PUSHF/POPF remain active.

## P340 `B0-BF` Immediate MOV Checklist

P340 follows NXVM immediate register MOV coverage and completes all `B0-BF`
forms. Focused tests cover every byte and operand-sized register encoding,
default-16, `66` dword selection, immediate little-endian ordering, and EIP
length. No ModR/M, memory, privilege, or fault path applies.

## P341 `A0-A3` Moffs MOV Checklist

P341 follows NXVM moffs MOV behavior and completes all four A0-A3 forms.
Focused tests cover byte and dword loads/stores, DS default, segment override,
`66`, `67`, address/immediate length, and little-endian data. String and TEST
forms remain active work.

## P342 `A8-A9` Accumulator TEST Checklist

P342 follows NXVM accumulator TEST behavior and completes A8-A9. Focused tests
cover byte and `66` dword immediates, no register writeback, defined logical
flags, and EIP length. String and other A0-AF forms remain active work.

## P343 `C6-C7` Immediate ModR/M MOV Checklist

P343 follows NXVM C6/C7 and implements their defined `/0` MOV immediate forms.
Focused tests cover byte/word/dword, register and memory destinations, `66`,
`67`, segment override, little-endian immediate, and EIP length. `/1-7` are
explicit `#UD` dependencies until structured exception delivery is rebuilt.

## P344 `D4-D5` AAM/AAD Checklist

P344 follows NXVM AAM/AAD normal paths. Focused tests cover AAM quotient and
remainder, AAD combine-and-clear, defined SF/ZF/PF, and preservation of
undefined flags. AAM base zero remains an explicit `#DE` delivery dependency.

## P345 `D7` XLAT Checklist

P345 follows NXVM XLAT and completes D7. Focused tests cover BX/EBX selection,
AL indexing, 16-bit wrapping, `67`, segment override, and EIP length. EFLAGS
are unchanged; no I/O, privilege, or exception behavior applies.

## P346 `E0-E3` LOOP Checklist

P346 follows NXVM LOOP, LOOPE, LOOPNE, and JCXZ behavior. Focused tests cover
conditions, counter decrement, JCXZ non-mutation, rel8 control transfer, and
`67` CX/ECX selection. No I/O, privilege, or exception behavior applies.

## P347/P357 `E8-EA-EB` Direct Control Checklist

P347 follows NXVM near relative CALL/JMP behavior. P357 completes the direct
real-mode `EA` far-JMP form. Focused tests cover near and short relative
displacements, 16/32-bit operand selection, CALL fallthrough push, independent
SS D/B stack addressing, direct far targets, CS cache update, and fault-EIP
preservation. Protected-mode far selector validation and fault delivery remain
explicit dependencies; I/O forms remain active work.

## P348 `C2-C3-C8-C9` Stack-Frame Control Checklist

P348 follows NXVM `RET_I16`, `RET`, `ENTER`, and `LEAVE`. Focused tests cover
near return targets and cleanup, operand-size-selected return data, independent
SS D/B addressing, ENTER nesting, LEAVE, `66`, and EIP length. C0/C1 shifts,
LES/LDS, far returns, interrupts, IRET, selector validation, and protection
fault delivery remain explicit dependencies for the active C0-CF interval.

## P349 `F6-F7` Group Three Checklist

P349 follows NXVM Group Three TEST, NOT, NEG, MUL, IMUL, DIV, and IDIV
handlers. Focused tests cover byte/word/dword behavior, register and memory
operands, `66`, `67`, defined flags, signed and unsigned arithmetic, and
fault-EIP preservation for divide errors. `/1` and vector delivery remain
explicit `#UD` and divide-error dispatch dependencies.

## P350 `FE-FF` Group Four/Five Checklist

P350 follows NXVM's FE/FF register and memory forms. Focused tests cover byte
and operand-sized INC/DEC, carry preservation, memory addressing, `66`, `67`,
near CALL/JMP targets, return frames, and PUSH with independent SS D/B.
Undefined extensions, far CALL/JMP selector loading, and protection-fault
delivery remain explicit dependencies.

## P351 `C0-C1-D0-D3` Group Two Checklist

P351 follows NXVM's ROL/ROR/RCL/RCR/SHL/SHR/SAR handlers across byte, word,
and dword operands. Focused tests cover all defined extensions, zero count,
immediate and CL counts, `66`, `67`, memory, carry rings, and defined OF.
`/6` remains an explicit rebuilt `#UD` delivery dependency.

## P352 `F5-FD` Local Flag-Control Checklist

P352 follows NXVM CMC, CLC, STC, CLD, and STD behavior. Focused tests cover
their EIP advance and preservation of unrelated EFLAGS state. HLT, CLI, and
STI remain explicit privilege and event-delivery dependencies.

## P353 `0F 80-8F` Near Jcc Checklist

P353 adds generic 0F escape decoding and follows NXVM near Jcc behavior.
Focused tests cover all predicates, 16/32-bit displacement, `66`, CS-width
EIP, and decode length. Other 0F system and SETcc forms remain active work.

## P354 `0F 90-9F` SETcc Checklist

P354 follows NXVM SETcc behavior. Focused tests cover all predicates, r/m8
register and memory destinations, overrides, EFLAGS preservation, and length.

## Status Rule

"Implemented" means the rebuilt CPU only. Legacy tests and trace evidence may
support differential tests, but they cannot mark a rebuilt family complete.

## P358 Selected ROM Trace Boundary

P358 provides a local-only trace command for the pinned PCjs DeskPro ROM. The
rebuilt runner executes the reset `EA` and the following `MOV AL, 0`, then
stops at `F000:F907` on `E6` (`OUT`). This validates the rebuilt reset, ROM,
dispatcher, and direct far-JMP path without adding I/O behavior. The `E6-E7`
I/O family and its device-bus integration remain active S3/S5 dependencies.

## P359 `E4-E7-EC-EF` Port I/O Checklist

P359 implements the NXVM immediate-port and DX-port `IN`/`OUT` forms through a
project-native width-aware port boundary. Focused tests cover byte/word/dword,
immediate/DX ports, 16-bit-default and 32-bit-default operand width, `66`,
dispatcher integration, and fault-EIP preservation when no boundary is
supplied. P418 completes protected-mode IOPL and 32-bit TSS I/O-permission
bitmap admission; no device response is synthesized.

## P360 `8C-8E-C4-C5` Segment Forms Checklist

P360 implements MOV segment forms and LES/LDS through a project-native GDT
descriptor loader. Tests cover real-mode selectors, protected data segments,
null data selectors, 16/32-bit far-pointer offsets, and GDT descriptor cache
attributes. Code-segment loading, LDT, far returns, and vector delivery remain
separate protection-system dependencies.

## P361 `9A-EA-FF/3-FF/5-CA-CB` Direct Far Control Checklist

P361 implements direct and memory far CALL/JMP plus same-privilege RETF through
the rebuilt code-segment loader. Focused tests cover real mode, protected GDT
code descriptors, 16/32-bit offsets, return-frame ordering, cleanup, dispatcher
routing, and memory-only Group Five pointers. Call gates, task transfers, and
outer-privilege returns remain explicit interrupt/protection dependencies.

## P362 `CC-CD-CE-CF` Interrupt Control Checklist

P362 implements INT3, INT imm8, conditional INTO, and same-privilege IRET. The
rebuilt event path reads real-mode IVT entries and protected-mode 16/32-bit IDT
interrupt and trap gates, pushes operand-size-selected frames, applies IF/TF
gate effects, and restores a same-privilege IRET frame. Tests cover real-mode
and 66 frames, protected 32-bit gates, gate DPL rejection, trap-gate decoding,
and dispatcher execution. TSS stack switching, outer-privilege IRET, task
gates, hardware interrupt admission, and architected fault delivery remain
active protection-system work.

## P363 `D6-D8-DF` Undefined Opcode Checklist

NXVM explicitly routes D6 and every D8-DF opcode to UndefinedOpcode. P363
preserves that coverage by delivering vector 6 through the rebuilt event path,
with a real-mode fault frame that returns to the faulting EIP. It deliberately
does not synthesize FPU execution. Protected fault delivery, error-code faults,
and double-fault escalation remain active event-system work.

## P367 `F4-FA-FB` Processor Control Checklist

P367 implements HLT, CLI, and STI through rebuilt CPU state and event delivery.
HLT advances EIP before halting and rejects nonzero protected-mode CPL. CLI and
STI use CPL versus IOPL authorization; #GP(0) uses an operand-size-correct
protected interrupt frame. Virtual-8086 interrupt-flag behavior and external
interrupt wakeup remain active architectural dependencies.

## P368 `F1` Undefined Opcode Checklist

NXVM routes F1 to UndefinedOpcode. P368 adds F1 to the rebuilt vector-6 path
and verifies its real-mode fault EIP frame. LOCK remains an active memory-bus
atomicity dependency.

## P369 `F0` LOCK Prefix Checklist

P369 validates LOCK only for implemented memory-destination RMW encodings and
executes the complete instruction through the rebuilt memory bus atomic
boundary. Register-only, read-only, and unsupported forms deliver #UD. A bus
without an explicit atomic callback remains synchronous; device buses may
provide the callback to preserve the same boundary under reentry.

## P370 `8F /0` POP r/m Checklist

P370 implements NXVM POP r/m through rebuilt ModR/M, stack, and segmented
memory paths. Tests cover register and memory destinations, operand and
address-size overrides, independent SS stack width, and #UD for `/1-7`.

## P371 `9B` WAIT Checklist

P371 implements NXVM WAIT's 80386 CR0.TS boundary. It advances when TS is
clear and delivers vector 7 at the faulting EIP when TS is set; no FPU behavior
is synthesized.

## P372 `9C-9D` Flag Stack Checklist

P372 implements NXVM PUSHF/POPF real-mode and non-VM protected-mode behavior.
Tests cover operand width, PUSHFD VM/RF stripping, and nonzero-CPL IOPL
preservation. Virtual-8086 flag-stack behavior remains an explicit v86-state
dependency.

## P373 `62` BOUND Checklist

P373 implements signed 16/32-bit memory bounds checks with 66/67 addressing.
Tests cover in-range, #BR, and register-only #UD behavior.

## P375 `63` ARPL Checklist

P375 implements protected-mode ARPL's fixed 16-bit selector RPL adjustment.
Tests cover register/memory operands, 67 addressing, ZF results, and real-mode
#UD.

## P376 `6C-6F` String I/O Checklist

P376 implements project-native INS/OUTS through the port bus. Tests cover
ES:DI input, DS:SI output, DF, and one-element REP execution with EIP retained
while the counter remains nonzero. P418 completes protected I/O privilege
admission for the string-I/O path.

## P377 `A4-A7-AA-AF` Generic String Checklist

P377 follows NXVM MOVSB/MOVSW, CMPSB/CMPSW, STOSB/STOSW, LODSB/LODSW, and
SCASB/SCASW handlers. It implements all generic string opcodes in a
project-native module: byte and operand-sized transfers, source segment
overrides, fixed ES destinations, DF index direction, address-size-selected
SI/DI/CX state, and one-element REP execution. CMPS and SCAS apply REP/REPNE
ZF termination after each element; MOVS, STOS, and LODS remain count-driven.
Focused tests cover segment override, 66/67, REP and REPNE continuation,
defined comparison flags, and DF. Protected segment-limit/page faults and
virtual-8086 behavior remain active protection-system dependencies.

## P378 `0F A0-AF` Extended Checklist

P378 follows the NXVM FS/GS stack, bit-test, double-shift, IMUL, far-pointer,
and MOVZX handlers. It implements project-native A0-AF coverage plus the
handler-adjacent B2-B7 LSS/LFS/LGS and MOVZX forms: operand/address sizes,
ModR/M register and memory paths, source segments, stack width, CF and defined
double-shift flags, and undefined A-family vector-six delivery. Double-shift
counts beyond the operand width are architecturally undefined and leave the
rebuilt state unchanged rather than creating host-language shift behavior.
Protected selector fault routing, paging faults, and the remaining B0-BF
handlers remain active dependencies.

## P379 `0F BA-BF` Extended Checklist

P379 follows NXVM immediate bit-group, BTC, BSF, BSR, and MOVSX handlers. It
implements BA `/4-7`, BB, BC, BD, BE, and BF through the existing project-native
extended module. Tests cover immediate and register bit changes, carry, zero
source scans, 16/32-bit destination behavior, and sign extension. BA `/0-3`
deliver vector six; NXVM has no B0-B1 handler, so those later-processor forms
remain outside its covered 80386 set.

## P380 `0F 01` System-Table Checklist

P380 follows NXVM SGDT, SIDT, LGDT, LIDT, SMSW, and LMSW handlers. It
implements memory-only table operands, operand-size-selected 24/32-bit bases,
fixed memory-versus-register SMSW widths, and protected-mode preservation when
LMSW requests clearing CR0.PE. Undefined extensions deliver vector six. The
separate 0F 00 LDTR/TR and verification forms remain an active task-state
dependency.

## P381 `0F 00` System-Selector Checklist

P381 follows NXVM SLDT, STR, LLDT, LTR, VERR, and VERW handlers. It adds
rebuilt LDTR/TR hidden-cache state, protected-mode vector-six behavior,
selector output widths, GDT-backed LLDT/LTR validation, and ZF-only
verification results. Full descriptor fault codes, LDT-resolved verification,
and task switching remain active architecture dependencies.

## P383 `0F 02-03, 06` System Access Checklist

P383 follows NXVM's LAR, LSL, and CLTS handlers. It implements protected-mode
LAR/LSL selector validation through GDT lookup, NXVM's distinct allowed system
descriptor classes, code/data privilege checks, ZF-only result signaling,
operand-size-selected destination writes, and CLTS's CPL-zero `#GP(0)` path.
Tests cover invalid selectors, data and system descriptors, default-32 plus
`66` execution, instruction length, and protected fault delivery. LDT lookup,
full descriptor-fault completion, v86 behavior, and TR transfers remain active
architecture dependencies.

## P384 `0F 24, 26` Test-Register Checklist

P384 follows NXVM's test-register handlers. It implements fixed-width,
register-direct transfers between general registers and TR6/TR7, rejects other
test-register encodings and memory forms through vector six, and applies the
shared CPL-zero authorization before state transfer. Tests cover both transfer
directions, prefix-inclusive length, and invalid encoding faults. The test
registers are an NXVM-required compatibility extension, not a PC110 behavior.

## P385 Explicit NXVM Undefined-Extension Checklist

P385 routes the NXVM-known undefined extended encodings to the rebuilt
vector-six delivery path. P393 completes the remaining NXVM intervals
`0F 40-7F` and `0F C0-FF`. It does not convert unrelated unimplemented opcode
families into undefined behavior. Tests enumerate every listed encoding through
its faulting-EIP interrupt path.

## P386 `0F 00 /2,/3` Privilege Checklist

P386 follows NXVM's LLDT/LTR loader boundary by requiring CPL zero before
either system selector changes state. Tests deliver protected `#GP(0)` through
a same-privilege IDT gate and confirm both selector states are preserved.

## P387 `0F 00 /4,/5` Verification Checklist

P387 follows NXVM's VERR/VERW checks for code/data descriptor type, readable
or writable access, conforming-code handling, and the CPL/RPL-versus-DPL rule
for nonconforming descriptors. Tests cover accepted writable data, DPL denial,
and the VERR-only read-only-data result. LDT lookup remains an active
descriptor-system dependency.

## P388 Segment-Loader Hidden-CPL Checklist

P388 makes project-native data and code segment loaders derive CPL from the CS
hidden cache, as NXVM does, rather than selector RPL. Focused tests deliberately
separate those values and cover GDT data and code loading. LDT lookup and full
descriptor fault-code delivery remain active dependencies.

## P389 LDT Descriptor-Lookup Checklist

P389 adds project-native descriptor-table selection: GDT selectors retain the
existing path, while TI selectors resolve through active LDTR base and limit.
Segment loaders and LAR/LSL/VERR/VERW use the shared lookup; GDT-only system
instructions retain explicit GDT lookup. Tests cover active-LDTR data segment
loading. Task switching and inactive-LDTR fault-code completion remain active.

## P390 LDT System-Instruction Execution Checklist

P390 verifies that LAR, LSL, and VERR execute the shared active-LDTR path with
TI selectors, including access-rights and limit results plus selector
verification. This is execution evidence for P389's shared lookup, not a new
runtime dependency. Inactive-LDTR fault-code completion remains active.

## P391 `06-07-0E-16-17-1E-1F` Segment Stack Checklist

P391 routes protected-mode POP ES/SS/DS through the shared project-native data
and stack segment loaders. PUSH ES/CS/SS/DS remains selector-only and uses the
independent SS stack-address width. Focused tests cover protected GDT data and
stack descriptors, operand-size-selected POP data, SS D/B addressing, and EIP
length. Descriptor-fault delivery and POP-SS interrupt inhibition remain active
event-system dependencies.

## P392 Rebuilt Page-Translation Checklist

P392 routes rebuilt CPU instruction and segmented data access through the
project-native 80386 two-level page walk when protected mode and CR0.PG are
active. It preserves accessed/dirty entry updates, derives user access from
the rebuilt CS cache or virtual-8086 flag, and records CR2 on a page fault.
Focused tests cover paged fetch, data read/write, entry updates, and fault CR2.
Architected vector-14 delivery, page-boundary atomicity, TLB behavior, and
complete segment access-type validation remain active dependencies.

## P393 Remaining `0F` Undefined Intervals Checklist

P393 completes NXVM's remaining undefined extended intervals, `0F 40-7F` and
`0F C0-FF`, through the rebuilt vector-six delivery path. A focused exhaustive
test enumerates every NXVM undefined extended opcode and verifies the faulting
EIP return target. No unsupported host-error path remains for those encodings.

## P394 Rebuilt Access-Fault Delivery Checklist

P394 converts typed rebuilt page and segment access errors raised after decode
into architected #PF, #GP, or #SS delivery. Page-fault error codes preserve
present, write, and user bits; segment faults use the faulting instruction EIP.
Focused evidence covers a protected IDT page-fault frame, error code, CR2, and
same-privilege target transfer. Decode-fetch faults, descriptor-specific codes,
double-fault escalation, and outer-privilege delivery remain active work.

## P395 Rebuilt Fetch-Fault Delivery Checklist

P395 extends rebuilt access-fault delivery across instruction decode and fetch.
A typed fetch fault delivers its architected frame before dispatcher invocation,
returns no decoded instruction, and emits a fault trace event without inventing
an opcode. Focused evidence covers protected paged fetch, fault EIP, error
code, CR2, and trace state. Descriptor-specific codes, escalation, and
outer-privilege delivery remain active work.

## P396 Segment-Loader Fault Checklist

P396 classifies rebuilt code/data/stack selector-load failures as #GP, #NP, or
#SS with NXVM-style selector error codes, then routes those typed failures through
the rebuilt executor. Focused tests cover descriptor presence and null SS
classification. Descriptor gates, task switching, escalation, and all
outer-privilege paths remain active work.

## P397 Cached Segment-Access Checklist

P397 carries executable, readable, writable, and expand-down attributes in the
rebuilt hidden segment caches. Protected access validates cache validity, type,
and normal or expand-down bounds; instruction fetch is distinct from data reads.
Focused tests cover write denial and 16-bit expand-down range checks. Full
segment-system fault codes, v86 access semantics, and task/gate paths remain
active work.

## P398 Virtual-8086 Baseline Checklist

P398 follows NXVM's `_IsProtected`, `_GetCPL`, and `_ksa_load_sreg` v86
boundary. With CR0.PE and EFLAGS.VM set, rebuilt execution uses 16-bit code
and stack address defaults, derives segment bases from `selector << 4`, gives
loaded segment caches DPL 3 and a 64 KiB limit, and bypasses protected cached
segment-type checks. Paging remains enabled and uses user access. Focused tests
cover prefixed decode, EIP wrapping, segment-base access, stack addressing,
and descriptor-free segment loading. v86 interrupt delivery, IOPL/TSS I/O
checks, POPF/IRET virtualization, and privilege-changing exception delivery
remain active protection-system dependencies.

## P400 32-bit TSS Privilege Stack Checklist

P400 adds project-native 32-bit TSS ring-zero stack switching for protected
interrupt gates and matching outer-privilege IRET restoration. LTR records the
TSS type and marks an available TSS descriptor busy. Focused tests cover a
CPL3-to-CPL0 software gate, frame ordering, return to CPL3, and busy state.
16-bit TSS is completed by P415; task switching and gate fault escalation
remain active dependencies.

## P402 Virtual-8086 Flag Stack Checklist

P402 follows NXVM v86 PUSHF/POPF IOPL admission. IOPL three permits the
16-bit v86 flag-stack forms; lower IOPL delivers #GP(0) through the rebuilt
v86 TSS frame. v86 I/O permission maps and later virtual-interrupt extensions
remain active dependencies.

## P401 Virtual-8086 Interrupt Frame Checklist

P401 adds the 32-bit TSS-gated v86 interrupt frame and matching IRET restore:
VM state, full ESP, all segment selectors, and data-segment nulling/restoration.
Focused evidence covers a v86-to-CPL0 round trip. P415 extends that stack
selection to 16-bit TSS layouts; task switching and complete v86 I/O and flag
privilege paths remain active dependencies.

## P399 `30-3D` XOR/CMP Checklist

P399 verifies the project-native XOR and CMP handlers across every byte and
operand-sized register/ModR/M/accumulator form. Focused tests cover carry-in
neighboring ALU regressions, destination preservation for CMP, default-32
execution, and `66`/`67` memory paths. The preceding `00-2D` ALU families and
adjustment forms remain separately in progress under P327 evidence.

## P403 Virtual-8086 Processor-Control Checklist

P403 applies NXVM's virtual-8086 CPL-three interpretation to the existing HLT,
CLI, and STI privilege boundary. Focused tests cover IOPL-three CLI/STI state
changes and low-IOPL #GP(0) delivery through the rebuilt v86 TSS frame. I/O
permission maps and external interrupt admission remain active dependencies.

## P404 Virtual-8086 Software-Interrupt Checklist

P404 applies NXVM's virtual-8086 IOPL admission to INT3, INT imm8, and
overflow-triggered INTO. IOPL below three delivers #GP(0) before IDT lookup;
focused tests cover all three entry forms through the rebuilt v86 TSS frame.
External interrupt admission and virtual interrupt extensions remain active.

## P405 Decimal-Adjust State Checklist

P405 aligns DAA/DAS high-digit adjustment with NXVM's post-low-adjust AL and
current carry state. A focused DAS case verifies that `AL=9A, AF=1` stops at
`94` rather than applying a stale-input high-digit adjustment. The wider
`00-3F` interval remains incomplete until its recorded closure dependencies
are satisfied.

## P406 F6/F7 Fault-Delivery Checklist

P406 completes the explicit Group Three fault paths: `/1` delivers rebuilt
#UD, and DIV/IDIV zero-divisor or quotient-overflow errors deliver rebuilt #DE
at the faulting EIP. Focused tests cover byte and operand-sized division plus
the undefined extension through real-mode vector frames. Remaining Group Three
completion evidence continues to require the scheduled width and protection
coverage.

## P407 FE/FF Undefined-Extension Checklist

P407 routes unsupported FE extensions, FF `/7`, and register-direct FF far
CALL/JMP forms through rebuilt #UD delivery. Focused real-mode vector-frame
tests cover each invalid form while preserving the existing legal Group Four/
Five paths. Far gate, task, and privilege-transfer behavior remain separate
protection-system work.

## P408 Explicit Primary Undefined-Opcode Checklist

P408 routes NXVM-table-defined primary `82` and extended `0F B8/B9` encodings
through the rebuilt #UD path. Focused tests verify their faulting real-mode EIP
frames. This preserves a distinction between explicit NXVM undefined entries
and unrelated incomplete instruction families.

## P409 Group Two Undefined-Extension Checklist

P409 routes Group Two `/6` for C0/C1/D0-D3 through rebuilt #UD delivery.
Focused tests retain every defined byte operation and verify the faulting
real-mode vector frame for `/6`.

## P410 External-Interrupt Admission Checklist

P410 provides a project-native rebuilt runner boundary for IF-gated external
interrupt delivery. A successful delivery uses the existing hardware-interrupt
frame path and resumes a halted CPU; no PIC or device behavior is introduced.

## P411 Fault-Delivery Escalation Checklist

P411 models protected exception-delivery failure as a second architected fault.
Contributory and page-fault combinations escalate to `#DF`; a benign first
fault instead attempts the second fault. A failed `#DF` delivery is exposed as
the rebuilt triple-fault terminal condition. Focused evidence covers all three
outcomes through actual rebuilt `#UD` execution. Hardware reset after triple
fault, task gates, and unresolved outer-privilege delivery remain active work.

## P412 `84-8F` Undefined-Encoding Checklist

P412 completes the rebuilt `#UD` routing for `LEA` register-only forms,
`MOV CS,r/m16`, undefined segment-register encodings, and register-form
`LES/LDS`. Focused real-mode evidence verifies the vector-six target and fault
frame. POP-SS interrupt inhibition and protected segment-transfer completion
remain active dependencies.

## P413 AAM And C6/C7 Fault Checklist

P413 routes zero-base `AAM` through rebuilt `#DE` delivery and nonzero C6/C7
extensions through rebuilt `#UD` delivery. Focused real-mode tests verify both
fault targets and frames while retaining valid instruction behavior.

## P414 Maskable-Interrupt Inhibition Checklist

P414 models the one succeeding-instruction maskable-interrupt inhibition after
`POP SS`, `MOV SS,r/m16`, and `STI`. The project-native runner refuses external
IRQ admission during that bounded state and accepts it after the following
instruction boundary. Focused runner evidence covers all three sources. NMI and
PIC/device scheduling remain outside this CPU-only part.

## P415 16-bit TSS Privilege-Stack Checklist

P415 follows NXVM's `TSS_16` offsets for SP0 and SS0 while retaining the
existing 32-bit TSS offsets for ESP0 and SS0. Rebuilt interrupt delivery accepts
available or busy 16/32-bit TR cache types, verifies each layout's final TSS
byte, and assigns the selected SS D/B stack width independently from the TSS
layout. Focused tests cover `LTR` busy conversion for an available 16-bit TSS,
outer-privilege interrupt/IRET round trips through a 16-bit busy TSS, and the
NXVM-relevant v86 interrupt/IRET round trip. P416 completes target rings one
and two; task switching remains active.

## P416 TSS Ring-One And Ring-Two Stack Checklist

P416 completes project-native TSS privilege-stack selection for target rings
one and two. It derives 32-bit TSS ESPn/SSn offsets from `4 + n * 8` and
`8 + n * 8`, and 16-bit TSS SPn/SSn offsets from `2 + n * 4` and `4 + n * 4`.
Focused tests cover CPL3-to-CPL1 through a 32-bit busy TSS and CPL3-to-CPL2
through a 16-bit busy TSS, including selected SS D/B width and IRET return.
Task switching remains an active dependency.

## P417 `00-3F` Family Closure Checklist

P417 closes the numeric `00-3F` family after the later selector and fault work
unblocked P327's explicit dependencies. Focused execution evidence covers every
ALU family in default-16 register/immediate forms and default-32 memory forms,
plus independent `66` operand and `67` address-size forms. It covers the four
adjust instructions in virtual-8086 mode, all segment PUSH/POP encodings in
real/v86 modes, and protected POP selector `#NP` and `#GP` delivery through
IDT frames. `0F` remains the separately ledgered escape opcode.

## P418 Protected I/O Admission Checklist

P418 follows NXVM's protected I/O admission boundary: with CR0.PE set, access
is direct only when non-v86 CPL does not exceed IOPL or when virtual-8086 IOPL
is three. NXVM's I/O-map helper is explicitly unimplemented, so the rebuilt
32-bit TSS bitmap lookup is a project-native completion of the required CPU
behavior rather than a copied NXVM algorithm. The rebuilt path reads the TSS
bitmap offset, checks every port byte requested by 8/16/32-bit access, rejects
truncated maps, and routes denial through `#GP(0)` before any port-bus, memory,
index, or accumulator side effect. Focused tests cover direct protected access,
multi-port bitmap denial, missing/16-bit TSS rejection, v86 IOPL-three direct
access, v86 bitmap admission, truncation, and dispatcher-integrated scalar and
string I/O faults.

## P419 `60-6F` Family Closure Checklist

P419 closes the complete NXVM `60-6F` interval. It verifies PUSHA/POPA in
default-16 and default-32 code with independent `66` operand selection; BOUND
with signed word/dword limits and independent `66`/`67`; fixed-width ARPL in
protected default-16/default-32 code, plus its real-mode and v86 `#UD` paths;
FS/GS prefix execution; immediate PUSH/IMUL forms; and all INSB/INSW/INSD and
OUTSB/OUTSW/OUTSD forms. The string-I/O evidence covers REP state, direction,
fixed ES destinations, FS/GS sources, 16/32-bit data widths, and independent
`66`/`67` index and count selection. P419 corrects ARPL to follow NXVM's
`_IsProtected` definition, excluding virtual-8086 execution and delivering
`#UD` through the existing TSS frame. No device response or reference runtime
is added.

## P420 `80-8F` Family Closure Checklist

P420 closes the NXVM `80-8F` interval by joining the existing Group One,
TEST, XCHG, general MOV, segment-MOV, LEA, POP r/m, and undefined-encoding
evidence. The closure tests retain byte/word/dword register and memory forms,
ModR/M and SIB addressing, 16-bit/default-32 code, independent `66` and `67`,
segment overrides, flags, fault EIP, and stack behavior from the contributing
parts. P420 additionally enumerates all legal `MOV r/m16,Sreg` selectors
including CS/FS/GS and all legal `MOV Sreg,r/m16` destinations, while P414
retains the MOV SS interrupt-inhibition boundary. `82`, invalid segment
encodings, register-only LEA, and invalid POP r/m extensions retain rebuilt
`#UD` behavior. No reference runtime or device behavior is added.

## P421 `9C-9D` Hidden-CPL Privilege Checklist

P421 corrects rebuilt POPF privilege derivation to use the CS hidden-cache DPL,
matching NXVM's `_GetCPL` and the project's P388 segment-loader boundary,
rather than the visible CS selector RPL. A focused protected POPF regression
deliberately separates selector RPL from cached DPL and verifies that nonzero
CPL preserves IOPL. The larger `90-9F` interval remains open: NXVM itself marks
call-gate, task-gate, and cross-privilege far-control paths as TODO, and those
architecture paths require a separately complete project-native delivery.

## P422 `90-9F` NXVM Handler Closure Checklist

P422 closes the executable NXVM `90-9F` handler coverage: NOP and accumulator
XCHG, CBW/CWDE and CWD/CDQ, direct far CALL, WAIT, PUSHF/POPF including v86
IOPL admission and hidden-CPL privilege handling, and SAHF/LAHF. It adds a
focused protected far-JMP regression for a lower-DPL conforming code target,
which retains the current CPL while loading the target descriptor. NXVM marks
call gates, task gates, and cross-privilege far-control paths as TODO; they are
not claimed by this closure and remain explicit project-native 80386
architecture dependencies.

## P423 `A0-AF` NXVM Handler Closure Checklist

P423 closes executable NXVM `A0-AF` handler coverage by joining P340-P342 and
P377 with default-32 and independent `66`/`67` execution evidence. Focused
tests cover all moffs loads and stores, accumulator TEST widths and instruction
lengths, every generic string opcode, source overrides, ES-fixed destinations,
DF, REP/REPNE progression, zero-count completion, and 16-bit string addressing
inside default-32 code. A protected invalid-DS moffs access reaches rebuilt
`#GP` at the instruction-start EIP through the IDT path. Shared page, segment,
virtual-8086, and gate behavior remains governed by their dedicated completed
or active architecture entries; no external runtime or device behavior is used.

## P424 `B0-BF` NXVM Handler Closure Checklist

P424 closes executable NXVM `B0-BF` handler coverage. Focused tests enumerate
all byte and operand-sized register encodings in default-16 code, then enumerate
every B8-BF dword immediate in default-32 code and its `66`-selected word form.
The latter confirms little-endian decoding, prefix-inclusive instruction length,
and preservation of the destination register's upper half. These register-only
instructions have no ModR/M, memory, privilege, or fault path; no external
runtime or device behavior is used.

## P425 `C0-CF` NXVM Handler Closure Checklist

P425 closes executable NXVM `C0-CF` handler coverage by joining Group Two,
near/far returns, LES/LDS, C6/C7, ENTER/LEAVE, and interrupt/IRET evidence.
Focused default-32 regressions execute C1, C7, C4/C5 far pointers with 32-bit
addressing, and C2/CA return frames with cleanup. Existing focused records cover
all Group Two extensions and `#UD /6`, register and memory forms, `66/67`,
same- and outer-privilege interrupt/IRET, virtual-8086 frames, selector faults,
and architected access-fault delivery. NXVM-marked task/gate and other
separately ledgered architecture paths are not claimed by this closure.

## P426 `D0-DF` NXVM Handler Closure Checklist

P426 closes executable NXVM `D0-DF` handler coverage. P351 and P409 cover all
Group Two one/CL-count operations and `/6` vector-six delivery; P344 and P406
cover AAM/AAD including AAM base-zero vector-zero delivery; P345 and P426 cover
XLAT in 16-bit, `67`, and default-32 address modes. The dispatcher explicitly
routes D8-DF through rebuilt `#UD` and focused tests enumerate the entire range
with faulting EIP frames. No FPU, device, or reference runtime behavior is
synthesized.

## P427 `E0-FF` NXVM Handler Closure Checklist

P427 closes executable NXVM `E0-FF` handler coverage. Focused default-32 tests
cover LOOP/JECXZ, E9/EA, and FF near control without operand or address
overrides. Existing project-native evidence covers all LOOP conditions, scalar
port I/O widths and protected admission, near/far CALL/JMP and stack frames,
flag control, HLT/CLI/STI privilege and v86 admission, Group Three arithmetic
and faults, Group Four/Five extensions and `#UD`, plus maskable-interrupt
inhibition. NXVM-marked task/gate behavior and separately ledgered architecture
paths are not claimed by this closure.

## P428 `0F 00-26` NXVM System Handler Closure Checklist

P428 closes executable NXVM `0F 00-26` handler coverage: selector operations,
descriptor-table forms, LAR/LSL, CLTS, control/debug/test-register transfers,
and explicit undefined encodings. Focused evidence includes default-32 table
addressing and selector result width, GDT/LDT paths, CPL-zero admission,
descriptor and selector faults, 16/32-bit TSS state, and fixed-width test
register behavior. Task switching, task/call gates, and later 0F numeric
intervals remain separately ledgered.

## P429 `0F 80-9F` NXVM Conditional Handler Closure Checklist

P429 closes executable NXVM `0F 80-9F` handler coverage. P353 and P354 cover
all Jcc and SETcc selectors, true and false predicates, byte register/memory
destinations, EFLAGS preservation, and default-16 plus prefixed forms. P429
adds unprefixed default-32 SETcc memory addressing and default-32 `66` near-Jcc
displacement selection, retaining prefix-inclusive EIP advancement. These
handlers have no privilege or architectural fault behavior beyond their shared
memory-access path; later `0F` numeric intervals remain separately ledgered.

## P430 `0F A0-BF` NXVM Extended Handler Closure Checklist

P430 closes executable NXVM `0F A0-BF` handler coverage by joining P378, P379,
and P408. Focused evidence covers FS/GS stack forms; BT/BTS/BTR/BTC; SHLD/SHRD;
IMUL; LSS/LFS/LGS; MOVZX/MOVSX; BSF/BSR; Group Eight; explicit `#UD` encodings;
default-32 register operands; and default-32 ModR/M memory addressing. The
fixed-r32 `MOVZX/MOVSX r/m16` behavior is retained deliberately because it is
the NXVM handler behavior. Shared segment and page fault delivery remains in
the separately completed or active architecture entries.

## P431 Prefix And Decode-Length Closure Checklist

P431 closes the NXVM prefix/decode boundary: all segment overrides, LOCK,
REP/REPNE, one-time 66/67 non-default selection, last-prefix selection, both
CS D/B defaults, and the 15-byte instruction limit. The project-native
instruction reader rejects any opcode, ModR/M, or immediate fetch outside that
window; the executor delivers `#GP(0)` with the instruction-start EIP. P369
retains LOCK instruction-admission and atomicity coverage. This does not claim
completion for the shared segment/page/event architecture below.

## P432 Relative-Control Operand-Size Checklist

P432 follows NXVM `_e_jcc` and its operand-size-selected near target. Taken
`0F 80-8F` and `E8/E9/EB` relative targets now truncate to 16 bits only when
the instruction operand size is 16; sequential fallthrough and rel8-only
control forms retain CS code-address behavior. Focused high-EIP regressions
cover default-32 code with `66`, preventing CS D/B from being conflated with
the target operand size. Far control, task/call gates, and privilege-transfer
paths remain separately ledgered.

## P433 Cross-Page Memory Preflight Checklist

P433 follows NXVM's logical access preflight by translating every byte of a
16- or 32-bit range before physical reads or writes. Cross-page reads and
writes therefore use both resolved pages, while a later translation fault
leaves earlier destination bytes unchanged and records CR2 for the faulting
linear address. Segment/page edge semantics remain active architecture work.

## P434 Rebuilt Selected-ROM Trace Checkpoint

P434 reruns the project-owned selected DeskPro ROM trace after rebuilt opcode
and paging closure work. The rebuilt CPU executes reset ROM through two
instructions and stops at `F000:F907` because the project-native I/O bus is
unavailable. This is the next bounded whole-machine blocker: S5 I/O ownership,
not an unsupported CPU opcode, synthetic port response, firmware workaround,
or device implementation.

## P435 Coverage-Evidence Reconciliation Checklist

P435 reconciles the instruction manifest and 80386 matrix with the verified
opcode-ledger closure records P417-P434. It distinguishes completed executable
NXVM handler coverage from still-open shared architecture closure: complete
descriptor fault classification, task and call gates, remaining
privilege-transition cases, and the final S4/S5/S6 integration gates. It adds
no CPU behavior and does not claim S3 completion.

## P436 Interval-Evidence Correction Checklist

P436 corrects five top-table entries omitted by P435. P329 already records
full `40-5F` default-size, operand-override, stack-width, and register-form
coverage; P331 records all `70-7F` predicates and EIP behavior; P332 records
all Group One extensions and addressing forms; and P424 records every `B0-BF`
encoding in both code defaults. The correction adds no CPU behavior and does
not close shared protection or later M2 T2 gates.

## P437 Protected IRET Fault-Delivery Checklist

P437 replaces the rebuilt host-error path for an invalid protected IRET from an
outer CPL to a more-privileged target with project-native `#GP(selector)`
delivery. The original stack pointer is restored before fault delivery so the
new TSS-selected fault frame records the faulting instruction state. Focused
evidence executes CPL3 IRET to a ring-zero selector through a ring-zero TSS
stack and verifies the `#GP` handler, error code, and frame. The invalid v86
return path remains covered by the separately recorded dword-frame evidence.

## P439 Protected Software-Interrupt Fault-Delivery Checklist

P439 converts a protected software interrupt rejected by its IDT gate DPL from
a host `InterruptDeliveryError` into rebuilt `#GP` delivery. Focused evidence
executes CPL3 `INT imm8` through a ring-zero TSS stack, verifies the IDT error
code `0x0182`, and reaches the rebuilt ring-zero fault handler without a
reference runtime or synthetic device behavior.

## P440 Protected RETF Fault-Delivery Checklist

P440 restores RETF's speculative IP/CS stack pops when protected code-segment
loading fails, then lets the existing executor deliver the resulting fault.
Focused CPL3 evidence returns through a null selector, reaches the ring-zero
`#GP(0)` handler through the TSS stack, and preserves the original return-frame
stack pointer for fault-frame construction.

## P441 NXVM TODO Boundary Alignment Checklist

P441 records the owner-authorized rule that every NXVM `_______todo` CPU path
must have an explicit project-native prioritized TODO instead of being treated
as an unowned S3 blocker. The rebuilt sources now mark `TODO(High)` at direct
and indirect protected far CALL/JMP dispatch, protected RETF outer-privilege
return, and IDT task-gate decoding. These correspond to NXVM
`_kec_task_switch` (2153), `_ser_call_far_cs_conf` (2271),
`_ser_call_far_cs_nonc` (2290), `_ser_call_far_call_gate` (2310),
`_ser_call_far_task_gate` (2319), `_ser_call_far_tss` (2328),
`_ser_ret_far_outer` (2610), `_ser_jmp_far_call_gate` (2661),
`_ser_jmp_far_task_gate` (2670), and `_ser_jmp_far_tss` (2679) in
`../nxvm/src/device/vcpuins.c`. The project retains its independently tested
interrupt/trap-gate, privilege-stack, and IRET behavior; NXVM's TODO-marked
interrupt wrappers do not erase that completed project-native work. These
boundaries remain visibly deferred and cannot be claimed as implemented.

## P442 Complete NXVM TODO Boundary Alignment Checklist

P442 completes P441's source alignment across every remaining NXVM
`_______todo` entry. Rebuilt `TODO(High)` comments now identify the NXVM I/O-map
helper `_kpa_test_iomap` (1170), protected interrupt delivery
`_ser_int_protected` (2382), interrupt wrappers `_e_int3`, `_e_into`,
`_e_int_n`, `_e_intr_n`, `_e_except_n`, and `_e_iret` (2738-2816), `WAIT`
(8466), and the post-80386 undefined entries `WBINVD`, `WRMSR`, `RDMSR`,
`CPUID`, and `RSM` (12546-12977) in `../nxvm/src/device/vcpuins.c`. The
project's independently tested I/O bitmap, interrupt delivery, WAIT `#NM`, and
`#UD` behavior remains executable; the comments preserve NXVM's TODO status as
an explicit review boundary rather than silently claiming NXVM implementation.

## P443 Protected Descriptor Accessed-Bit Checklist

P443 follows NXVM `_ksa_load_sreg` at `vcpuins.c` 601-763: a successful
protected code, data, or stack segment load sets the descriptor Accessed bit
and writes it back to its GDT or active LDT entry. The project-native shared
loader validates type, presence, and privilege before writing the bit, so a
rejected load leaves the descriptor unchanged. Focused tests cover GDT code,
data, and stack loads plus active-LDT data loading. Task and call-gate paths
remain NXVM TODO-aligned exclusions.

## P444 Control-Transfer Target Validation Checklist

P444 follows NXVM `_kec_call_near`, `_kec_jmp_near`, `_kec_call_far`,
`_kec_jmp_far`, `_kec_ret_near`, and `_kec_ret_far` at `vcpuins.c`
2092-2262. Project-native code now validates a target code offset before
committing EIP, before pushing a CALL return frame, or before committing a FAR
CS transfer. Direct and indirect near/far control, conditional transfers,
LOOP-family transfers, and same-privilege return paths use the shared boundary.
Focused protected FAR-JMP evidence verifies an out-of-limit target delivers
`#GP` at the source instruction EIP without committing the target CS. NXVM
TODO-aligned task/call-gate and outer-RETF paths remain excluded.

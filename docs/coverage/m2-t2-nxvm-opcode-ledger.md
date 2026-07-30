# M2 T2 NXVM Opcode Reconstruction Ledger

## Use

This ledger is the implementation order and completion record for the rebuilt
CPU. Source locations refer to `../nxvm/src/device/vcpuins.c`. "Legacy"
describes the frozen `src/cpu/x86/` reference, not new-CPU coverage. All rows
begin as planned; no row is complete until its focused tests, comparison record,
tracking, provenance, and full gate are recorded in the same verified part.

| Opcode or family                                      | NXVM source location                         | 80386 behavior                                                                   | Rebuilt destination                                                                                                                                                                             | Legacy coverage             | Required tests                                                | PCjs comparison | Status                                                                                                                  |
| ----------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Prefixes                                              | 1246-1282, 5545-5977, 7041-7073, 10968-11058 | Segment, LOCK, REP, operand-size, address-size, decode length, fault EIP         | `decode/prefix.ts`, `decode/decoder.ts`                                                                                                                                                         | Partial                     | Repeated prefixes; 16/default-32; 66/67; overrides; fault EIP | Required        | In progress: P321-P322 decode boundary                                                                                  |
| 00-05 ADD                                             | 4861-4941                                    | Byte and operand-sized add; ModR/M and accumulator immediates; flags             | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Register/memory; widths; CF/OF/AF/SF/ZF/PF                    | Required        | In progress: P327 base execution; P391 segment-stack loading                                                            |
| 08-0D OR                                              | 5001-5081                                    | Logical OR forms and defined flags                                               | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Register/memory; widths; 66/67                                | Required        | In progress: P327 base execution                                                                                        |
| 10-15 ADC                                             | 5153-5233                                    | Add with carry forms and flags                                                   | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Carry boundaries; register/memory; widths                     | Required        | In progress: P327 base execution                                                                                        |
| 18-1D SBB                                             | 5293-5373                                    | Subtract with borrow forms and flags                                             | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Borrow boundaries; register/memory; widths                    | Required        | In progress: P327 base execution                                                                                        |
| 20-25 AND                                             | 5433-5513                                    | Logical AND forms and defined flags                                              | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Register/memory; widths; 66/67                                | Required        | In progress: P327 base execution                                                                                        |
| 27-2F decimal and ASCII adjust                        | 5559-5991                                    | DAA, DAS, AAA, AAS                                                               | `instructions/first-interval.ts`                                                                                                                                                                | Partial                     | Defined flags and invalid-mode cases                          | Required        | In progress: P327 base execution                                                                                        |
| 28-2D SUB                                             | 5582-5662                                    | Subtract forms and flags                                                         | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Borrow/overflow; register/memory; widths                      | Required        | In progress: P327 base execution                                                                                        |
| 30-35 XOR                                             | 5731-5811                                    | Logical XOR forms and defined flags                                              | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Register/memory; widths; 66/67                                | Required        | Implemented: P327, P399                                                                                                 |
| 38-3D CMP                                             | 5878-5948                                    | Compare forms without destination write                                          | `instructions/arithmetic.ts`, `instructions/first-interval.ts`                                                                                                                                  | Partial                     | Full subtraction flags; memory not written                    | Required        | Implemented: P327, P399                                                                                                 |
| 40-4F INC and DEC                                     | 6012-6447                                    | Register inc/dec with preserved CF                                               | `instructions/register-stack.ts`                                                                                                                                                                | Partial                     | 16/default-32; CF preservation; overflow                      | Required        | Implemented: P329; broader differential evidence remains active                                                         |
| 50-5F PUSH and POP                                    | 6476-6866                                    | General-register stack forms                                                     | `instructions/register-stack.ts`                                                                                                                                                                | Partial                     | Operand data versus SS stack address width                    | Required        | Implemented: P329; broader differential evidence remains active                                                         |
| 60-61 PUSHA and POPA                                  | 6892-6933                                    | Full register-frame stack forms                                                  | `instructions/frame-immediate.ts`                                                                                                                                                               | Partial                     | Original SP/ESP; 16/default-32; faults                        | Required        | Implemented: P330; fault delivery remains active                                                                        |
| 62-6F frame, bounds, immediate arithmetic, string I/O | 6972-7265                                    | BOUND, ARPL, FS/GS, PUSH/IMUL immediates, INS/OUTS                               | `instructions/frame-immediate.ts`, `instructions/string-io.ts`                                                                                                                                  | Partial                     | Bounds faults; privilege; 66/67; REP and I/O boundary         | Required        | In progress: P330 implements 68-6B only                                                                                 |
| 70-7F short Jcc                                       | 7309-7494                                    | All short conditional transfers                                                  | `instructions/control.ts`                                                                                                                                                                       | Partial                     | Taken/not-taken; flags; 16/default-32 EIP                     | Required        | Implemented: P331; broader differential evidence remains active                                                         |
| 80, 81, 83 Group One                                  | 7507-7840                                    | Immediate arithmetic and compare groups                                          | `instructions/group-one.ts`                                                                                                                                                                     | Partial                     | Every extension; sign extension; register/memory; widths      | Required        | Implemented: P332; broader differential evidence remains active                                                         |
| 84-8F ModR/M, segment, and stack forms                | 7853-8130                                    | TEST, XCHG, MOV, segment moves, LEA, POP r/m                                     | `instructions/test.ts`, `instructions/exchange.ts`, `instructions/move.ts`, `instructions/lea.ts`, `instructions/register-stack.ts`                                                             | Partial                     | ModR/M/SIB; segment validation; 66/67                         | Required        | In progress: P333-P336 implement 84-8D                                                                                  |
| 90-9F exchange, flags, far call, and flag transfer    | 8143-8626                                    | NOP, XCHG AX, CBW/CWD, far call, PUSHF/POPF, SAHF/LAHF                           | `instructions/accumulator-exchange.ts`, `instructions/sign-extension.ts`, `instructions/flag-transfer.ts`, `instructions/control.ts`, `instructions/register-stack.ts`                          | Partial                     | Flag privilege; operand width; far control transfer           | Required        | In progress: P337-P339 implement 90-99 and 9E-9F                                                                        |
| A0-AF moffs, strings, TEST, immediates                | 8637-9589                                    | Moffs, MOVS/CMPS/STOS/LODS/SCAS, accumulator TEST, register immediates           | `instructions/moffs-move.ts`, `instructions/accumulator-test.ts`, `instructions/string.ts`, `instructions/move.ts`                                                                              | Partial                     | REP/REPNE; source overrides; 16/default-32; faults            | Required        | In progress: P341-P342 and P377 implement A0-AF execution; protected segment faults remain active                       |
| B0-BF immediate register moves                        | 9325-9589                                    | Byte and operand-sized register immediates                                       | `instructions/immediate-move.ts`                                                                                                                                                                | Partial                     | All registers; instruction length; 66                         | Required        | Implemented: P340; broader differential evidence remains active                                                         |
| C0-CF groups, returns, interrupts, frame              | 9613-10338                                   | Shifts/rotates, RET, LES/LDS, MOV immediate groups, ENTER/LEAVE, RETF, INT, IRET | `instructions/immediate-modrm-move.ts`, `instructions/stack-frame-control.ts`, `instructions/shift-rotate.ts`, `instructions/groups.ts`, `instructions/control.ts`, `instructions/interrupt.ts` | Partial                     | Every group extension; count/flags; privilege; fault EIP      | Required        | In progress: P351 implements C0/C1                                                                                      |
| D0-DF shifts, adjust, XLAT, loops, port I/O           | 10250-10941                                  | Shift/rotate count variants, AAM/AAD, XLAT, LOOP, JCXZ, IN/OUT                   | `instructions/shift-rotate.ts`, `instructions/ascii-adjust.ts`, `instructions/xlat.ts`, `instructions/loop.ts`, `instructions/groups.ts`, `instructions/control.ts`, `instructions/io.ts`       | Partial                     | Count zero; CL; 66/67; I/O permissions                        | Required        | In progress: P344-P346 and P351                                                                                         |
| E0-FF control, flags, Groups Three/Four/Five          | 10795-11610                                  | Near/far call and jump, flag control, F6/F7, FE/FF                               | `instructions/near-control.ts`, `instructions/group-three.ts`, `instructions/group-four-five.ts`, `instructions/flag-control.ts`, `instructions/control.ts`, `instructions/groups.ts`           | Partial                     | All extensions; divide faults; far privilege; SS width        | Required        | In progress: P352 implements local flag control                                                                         |
| 0F decode and system groups                           | 5141, 11629-12637                            | Escape decoding, descriptor/table, CR/DR/TR, LAR/LSL, CLTS                       | `decode/decoder.ts`, `instructions/system.ts`                                                                                                                                                   | Partial                     | CPL; descriptor faults; 16/default-32; 66/67                  | Required        | In progress: P353 and P380-P384 implement 0F 00-03, 06, 20-24, and 26; descriptor-fault completion remains active       |
| 0F 80-8F near Jcc and SETcc                           | 12649-12898                                  | Near conditional transfers and byte condition stores                             | `instructions/near-conditional-control.ts`, `instructions/set-condition.ts`, `instructions/control.ts`                                                                                          | Partial                     | Taken/not-taken; ModR/M; fault EIP                            | Required        | In progress: P353-P354 implement 80-9F                                                                                  |
| 0F A0-AF extended bit, shift, segment forms           | 12906-13203                                  | FS/GS stack forms, BT/BTS/BTR/BTC, SHLD/SHRD, IMUL, LSS/LFS/LGS, MOVZX           | `instructions/extended.ts`                                                                                                                                                                      | Partial                     | Bit addressing; flags; segment faults; 66/67                  | Required        | In progress: P378 implements NXVM-covered A0-AF forms and dependent B2-B7 forms; protected fault routing remains active |
| 0F B0-BF extended scans and sign extension            | 13203-13251                                  | BTC, BSF/BSR, MOVSX and immediate bit group                                      | `instructions/extended.ts`                                                                                                                                                                      | Partial                     | Zero input; flags; ModR/M; widths                             | Required        | In progress: P379 implements NXVM-covered BA-BF forms; non-NXVM B0-B1 remain excluded                                   |
| Explicit NXVM undefined extensions                    | 12546-12552, 12637-12649, 12924-12977        | WBINVD, WRMSR, RDMSR, CPUID, RSM decode as `#UD`                                 | `instructions/system.ts`                                                                                                                                                                        | Complete reference evidence | Prefixes and fault EIP                                        | Required        | Implemented: P385, P393                                                                                                 |
| Segmentation, paging, exceptions, and trace           | 51-1145, 2033-3096, 13315-13917              | Logical/linear access, descriptors, stack, faults, interrupts, trace             | `protection/`, `events/`, `debug/`                                                                                                                                                              | Partial                     | PF/GP/SS/NP; privilege; ROM trace; differential state dumps   | Required        | In progress: P392 rebuilt page walks                                                                                    |

## P355 Rebuilt Dispatcher Boundary

P355 adds a project-owned dispatcher for completed rebuilt instruction families.
It supports sequence-level execution and does not switch the machine runtime,
which remains a later integration gate.

## P356 Rebuilt Reset-ROM Runner

P356 composes PhysicalMemory, the rebuilt executor, and dispatcher into an
independent runner. It proves high-ROM reset-alias execution without legacy CPU
runtime use; broad ROM trace compatibility remains an active completion gate.

## P327 `00-3F` Checklist And Deferred Dependencies

P327 is an in-progress execution slice. It executes the base ALU encodings
`00-05`, `08-0D`, `10-15`, `18-1D`, `20-25`, `28-2D`, `30-35`, and `38-3D`;
the adjust encodings `27`, `2F`, `37`, and `3F`; and real-mode forms of
`06/07`, `0E`, `16/17`, and `1E/1F`. Prefixes `26`, `2E`, `36`, and `3E` are
decoded and exercised where applicable. The covered ALU rows include
byte/word/dword, register/memory, default-16, default-32, `66`, `67`, flags,
and instruction-start preservation tests.

The following are explicit dependencies before `00-3F` can be complete:

- Protected-mode selector validation and `#GP`, `#NP`, and `#SS` delivery for
  `06/07`, `16/17`, and `1E/1F`.
- Privileged or mode-specific behavior and fault routing for applicable
  adjust and segment forms.
- `0F` is an escape opcode owned by the separate `0F` extended-system ledger
  rows; P327 makes no implementation claim for it.

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

The remaining `60-6F` dependencies are explicit: `62` needs `#BR` delivery;
`63` needs protected-mode-only ARPL and selector fault routing; `64/65` prefix
decode exists but FS/GS selector loading remains unfinished; and `6C-6F` need
CPU port I/O, REP iteration, I/O privilege checks, and fault behavior. These
dependencies prevent a completion claim for the full interval.

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
supplied. Protected-mode IOPL and TSS I/O-permission checks remain explicit
protection-system dependencies; no device response is synthesized.

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
while the counter remains nonzero. Protected I/O privilege checks remain an
active protection dependency.

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

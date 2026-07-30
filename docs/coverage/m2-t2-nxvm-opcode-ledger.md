# M2 T2 NXVM Opcode Reconstruction Ledger

## Use

This ledger is the implementation order and completion record for the rebuilt
CPU. Source locations refer to `../nxvm/src/device/vcpuins.c`. "Legacy"
describes the frozen `src/cpu/x86/` reference, not new-CPU coverage. All rows
begin as planned; no row is complete until its focused tests, comparison record,
tracking, provenance, and full gate are recorded in the same verified part.

| Opcode or family | NXVM source location | 80386 behavior | Rebuilt destination | Legacy coverage | Required tests | PCjs comparison | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Prefixes | 1246-1282, 5545-5977, 7041-7073, 10968-11058 | Segment, LOCK, REP, operand-size, address-size, decode length, fault EIP | `decode/prefix.ts`, `decode/decoder.ts` | Partial | Repeated prefixes; 16/default-32; 66/67; overrides; fault EIP | Required | In progress: P321-P322 decode boundary |
| 00-05 ADD | 4861-4941 | Byte and operand-sized add; ModR/M and accumulator immediates; flags | `instructions/arithmetic.ts`, `instructions/first-interval.ts` | Partial | Register/memory; widths; CF/OF/AF/SF/ZF/PF | Required | In progress: P327 base execution |
| 08-0D OR | 5001-5081 | Logical OR forms and defined flags | `instructions/arithmetic.ts`, `instructions/first-interval.ts` | Partial | Register/memory; widths; 66/67 | Required | In progress: P327 base execution |
| 10-15 ADC | 5153-5233 | Add with carry forms and flags | `instructions/arithmetic.ts`, `instructions/first-interval.ts` | Partial | Carry boundaries; register/memory; widths | Required | In progress: P327 base execution |
| 18-1D SBB | 5293-5373 | Subtract with borrow forms and flags | `instructions/arithmetic.ts`, `instructions/first-interval.ts` | Partial | Borrow boundaries; register/memory; widths | Required | In progress: P327 base execution |
| 20-25 AND | 5433-5513 | Logical AND forms and defined flags | `instructions/arithmetic.ts`, `instructions/first-interval.ts` | Partial | Register/memory; widths; 66/67 | Required | In progress: P327 base execution |
| 27-2F decimal and ASCII adjust | 5559-5991 | DAA, DAS, AAA, AAS | `instructions/first-interval.ts` | Partial | Defined flags and invalid-mode cases | Required | In progress: P327 base execution |
| 28-2D SUB | 5582-5662 | Subtract forms and flags | `instructions/arithmetic.ts`, `instructions/first-interval.ts` | Partial | Borrow/overflow; register/memory; widths | Required | In progress: P327 base execution |
| 30-35 XOR | 5731-5811 | Logical XOR forms and defined flags | `instructions/arithmetic.ts` | Partial | Register/memory; widths; 66/67 | Required | Planned |
| 38-3D CMP | 5878-5948 | Compare forms without destination write | `instructions/arithmetic.ts` | Partial | Full subtraction flags; memory not written | Required | Planned |
| 40-4F INC and DEC | 6012-6447 | Register inc/dec with preserved CF | `instructions/register-stack.ts` | Partial | 16/default-32; CF preservation; overflow | Required | Implemented: P329; broader differential evidence remains active |
| 50-5F PUSH and POP | 6476-6866 | General-register stack forms | `instructions/register-stack.ts` | Partial | Operand data versus SS stack address width | Required | Implemented: P329; broader differential evidence remains active |
| 60-61 PUSHA and POPA | 6892-6933 | Full register-frame stack forms | `instructions/frame-immediate.ts` | Partial | Original SP/ESP; 16/default-32; faults | Required | Implemented: P330; fault delivery remains active |
| 62-6F frame, bounds, immediate arithmetic, string I/O | 6972-7265 | BOUND, ARPL, FS/GS, PUSH/IMUL immediates, INS/OUTS | `instructions/frame-immediate.ts`, `instructions/string-io.ts` | Partial | Bounds faults; privilege; 66/67; REP and I/O boundary | Required | In progress: P330 implements 68-6B only |
| 70-7F short Jcc | 7309-7494 | All short conditional transfers | `instructions/control.ts` | Partial | Taken/not-taken; flags; 16/default-32 EIP | Required | Implemented: P331; broader differential evidence remains active |
| 80, 81, 83 Group One | 7507-7840 | Immediate arithmetic and compare groups | `instructions/group-one.ts` | Partial | Every extension; sign extension; register/memory; widths | Required | Implemented: P332; broader differential evidence remains active |
| 84-8F ModR/M, segment, and stack forms | 7853-8130 | TEST, XCHG, MOV, segment moves, LEA, POP r/m | `instructions/test.ts`, `instructions/exchange.ts`, `instructions/move.ts`, `instructions/lea.ts`, `instructions/register-stack.ts` | Partial | ModR/M/SIB; segment validation; 66/67 | Required | In progress: P333-P336 implement 84-8D |
| 90-9F exchange, flags, far call, and flag transfer | 8143-8626 | NOP, XCHG AX, CBW/CWD, far call, PUSHF/POPF, SAHF/LAHF | `instructions/accumulator-exchange.ts`, `instructions/sign-extension.ts`, `instructions/flag-transfer.ts`, `instructions/control.ts`, `instructions/register-stack.ts` | Partial | Flag privilege; operand width; far control transfer | Required | In progress: P337-P339 implement 90-99 and 9E-9F |
| A0-AF moffs, strings, TEST, immediates | 8637-9589 | Moffs, MOVS/CMPS/STOS/LODS/SCAS, accumulator TEST, register immediates | `instructions/moffs-move.ts`, `instructions/accumulator-test.ts`, `instructions/string.ts`, `instructions/move.ts` | Partial | REP/REPNE; source overrides; 16/default-32; faults | Required | In progress: P341-P342 implement A0-A3 and A8-A9 |
| B0-BF immediate register moves | 9325-9589 | Byte and operand-sized register immediates | `instructions/immediate-move.ts` | Partial | All registers; instruction length; 66 | Required | Implemented: P340; broader differential evidence remains active |
| C0-CF groups, returns, interrupts, frame | 9613-10338 | Shifts/rotates, RET, LES/LDS, MOV immediate groups, ENTER/LEAVE, RETF, INT, IRET | `instructions/immediate-modrm-move.ts`, `instructions/stack-frame-control.ts`, `instructions/shift-rotate.ts`, `instructions/groups.ts`, `instructions/control.ts`, `instructions/interrupt.ts` | Partial | Every group extension; count/flags; privilege; fault EIP | Required | In progress: P351 implements C0/C1 |
| D0-DF shifts, adjust, XLAT, loops, port I/O | 10250-10941 | Shift/rotate count variants, AAM/AAD, XLAT, LOOP, JCXZ, IN/OUT | `instructions/shift-rotate.ts`, `instructions/ascii-adjust.ts`, `instructions/xlat.ts`, `instructions/loop.ts`, `instructions/groups.ts`, `instructions/control.ts`, `instructions/io.ts` | Partial | Count zero; CL; 66/67; I/O permissions | Required | In progress: P344-P346 and P351 |
| E0-FF control, flags, Groups Three/Four/Five | 10795-11610 | Near/far call and jump, flag control, F6/F7, FE/FF | `instructions/near-control.ts`, `instructions/group-three.ts`, `instructions/group-four-five.ts`, `instructions/flag-control.ts`, `instructions/control.ts`, `instructions/groups.ts` | Partial | All extensions; divide faults; far privilege; SS width | Required | In progress: P352 implements local flag control |
| 0F decode and system groups | 5141, 11629-12637 | Escape decoding, descriptor/table, CR/DR/TR, LAR/LSL, CLTS | `decode/decoder.ts`, `instructions/system.ts` | Partial | CPL; descriptor faults; 16/default-32; 66/67 | Required | In progress: P353 adds escape decode |
| 0F 80-8F near Jcc and SETcc | 12649-12898 | Near conditional transfers and byte condition stores | `instructions/near-conditional-control.ts`, `instructions/set-condition.ts`, `instructions/control.ts` | Partial | Taken/not-taken; ModR/M; fault EIP | Required | In progress: P353-P354 implement 80-9F |
| 0F A0-AF extended bit, shift, segment forms | 12906-13203 | FS/GS stack forms, BT/BTS/BTR/BTC, SHLD/SHRD, IMUL, LSS/LFS/LGS, MOVZX | `instructions/extended.ts` | Partial | Bit addressing; flags; segment faults; 66/67 | Required | Planned |
| 0F B0-BF extended scans and sign extension | 13203-13251 | BTC, BSF/BSR, MOVSX and immediate bit group | `instructions/extended.ts` | Partial | Zero input; flags; ModR/M; widths | Required | Planned |
| Explicit NXVM undefined extensions | 12546-12552, 12637-12649, 12924-12977 | WBINVD, WRMSR, RDMSR, CPUID, RSM decode as `#UD` | `instructions/system.ts` | Complete reference evidence | Prefixes and fault EIP | Required | Planned |
| Segmentation, paging, exceptions, and trace | 51-1145, 2033-3096, 13315-13917 | Logical/linear access, descriptors, stack, faults, interrupts, trace | `protection/`, `events/`, `debug/` | Partial | PF/GP/SS/NP; privilege; ROM trace; differential state dumps | Required | Planned |

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

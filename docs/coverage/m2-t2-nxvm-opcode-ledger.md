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
| 80, 81, 83 Group One | 7507-7840 | Immediate arithmetic and compare groups | `instructions/group-one.ts` | Partial | Every extension; sign extension; register/memory; widths | Required | Planned |
| 84-8F ModR/M, segment, and stack forms | 7853-8130 | TEST, XCHG, MOV, segment moves, LEA, POP r/m | `instructions/move.ts`, `instructions/register-stack.ts` | Partial | ModR/M/SIB; segment validation; 66/67 | Required | Planned |
| 90-9F exchange, flags, far call, and flag transfer | 8143-8626 | NOP, XCHG AX, CBW/CWD, far call, PUSHF/POPF, SAHF/LAHF | `instructions/control.ts`, `instructions/register-stack.ts` | Partial | Flag privilege; operand width; far control transfer | Required | Planned |
| A0-AF moffs, strings, TEST, immediates | 8637-9589 | Moffs, MOVS/CMPS/STOS/LODS/SCAS, accumulator TEST, register immediates | `instructions/string.ts`, `instructions/move.ts` | Partial | REP/REPNE; source overrides; 16/default-32; faults | Required | Planned |
| B0-BF immediate register moves | 9325-9589 | Byte and operand-sized register immediates | `instructions/move.ts` | Partial | All registers; instruction length; 66 | Required | Planned |
| C0-CF groups, returns, interrupts, frame | 9613-10338 | Shifts/rotates, RET, LES/LDS, MOV immediate groups, ENTER/LEAVE, RETF, INT, IRET | `instructions/groups.ts`, `instructions/control.ts`, `instructions/interrupt.ts` | Partial | Every group extension; count/flags; privilege; fault EIP | Required | Planned |
| D0-DF shifts, adjust, XLAT, loops, port I/O | 10250-10941 | Shift/rotate count variants, AAM/AAD, XLAT, LOOP, JCXZ, IN/OUT | `instructions/groups.ts`, `instructions/control.ts`, `instructions/io.ts` | Partial | Count zero; CL; 66/67; I/O permissions | Required | Planned |
| E0-FF control, flags, Groups Three/Four/Five | 10795-11610 | Near/far call and jump, flag control, F6/F7, FE/FF | `instructions/control.ts`, `instructions/groups.ts` | Partial | All extensions; divide faults; far privilege; SS width | Required | Planned |
| 0F decode and system groups | 5141, 11629-12637 | Escape decoding, descriptor/table, CR/DR/TR, LAR/LSL, CLTS | `decode/decoder.ts`, `instructions/system.ts` | Partial | CPL; descriptor faults; 16/default-32; 66/67 | Required | Planned |
| 0F 80-8F near Jcc and SETcc | 12649-12898 | Near conditional transfers and byte condition stores | `instructions/control.ts` | Partial | Taken/not-taken; ModR/M; fault EIP | Required | Planned |
| 0F A0-AF extended bit, shift, segment forms | 12906-13203 | FS/GS stack forms, BT/BTS/BTR/BTC, SHLD/SHRD, IMUL, LSS/LFS/LGS, MOVZX | `instructions/extended.ts` | Partial | Bit addressing; flags; segment faults; 66/67 | Required | Planned |
| 0F B0-BF extended scans and sign extension | 13203-13251 | BTC, BSF/BSR, MOVSX and immediate bit group | `instructions/extended.ts` | Partial | Zero input; flags; ModR/M; widths | Required | Planned |
| Explicit NXVM undefined extensions | 12546-12552, 12637-12649, 12924-12977 | WBINVD, WRMSR, RDMSR, CPUID, RSM decode as `#UD` | `instructions/system.ts` | Complete reference evidence | Prefixes and fault EIP | Required | Planned |
| Segmentation, paging, exceptions, and trace | 51-1145, 2033-3096, 13315-13917 | Logical/linear access, descriptors, stack, faults, interrupts, trace | `protection/`, `events/`, `debug/` | Partial | PF/GP/SS/NP; privilege; ROM trace; differential state dumps | Required | Planned |

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

## Status Rule

"Implemented" means the rebuilt CPU only. Legacy tests and trace evidence may
support differential tests, but they cannot mark a rebuilt family complete.

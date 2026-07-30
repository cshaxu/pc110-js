# M2 T2 NXVM Opcode Reconstruction Ledger

## Use

This ledger is the implementation order and completion record for the rebuilt
CPU. Source locations refer to `../nxvm/src/device/vcpuins.c`. "Legacy"
describes the frozen `src/cpu/x86/` reference, not new-CPU coverage. All rows
begin as planned; no row is complete until its focused tests, comparison record,
tracking, provenance, and full gate are recorded in the same verified part.

| Opcode or family | NXVM source location | 80386 behavior | Rebuilt destination | Legacy coverage | Required tests | PCjs comparison | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Prefixes | 1246-1282, 5545-5977, 7041-7073, 10968-11058 | Segment, LOCK, REP, operand-size, address-size, decode length, fault EIP | `decode/prefix.ts` | Partial | Repeated prefixes; 16/default-32; 66/67; overrides; fault EIP | Required | Planned |
| 00-05 ADD | 4861-4941 | Byte and operand-sized add; ModR/M and accumulator immediates; flags | `instructions/arithmetic.ts` | Partial | Register/memory; widths; CF/OF/AF/SF/ZF/PF | Required | Planned |
| 08-0D OR | 5001-5081 | Logical OR forms and defined flags | `instructions/arithmetic.ts` | Partial | Register/memory; widths; 66/67 | Required | Planned |
| 10-15 ADC | 5153-5233 | Add with carry forms and flags | `instructions/arithmetic.ts` | Partial | Carry boundaries; register/memory; widths | Required | Planned |
| 18-1D SBB | 5293-5373 | Subtract with borrow forms and flags | `instructions/arithmetic.ts` | Partial | Borrow boundaries; register/memory; widths | Required | Planned |
| 20-25 AND | 5433-5513 | Logical AND forms and defined flags | `instructions/arithmetic.ts` | Partial | Register/memory; widths; 66/67 | Required | Planned |
| 27-2F decimal and ASCII adjust | 5559-5991 | DAA, DAS, AAA, AAS | `instructions/adjust.ts` | Partial | Defined flags and invalid-mode cases | Required | Planned |
| 28-2D SUB | 5582-5662 | Subtract forms and flags | `instructions/arithmetic.ts` | Partial | Borrow/overflow; register/memory; widths | Required | Planned |
| 30-35 XOR | 5731-5811 | Logical XOR forms and defined flags | `instructions/arithmetic.ts` | Partial | Register/memory; widths; 66/67 | Required | Planned |
| 38-3D CMP | 5878-5948 | Compare forms without destination write | `instructions/arithmetic.ts` | Partial | Full subtraction flags; memory not written | Required | Planned |
| 40-4F INC and DEC | 6012-6447 | Register inc/dec with preserved CF | `instructions/register-stack.ts` | Partial | 16/default-32; CF preservation; overflow | Required | Planned |
| 50-5F PUSH and POP | 6476-6866 | General-register stack forms | `instructions/register-stack.ts` | Partial | Operand data versus SS stack address width | Required | Planned |
| 60-61 PUSHA and POPA | 6892-6933 | Full register-frame stack forms | `instructions/register-stack.ts` | Partial | Original SP/ESP; 16/default-32; faults | Required | Planned |
| 62-6F frame, bounds, immediate arithmetic, string I/O | 6972-7265 | BOUND, ARPL, FS/GS, PUSH/IMUL immediates, INS/OUTS | `instructions/frame-immediate.ts`, `instructions/string-io.ts` | Partial | Bounds faults; privilege; 66/67; REP and I/O boundary | Required | Planned |
| 70-7F short Jcc | 7309-7494 | All short conditional transfers | `instructions/control.ts` | Partial | Taken/not-taken; flags; 16/default-32 EIP | Required | Planned |
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

## Status Rule

"Implemented" means the rebuilt CPU only. Legacy tests and trace evidence may
support differential tests, but they cannot mark a rebuilt family complete.

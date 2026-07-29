# M2 T2 S3 Execution Provenance

## Identity

- Subsystem: generic 80386 instruction fetch and execution boundary.
- Migration milestone, task, and subtask: M2 T2 S3 P2.
- Source repository and commit: PCjs at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source paths: `machines/pcx86/modules/v2/cpux86.js` and `x86ops.js`.
- Destination paths: `src/cpu/x86/execution.ts` and focused tests.
- Runtime dependency closure: none.
- Excluded content: PCjs runtime JavaScript, prefetch optimization, ROMs,
  media, browser code, and archival content.

## Migration

- Imported behavior: opcode fetch begins at the current linear instruction
  address derived from CS:EIP; NOP advances EIP and HLT stops instruction
  execution until an interrupt resumes the CPU; a real-mode far jump loads a
  new CS selector and 16-bit instruction pointer; register-immediate and
  relative jumps update architectural state; immediate-port writes pass through
  a project-owned port-writer interface; SAHF and real-mode CLI update flags.
  The observed register-form LMSW preserves PE and MSW fixed bits; real-mode
  register segment loads update selector and base while preserving cached limit.
  Immediate port reads, TEST, JNZ, and 16-bit LOOP follow the observed
  reset-ROM path. ModR/M field decoding and register-form MOV/XOR support the
  next observed ROM sequence. Register-byte CMP derives 8-bit subtraction flags
  for following JBE and JNZ conditional branches; byte-register XOR uses the
  same logic-flag contract. The observed byte shift updates its defined flags,
  and JCXZ uses the 16-bit count register. The observed CS-overridden far jump
  reads its m16:16 target through the project-owned byte-memory boundary.
- M2 T2 S3 P18 adds project-native 16-bit ModR/M effective-address decoding
  and the memory-source form of `MOV r16, r/m16`, including direct, indexed,
  displacement, and BP-default-SS addressing.
- M2 T2 S3 P19 replaces the observed CS-overridden far-jump table special case
  with a project-native real-mode `FF /5 m16:16` path that shares the 16-bit
  ModR/M decoder and supports default or CS-overridden pointer segments.
- M2 T2 S3 P20 adds `CMP r/m16, imm16` (`81 /7 iw`) for register and memory
  operands with complete 16-bit subtraction flags, covering the reset-ROM
  extension signature check after `XOR BX, BX`.
- M2 T2 S3 P21 adds the observed CS-overridden memory-source `MOV r16, r/m16`
  form and shares its 16-bit ModR/M path with the default-segment instruction.
- M2 T2 S3 P22 extends real-mode `MOV Sreg, r/m16` to direct and computed
  memory operands through the same project-native ModR/M decoder.
- M2 T2 S3 P23 adds `MOV r/m16, r16` through an optional writable-memory
  boundary. Address translation stays in the CPU path while writable or
  immutable region policy remains owned by physical memory.
- M2 T2 S3 P24 adds `MOV r/m8, r8` and `MOV r8, r/m8` through the shared
  16-bit addressing and writable-memory boundaries.
- M2 T2 S3 P25 adds AL immediate `OR`, `AND`, and `CMP` with the shared 8-bit
  logic and comparison flag contracts used by ROM polling paths.
- M2 T2 S3 P26 adds `JZ rel8` beside the existing zero-flag branch path.
- M2 T2 S3 P27 adds real-mode near `CALL rel16` and `RET` using SS:SP through
  the project-owned writable-memory boundary.
- M2 T2 S3 P28 adds real-mode 16-bit general-register `PUSH` and `POP` through
  the same stack boundary.
- M2 T2 S3 P29 adds direction-flag control and real-mode `REP STOSW` through
  the project-owned ES:DI writable-memory boundary.
- M2 T2 S3 P30 adds real-mode `REP MOVSW` through DS:SI and ES:DI.
- M2 T2 S3 P31 adds real-mode `INT imm8` delivery through the IVT and SS:SP.
- M2 T2 S3 P32 adds real-mode `IRET` state restoration through SS:SP.
- M2 T2 S3 P33 adds `IN AL, DX` and `OUT DX, AL` through the existing narrow
  port-I/O contract.
- M2 T2 S3 P34 adds real-mode `PUSHA` and `POPA` through SS:SP.
- M2 T2 S3 P35 adds 16-bit register `INC` and `DEC` with their carry-preserving
  flag behavior.
- M2 T2 S3 P36 adds carry control and `JC rel8` control flow.
- M2 T2 S3 P37 adds 16-bit `LEA r16, m` through the shared ModR/M address
  decoder without a memory read.
- M2 T2 S3 P38 adds all 16-bit-address-size accumulator `MOV moffs` forms
  (`A0` through `A3`) through the DS and writable-memory boundaries.
- M2 T2 S3 P39 adds `MOV r/m8, imm8` and `MOV r/m16, imm16` (`C6 /0` and
  `C7 /0`) through the shared ModR/M address and writable-memory boundaries.
- M2 T2 S3 P40 adds `MOV r/m16, Sreg` (`8C`) for real-mode segment-selector
  reads through register or writable-memory destinations.
- M2 T2 S3 P41 adds the observed `ES:`-overridden `C6 /0` and `C7 /0` memory
  forms without widening unsupported segment-prefix behavior.
- M2 T2 S3 P42 adds `LODSB` through DS:SI, including direction-flag controlled
  index advancement.
- M2 T2 S3 P43 adds `OR r8, r/m8` (`0A`) through the shared ModR/M decoder
  with the existing 8-bit logic-flag contract.
- M2 T2 S3 P44 adds the compare form of `83 /7 ib`, sign-extending the byte
  immediate into the shared 16-bit comparison-flag contract.
- M2 T2 S3 P45 adds a focused PCjs DeskPro 386 reset-path regression fixture,
  with controlled port responses, from the reset vector through the `E000:0003`
  option-ROM dispatch.
- M2 T2 S3 P47 adds 8-bit and 16-bit `XCHG r/m, r` through the shared ModR/M
  and writable-memory boundaries without changing EFLAGS.
- M2 T2 S3 P48 adds real-mode `PUSH Sreg` and `POP Sreg` through SS:SP,
  preserving the explicit protected-mode boundary.
- M2 T2 S3 P49 adds `ADD AX, imm16` (`05`) and a shared 16-bit addition-flag
  contract for observed BIOS memory-probe arithmetic.
- M2 T2 S3 P50 adds byte `ADD` and `SUB` ModR/M forms plus `80 /0`, `/5`, and
  `/7` immediate forms through the shared byte arithmetic and memory boundaries.
- M2 T2 S3 P51 adds 16-bit `SHL r/m16, 1` and `SHL r/m16, imm8` (`D1 /4` and
  `C1 /4`) using the PCjs 80386 count-mask and logic-flag behavior.
- M2 T2 S3 P52 adds the observed `ES:`-overridden `MOV r16, r/m16` (`26 8B`)
  through the existing shared ModR/M memory-load path.
- M2 T2 S3 P53 adds `CMP r/m8, r8` (`38 /r`) through the shared ModR/M
  decoder and existing 8-bit comparison-flag contract.
- M2 T2 S3 P54 adds unsigned `DIV r/m16` (`F7 /6`), including explicit divide
  fault objects until later S3 exception delivery owns fault injection.
- M2 T2 S3 P55 adds real-mode `PUSHF`, `POPF`, and `STI` through the shared
  stack and EFLAGS boundaries while leaving protected-mode privilege rules open.
- M2 T2 S3 P56 adds byte `ADC` through `80 /2` and unsigned `MUL r/m16`
  (`F7 /4`) with the PCjs-defined CF/OF result boundary.
- M2 T2 S3 P57 adds logical right shifts for word `D1/C1 /5` and byte `C0 /5`
  forms using the PCjs count-mask and logic-result flag behavior.
- M2 T2 S3 P58 adds a focused regression fixture for the PCjs DeskPro BIOS
  descriptor-initialization prefix through its first initialized descriptor.
- P58 also corrects sequential EIP wrapping in real and virtual-8086 modes;
  protected-mode sequential EIP remains 32-bit.
- M2 T2 S3 P59 adds 16-bit-address-size memory `LGDT` and `LIDT` forms
  (`0F 01 /2,/3`) through the existing descriptor-table state boundary.
- M2 T2 S3 P60 adds register-direct CR0 moves (`0F 20 /0`, `0F 22 /0`) for
  observed protected-mode transition code; CPL and transition side effects
  remain later S3 work.
- M2 T2 S3 P61 adds `OR AX, imm16` (`0D`) through the shared 16-bit logic-flag
  contract for the observed PE-bit setup sequence.
- M2 T2 S3 P62 connects checked GDT code-descriptor loading to 16-bit-offset
  protected-mode far jumps, including the observed memory-pointer form.
- Mechanical adaptation: a narrow byte-reader interface replaces PCjs bus and
  cache objects.
- Intentional behavior changes: none.
- Incomplete behavior: paging hookup, prefetch, general decode, exceptions,
  interrupt wakeup, protected-mode CLI and far jumps, and remaining instruction
  behavior, including non-register LMSW, wider I/O forms, and segment-load
  forms, remain later S3 work. Concrete port routing is active S5 work.

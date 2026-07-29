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
- Mechanical adaptation: a narrow byte-reader interface replaces PCjs bus and
  cache objects.
- Intentional behavior changes: none.
- Incomplete behavior: paging hookup, prefetch, general decode, exceptions,
- Incomplete behavior: paging hookup, prefetch, general decode, port dispatch,
- Incomplete behavior: paging hookup, prefetch, general decode, port dispatch,
- Incomplete behavior: paging hookup, prefetch, general decode, port dispatch,
  exceptions, interrupt wakeup, protected-mode CLI and far jumps, and remaining
  instruction behavior, including non-register LMSW and segment-load forms,
  remain later S3 work.

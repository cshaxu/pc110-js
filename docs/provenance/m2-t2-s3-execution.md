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
- M2 T2 S3 P63 connects `MOV Sreg, r/m16` to checked protected-mode data and
  stack descriptor loading; the DeskPro `0x08` data descriptor is covered.
- M2 T2 S3 P64 adds the observed `ES:`-overridden byte `MOV r/m8, r8` form
  through the shared ModR/M write path and the cached protected ES base.
- M2 T2 S3 P65 adds the observed operand-size-overridden `AND EAX, imm32`
  (`66 25 id`) form and a shared 32-bit logic-flag contract.
- M2 T2 S3 P66 adds an integrated regression for the observed protected-mode
  return sequence through CR0 and its real-mode far jump.
- M2 T2 S3 P67 adds the observed 16-bit `JMP r/m16` (`FF /4`) form used after
  the return-path `LIDT` sequence.
- M2 T2 S3 P68 enables `CLI` and `STI` at protected-mode CPL 0 for the observed
  ROM path while retaining explicit nonzero-CPL fault boundaries.
- M2 T2 S3 P69 adds byte and word register-destination XOR memory forms through
  shared ModR/M, segment, and logic-flag paths.
- M2 T2 S3 P70 adds `80 /4` byte AND forms for the observed ROM immediate
  masking path through the existing byte-memory and logic-flag contracts.
- M2 T2 S3 P71 adds `TEST r/m8, imm8` (`F6 /0 ib`) for the observed DeskPro
  ROM bit tests, retaining the source operand and applying the existing
  byte-width logic-flag contract.
- M2 T2 S3 P72 adds `TEST r/m16, imm16` (`F7 /0 iw`) for the observed DeskPro
  ROM status-word tests, retaining the source operand and applying the
  existing word-width logic-flag contract.
- M2 T2 S3 P73 adds `TEST r/m8, r8` (`84 /r`) for the observed DeskPro ROM
  branch predicates, retaining both source operands and applying the existing
  byte-width logic-flag contract.
- M2 T2 S3 P74 adds `TEST r/m16, r16` (`85 /r`) for the observed DeskPro ROM
  branch predicates, retaining both source operands and applying the existing
  word-width logic-flag contract.
- M2 T2 S3 P75 adds the complete `JO` through `JG` short conditional-jump
  family (`70` through `7F`), using explicit architectural EFLAGS predicates
  and preserving the existing 16-bit real-mode target-width behavior.
- M2 T2 S3 P76 adds `OR r16, r/m16` (`0B /r`) for observed DeskPro ROM
  state tests, using the existing ModR/M source and word-width logic-flag
  contracts without modifying the source operand.
- M2 T2 S3 P77 adds `OR r/m16, imm16` (`81 /1 iw`) for observed DeskPro ROM
  state-word updates, preserving the existing `/7` comparison form and using
  the existing writable-memory and word-width logic-flag contracts.
- M2 T2 S3 P78 adds `OR r/m16, r16` (`09 /r`) for observed DeskPro ROM
  work-area updates, using the existing ModR/M destination and writable-memory
  contracts with word-width logic-flag results.
- M2 T2 S3 P79 adds `OR r/m8, r8` (`08 /r`) for observed DeskPro ROM
  state-byte updates, using the existing ModR/M destination and writable-memory
  contracts with byte-width logic-flag results.
- M2 T2 S3 P80 introduces a shared real-mode IVT delivery path for software
  interrupts and 80386 divide-error faults. `INT` saves its following IP while
  divide errors save the faulting IP, matching the pinned PCjs fault distinction.
- M2 T2 S3 P81 exposes a device-facing external-interrupt service boundary.
  It accepts maskable real-mode interrupts only with IF set, uses the shared IVT
  frame path, saves the current EIP, and resumes a halted CPU.
- M2 T2 S3 P82 adds real-mode `CALL FAR m16:16` (`FF /3`) for observed DeskPro
  ROM function-pointer paths, saving CS:IP through SS:SP and rejecting other
  unimplemented FF forms instead of silently treating them as far jumps.
- M2 T2 S3 P83 adds real-mode `RETF` and `RETF imm16` (`CB` and `CA iw`) for
  observed DeskPro ROM far-call return paths, restoring CS:IP and applying the
  optional caller-stack adjustment through SS:SP.
- M2 T2 S3 P84 adds real-mode `CALL r/m16` (`FF /2`) for observed DeskPro
  CS-overridden function-table calls, saving the prefix-inclusive return IP
  through SS:SP while retaining the current code segment.
- M2 T2 S3 P85 adds `PUSH r/m16` (`FF /6`) for observed DeskPro ROM stack-save
  paths, including default SS selection for BP-based sources and the existing
  SS:SP writable-memory boundary.
- M2 T2 S3 P86 adds the observed ES-overridden `PUSH r/m16` (`26 FF /6`),
  preserving ES as the source segment while keeping stack writes on SS:SP.
- M2 T2 S3 P87 adds `ADD r/m16, r16` and `ADD r16, r/m16` (`01` and `03 /r`)
  for observed DeskPro ROM pointer and work-area arithmetic through shared
  ModR/M memory and 16-bit addition-flag contracts.
- M2 T2 S3 P88 adds `AND r/m16, imm16` (`81 /4 iw`) for observed DeskPro ROM
  status-word masking while retaining the existing `/1` OR and `/7` CMP forms.
- M2 T2 S3 P89 adds `AND r/m16, r16` (`21 /r`) for observed DeskPro ROM
  work-area masking through the existing ModR/M destination, writable-memory,
  and word-width logic-flag contracts.
- M2 T2 S3 P90 adds default-segment `POP r/m16` (`8F /0`) for observed DeskPro
  ROM stack-restoration paths, reading through SS:SP before writing the decoded
  ModR/M destination.
- M2 T2 S3 P91 adds the observed ES-overridden `POP r/m16` (`26 8F /0`),
  preserving SS:SP stack reads while selecting ES for the destination write.
- M2 T2 S3 P92 adds `SUB r16, r/m16` (`2B /r`) for observed DeskPro ROM
  counter and address arithmetic through shared ModR/M source and 16-bit
  subtraction-flag contracts.
- M2 T2 S3 P93 adds `SUB r/m16, imm8` (`83 /5 ib`) for observed DeskPro ROM
  stack and pointer adjustments, sign-extending the immediate through existing
  writable-memory and 16-bit subtraction-flag contracts.
- M2 T2 S3 P94 adds `ADD r/m16, imm8` (`83 /0 ib`) for observed DeskPro ROM
  stack and pointer adjustments, sign-extending the immediate through existing
  writable-memory and 16-bit addition-flag contracts.
- M2 T2 S3 P95 adds accumulator immediate subtraction (`SUB AL, imm8` and
  `SUB AX, imm16`) for observed DeskPro ROM character and counter adjustments,
  using the existing subtraction-flag contracts.
- M2 T2 S3 P96 adds `AND AX, imm16` for observed DeskPro ROM state masks,
  keeping the 16-bit accumulator form aligned with the existing logic-flag
  contract and separate 32-bit operand-size-override behavior.
- M2 T2 S3 P97 adds `ADD AL, imm8` for observed DeskPro ROM character and
  byte-counter arithmetic, using the existing 8-bit addition-flag contract.
- M2 T2 S3 P98 adds `CMP AX, imm16` for observed DeskPro ROM decision paths,
  retaining the accumulator while using the existing 16-bit subtraction-flag
  contract.
- M2 T2 S3 P99 adds `ADC AX, imm16` for the observed DeskPro ROM arithmetic
  path and extends the shared 16-bit addition-flag contract with an explicit
  carry input, matching the PCjs `fnADCw` behavior.
- M2 T2 S3 P100 adds `XOR AL, imm8` for observed DeskPro ROM byte-state
  manipulation, using the existing 8-bit logic-flag contract.
- M2 T2 S3 P101 adds `AND r8, r/m8` (`22 /r`) for observed DeskPro ROM
  byte-state masks, using the shared ModR/M memory-read and 8-bit logic-flag
  contracts.
- M2 T2 S3 P102 adds the observed `ES:`-overridden `AND r8, r/m8` form
  (`26 22 /r`) without widening unsupported segment-prefix handling.
- M2 T2 S3 P103 adds `CMP r8, r/m8` and `CMP r16, r/m16` (`3A` and `3B /r`)
  for observed DeskPro ROM decision paths, using existing ModR/M source and
  subtraction-flag contracts without writing either source operand.
- M2 T2 S3 P104 refactors the `CMP r, r/m` read path behind a narrow shared
  helper and adds observed CS-overridden byte and word forms (`2E 3A/3B /r`)
  without widening unsupported prefix behavior.
- M2 T2 S3 P105 adds `AND r/m8, r8` (`20 /r`) for observed DeskPro ROM
  byte-state updates, using the shared ModR/M writable-memory and 8-bit
  logic-flag contracts.
- M2 T2 S3 P106 adds `XOR r/m8, r8` (`30 /r`) for observed DeskPro ROM
  byte-state updates, using the shared ModR/M writable-memory and 8-bit
  logic-flag contracts.
- M2 T2 S3 P107 adds the observed `ES:`-overridden `XOR r/m8, r8` form
  (`26 30 /r`) without widening unsupported segment-prefix handling.
- M2 T2 S3 P108 adds `NOT` and `NEG` for 8-bit and 16-bit F6/F7 group operands
  used by the DeskPro ROM. `NOT` preserves EFLAGS; `NEG` reuses the established
  subtraction-flag contracts for `0 - operand`.
- M2 T2 S3 P109 adds the observed `SBB r/m8, imm8` Group 1 form (`80 /3 ib`) and a
  borrow-aware extension of the existing 8-bit subtraction-flag contract,
  matching PCjs `fnSBB` arithmetic behavior.
- M2 T2 S3 P110 adds the observed `SBB r16, r/m16` form (`1B /r`) and the
  corresponding 16-bit borrow-aware subtraction-flag contract.
- M2 T2 S3 P111 adds observed accumulator-immediate SBB forms (`1C ib` and
  `1D iw`) for DeskPro ROM arithmetic, using the established borrow-aware
  subtraction-flag contracts.
- M2 T2 S3 P112 adds observed register-destination ModR/M ADC forms (`12` and
  `13 /r`) for DeskPro ROM multiword arithmetic, using the established carry-in
  8-bit and 16-bit addition-flag contracts.
- M2 T2 S3 P113 adds observed accumulator and Group 1 immediate ADC forms
  (`14 ib` and `83 /2 ib`) for DeskPro ROM multiword arithmetic.
- M2 T2 S3 P114 adds observed 8-bit F6-group unsigned `MUL` and `DIV` forms,
  using AL/AX implicit operands, the established CF/OF multiply contract, and
  existing real-mode divide-error delivery.
- M2 T2 S3 P115 adds the observed accumulator-word `TEST` form (`A9 iw`),
  using the existing 16-bit logical-flag contract without modifying AX.
- M2 T2 S3 P116 adds observed `CBW` (`98`) sign extension for ROM conversion
  paths, preserving the existing flags and upper EAX bits.
- M2 T2 S3 P117 adds observed direct-register `SAR r/m8, 1` (`D0 /7`) for ROM
  signed-byte conversion paths, with the required arithmetic shift flags.
- M2 T2 S3 P118 adds observed `REP MOVSB` and `REP STOSB` forms, extending the
  existing word-string execution path with byte width and direction handling.
- M2 T2 S3 P119 adds observed unprefixed `MOVSB`, `MOVSW`, `STOSB`, and `STOSW`
  forms as single iterations of the established string-operation semantics.
- M2 T2 S3 P120 adds the observed CS-source `MOVSW`, `REP MOVSW`, and `LODSW`
  forms without treating the narrow support as a general prefix decoder.
- M2 T2 S3 P121 performed a bounded real-ROM trace experiment against the
  selected read-only DeskPro ROM. It classified a pre-execution sparse-memory
  mapping prerequisite: contiguous RAM currently occupies the required system
  ROM window. The result is evidence for planned S4 memory-region work, not a
  CPU behavior claim or an implementation change.
- M2 T2 S3 P122 adds the observed CS-overridden byte accumulator moffs forms
  (`2E A0` and `2E A2`) reached by the bounded DeskPro ROM trace at `F000:BAB0`.
- M2 T2 S3 P123 adds the observed direct-register `INC r/m8` form (`FE /0`)
  reached at `F000:9BF1`, preserving CF while updating 8-bit increment flags.
- M2 T2 S3 P124 repeated the bounded DeskPro ROM trace with only a controlled
  keyboard-controller status response. The CPU path reached an `ES:B800`
  `REP STOSW` write, classifying missing VGA memory as the next planned T5
  hardware boundary rather than a CPU opcode failure.
- M2 T2 S3 P125 adds the observed CS-overridden byte ModR/M load (`2E 8A /r`)
  reached by the bounded CPU-only trace at `F000:C7FF`.
- M2 T2 S3 P126 adds observed byte `DEC r/m8` forms (`FE /1`) for register and
  BP-default-SS memory operands, preserving CF through the 8-bit decrement
  flag contract.
- M2 T2 S3 P127 adds observed direct-register single-bit `RCL` and `RCR`
  forms (`D0 /2,/3`), preserving non-rotate flags and matching PCjs CF/OF
  updates.
- M2 T2 S3 P128 adds observed direct-register `ROL r/m8, CL` and `ROL r/m16,
  CL` forms (`D2/D3 /0`), using the PCjs 80386 count mask and rotate flags.
- M2 T2 S3 P129 adds observed CMPS and SCAS byte/word forms, including `REPE`
  and `REPNE` termination through DS:SI, ES:DI, CX, direction, and comparison
  flag contracts.
- M2 T2 S3 P130 adds observed accumulator-register XCHG short forms (`91`
  through `97`), preserving 16-bit register behavior and EFLAGS.
- M2 T2 S3 P131 adds observed `DAA` and `DAS` (`27` and `2F`). Behavior is
  derived from PCjs `x86ops.js` and `cpux86.js`: incoming AF and CF select the
  decimal corrections, result flags update PF/ZF/SF, CF/AF are explicit, and
  OF clears. Tests cover dual correction, low-digit subtraction, and CF input.
- M2 T2 S3 P132 adds observed `AAD imm8` (`D5 ib`). The selected DeskPro ROM
  contains `D5 0A` at `0x4230` and `0x4E60`. PCjs `opAAD` is the behavior
  authority: `AL + AH * imm8` becomes AL, AH clears, and byte arithmetic flags
  derive from that addition. No NXVM behavior or guest-service code was used.
- M2 T2 S3 P133 corrects existing immediate-count `C0/C1` shift helpers. PCjs
  `fnSHRb` and `fnSHRw` leave operands and flags unchanged when the normalized
  count is zero. Focused byte and word regressions preserve EFLAGS while still
  advancing EIP past the decoded instruction.
- M2 T2 S3 P134 adds `LAHF` (`9F`) from PCjs `opLAHF`: copy the current low
  EFLAGS byte to AH while preserving EFLAGS and all other register bits.
- M2 T2 S3 P135 adds `CWD` (`99`) from PCjs `opCWD` 16-bit behavior: sign-
  extend AX into DX without changing EFLAGS or AX.
- M2 T2 S3 P136 adds `WAIT/FWAIT` (`9B`) from PCjs `opWAIT`'s no-FPU path.
  The selected DeskPro ROM contains `9B` in its coprocessor state path. Until
  M2 models an FPU device, the instruction advances EIP without changing state.
- M2 T2 S3 P137 adds `AAM imm8` (`D4 ib`) from PCjs `opAAM`: divide AL into
  AH quotient and AL remainder, update the PCjs logical result flags, and use
  the existing real-mode divide-error delivery path for a zero divisor.
- M2 T2 S3 P138 adds `AAA` and `AAS` (`37` and `3F`) from PCjs `opAAA` and
  `opAAS`: adjust packed AX low digits, update only CF/AF, and preserve other
  flags. AAA includes the PCjs 80286+ carry propagation into AH.
- M2 T2 S3 P139 adds `XLAT` (`D7`) from PCjs `opXLAT` through the project-owned
  DS byte-read boundary. The current 16-bit execution path wraps `BX + AL`
  before real-mode address translation and preserves EFLAGS.
- M2 T2 S3 P140 adds `PUSH imm16` and `PUSH imm8` (`68` and `6A`) through the
  existing SS:SP word-stack boundary. The byte immediate is sign-extended to
  match PCjs 16-bit operand behavior.
- M2 T2 S3 P141 adds `LEAVE` (`C9`) from PCjs stack-frame behavior: assign BP
  to SP, then restore BP through the project-owned SS:SP word-stack boundary.
- M2 T2 S3 P142 adds real-mode immediate far CALL (`9A`) from PCjs `opCALLF`:
  push CS and return IP in RETF-compatible order, then load the target CS:IP.
  Protected-mode far calls remain explicitly unsupported pending privilege work.
- M2 T2 S3 P143 adds `LOOPNE` and `LOOPE` (`E0` and `E1`) from PCjs loop
  behavior: decrement CX, then branch only when the count remains nonzero and
  ZF satisfies the opcode condition. EFLAGS remain unchanged.
- M2 T2 S3 P144 adds real-mode `INTO` (`CE`) from PCjs overflow-interrupt
  behavior: advance normally when OF is clear, otherwise deliver vector 4
  through the existing real-mode IVT path. Protected-mode delivery remains
  explicitly unsupported.
- M2 T2 S3 P145 adds 16-bit `MOVZX/MOVSX` (`0F B6/B7/BE/BF`) from PCjs
  extension-opcode behavior through existing ModR/M register and memory reads.
- M2 T2 S3 P146 adds 16-bit `BSF/BSR` (`0F BC/BD`) from PCjs bit-scan
  behavior: nonzero sources produce the lowest or highest set-bit index, while
  zero sources preserve the destination and set ZF.
- M2 T2 S3 P147 adds `CMC` (`F5`) from PCjs `opCMC`: complement CF while
  preserving every other EFLAGS bit.
- M2 T2 S3 P148 adds real-mode `INT3` (`CC`) through the existing vector-3
  IVT path, using the next instruction as the stacked return address.
- M2 T2 S3 P149 adds 16-bit `ENTER imm16, imm8` (`C8`) from PCjs `opENTER`:
  preserve BP, copy nested SS frame links, push the frame pointer, then allocate
  local bytes below the new frame.
- M2 T2 S3 P150 adds real-mode memory `BOUND` (`62`) from PCjs `fnBOUND`:
  signed index/lower/upper comparison advances on success and delivers vector 5
  with the faulting instruction pointer on range failure.
- Mechanical adaptation: a narrow byte-reader interface replaces PCjs bus and
  cache objects.
- Intentional behavior changes: none.
- Incomplete behavior: paging hookup, prefetch, general decode, exceptions,
  interrupt wakeup, protected-mode CLI and far jumps, and remaining instruction
  behavior, including non-register LMSW, wider I/O forms, and segment-load
  forms, remain later S3 work. Concrete port routing is active S5 work.

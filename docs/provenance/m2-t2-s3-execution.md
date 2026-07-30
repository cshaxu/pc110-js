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
- M2 T2 S3 P151 adds `IMUL r16,r/m16` (`0F AF`) from PCjs `fnIMULrw`:
  signed 16-bit multiplication writes the low word and sets CF/OF only when
  the mathematical product cannot fit in a signed 16-bit result.
- M2 T2 S3 P152 adds `BT`, `BTS`, `BTR`, and `BTC` (`0F A3/AB/B3/BB`) from
  PCjs `fnBTMem`, `fnBTSMem`, `fnBTRMem`, and `fnBTCMem`: they set CF from
  the original selected bit, preserve all other flags, and apply full signed
  register bit indexes when the destination is memory.
- M2 T2 S3 P153 adds immediate Group 8 `BT`, `BTS`, `BTR`, and `BTC`
  (`0F BA /4-/7 ib`) from PCjs `aOpGrp8` and the corresponding `fnBT` family:
  immediate indexes use the low four bits of a 16-bit operand and do not
  extend a memory operand into a neighboring word.
- M2 T2 S3 P154 adds the full `SETcc r/m8` family (`0F 90-9F`) from PCjs
  `helpSETcc` and the `fnSET*` functions. The project-native condition mapping
  supplies each result; register and memory writes leave EFLAGS unchanged.
- M2 T2 S3 P155 adds the 16-bit near `Jcc` family (`0F 80-8F cw`) from PCjs
  `opJOw` through `opJNLEw`: all conditions use the project-native mapping,
  and the unsigned displacement sum is truncated through the 16-bit EIP write.
- M2 T2 S3 P156 adds `LSS`, `LFS`, and `LGS m16:16` (`0F B2/B4/B5`) from PCjs
  `fnLSS`, `fnLFS`, and `fnLGS`: a memory-only far pointer supplies the
  destination word and selector through the existing mode-aware segment loader.
- M2 T2 S3 P157 adds 16-bit `PUSH/POP FS/GS` (`0F A0/A1/A8/A9`) from PCjs
  `opPUSHFS`, `opPOPFS`, `opPUSHGS`, and `opPOPGS`: selectors traverse the
  shared SS:SP boundary and POP restores the segment through the existing
  mode-aware loader.
- M2 T2 S3 P158 adds `SMSW r/m16` (`0F 01 /4`) from PCjs `fnSMSW`: the low
  16 bits of the existing CR0 state write through the project-native ModR/M
  register or memory boundary without changing CPU flags or control state.
- M2 T2 S3 P159 adds real-mode `UD2` (`0F 0B`) from PCjs `opInvalid`: it
  delivers IVT vector 6 through the existing real-mode fault boundary and
  stacks the original instruction pointer rather than the following address.
- M2 T2 S3 P160 adds 16-bit `SHLD/SHRD` immediate and CL forms
  (`0F A4/A5/AC/AD`) from PCjs `helpSHLDw` and `helpSHRDw`: counts are masked,
  cross-word behavior follows the PCjs helper, and defined logic flags are
  updated through a project-native state boundary.
- M2 T2 S3 P161 adds `ADC r/m16,r16` (`11 /r`) from PCjs `opADCmw` and
  `fnADCw`: register and memory destinations use the current carry flag and
  the existing 16-bit addition-flag contract.
- M2 T2 S3 P162 adds `SBB r/m16,r16` (`19 /r`) from PCjs `opSBBmw` and
  `fnSBBw`: register and memory destinations consume CF as a borrow through
  the existing 16-bit subtraction-flag contract.
- M2 T2 S3 P163 completes byte `ADC/SBB` ModR/M directions (`10`, `12`, `18`,
  and `1A`) from PCjs `opADCmb`, `opADCrb`, `opSBBmb`, and `opSBBrb`: all use
  the project byte ALU boundary to consume CF. PCjs `setArithResult` confirms
  that carry-inclusive addition flags use the original source operand.
- M2 T2 S3 P164 adds `SUB r/m8,r8` and `SUB r/m16,r16` (`28` and `29`) from
  PCjs `opSUBmb` and `opSUBmw`: register and memory destinations use the
  project ModR/M arithmetic boundaries and existing subtraction flags.
- M2 T2 S3 P165 adds `AND r16,r/m16` (`23 /r`) from PCjs `opANDrw`: register
  destinations accept register or memory sources through the project 16-bit
  logic-flag boundary.
- M2 T2 S3 P166 adds `XOR r/m16,r16` (`31 /r`) and `XOR AX,imm16` (`35 iw`)
  from PCjs `opXORmw` and `opXORAX`: register, memory, and accumulator
  destinations use the project writable-memory and 16-bit logic-flag boundaries.
- M2 T2 S3 P167 adds `CMP r/m16,r16` (`39 /r`) from PCjs `opCMPmw`: register
  and memory operands use the project 16-bit comparison-flag boundary without
  writing either operand.
- M2 T2 S3 P168 expands the existing operand-size override from PCjs `opADDAX`,
  `opORAX`, `opADCAX`, `opSBBAX`, `opANDAX`, `opSUBAX`, `opXORAX`, and
  `opCMPAX`: 32-bit accumulator immediates use project-native arithmetic and
  logic flag boundaries. General 32-bit ModR/M and address-size decoding remain
  later S3 work.
- M2 T2 S3 P169 adds operand-size-overridden `MOV r32,imm32` (`66 B8+rd id`)
  from PCjs `opMOVri`: all eight project general-register slots receive the
  complete immediate value without altering flags.
- M2 T2 S3 P170 adds operand-size-overridden `MOV r/m32,r32` and
  `MOV r32,r/m32` (`66 89/8B`) from PCjs `opMOVmr` and `opMOVrm`: 32-bit
  values use project segmented dword helpers while retaining default 16-bit
  ModR/M address calculation; address-size override remains later S3 work.
- M2 T2 S3 P171 adds a project-native 32-bit ModR/M/SIB address decoder from
  the PCjs selected address-size behavior: it records SIB and displacement
  lengths separately and applies the 80386 default SS selection for EBP/ESP
  bases. Execution integration remains later S3 work.
- M2 T2 S3 P172 connects `67` plus `66 89/8B` to the project 32-bit address
  decoder, from PCjs's prefix-selected address and operand-size behavior. The
  protected-mode regression covers both prefix orders and dword accesses above
  `0xffff`; real-mode 32-bit offset behavior remains unimplemented pending a
  focused PCjs comparison.
- M2 T2 S3 P173 adds project-native IDT interrupt/trap gate decoding from the
  PCjs-selected 80386 protected-mode descriptor model. It validates IDT bounds
  and accepted gate types before extracting the gate selector, offset, DPL,
  present bit, size, and interrupt-versus-trap behavior; gate delivery remains
  later S3 work.
- M2 T2 S3 P174 adds the segment-cache `D/B` attribute from PCjs's selected
  protected-mode descriptor state. Project segment loads now retain descriptor
  default32 state for later gate, stack, and control-transfer width selection.
- M2 T2 S3 P175 adds same-CPL 32-bit protected-mode external interrupt delivery
  from the PCjs selected IDT gate model. It validates and loads the IDT gate,
  creates the EFLAGS/CS/EIP ESP frame, clears IF and TF, and loads the target
  code descriptor. Privilege stack switching, 16-bit gates, trap gates, and
  virtual-8086 delivery remain later S3 work.
- M2 T2 S3 P176 extends the same protected-mode gate-delivery path to `INT`,
  `INT3`, and `INTO` using PCjs-selected software interrupt behavior. Software
  requests enforce gate DPL before creating the frame; external interrupts
  remain independent of gate DPL. Privilege stack switching and fault delivery
  remain later S3 work.
- M2 T2 S3 P177 adds same-CPL 32-bit protected-mode `IRET` restoration from the
  PCjs selected frame model: it pops EIP, CS, and EFLAGS through SS:ESP then
  validates and reloads the target code descriptor. Privilege returns, 16-bit
  frames, and virtual-8086 return remain later S3 work.
- M2 T2 S3 P178 adds same-CPL 32-bit protected-mode far `CALL` and `RETF` from
  the PCjs selected far-transfer model. It validates the target descriptor
  before creating the EIP/CS frame and retains explicit boundaries for call
  gates, privilege stack switching, 16-bit frames, and virtual-8086 behavior.
- M2 T2 S3 P179 routes no-error-code CPU faults through the existing real-mode
  IVT or protected-mode IDT gate path according to PCjs fault semantics. UD2
  and supported divide errors now preserve their faulting EIP; fault error-code
  frames, privilege stack switching, and virtual-8086 delivery remain later S3
  work.
- M2 T2 S3 P180 extends that no-error-code fault boundary to the existing
  16-bit `BOUND` implementation. Its established operand decoding remains
  unchanged; a limit violation now reaches protected-mode vector five through
  the selected PCjs IDT model. The 32-bit `BOUND` operand form remains later S3
  work.
- M2 T2 S3 P181 adds same-CPL 16-bit protected-mode interrupt/trap gate
  delivery and `IRET` restoration from the PCjs-selected frame-width model.
  The frame width must match the current SS default size; mixed-size stacks,
  privilege transitions, and virtual-8086 behavior remain later S3 work.
- M2 T2 S3 P182 applies the decoded IDT gate type during protected-mode entry:
  interrupt gates clear IF and TF, while trap gates preserve IF and clear TF.
  The saved EFLAGS frame remains the pre-entry state, matching the selected
  PCjs interrupt model.
- M2 T2 S3 P183 adds the PCjs-selected operand-size-overridden 32-bit `BOUND`
  form. It reads signed lower and upper dword limits through the established
  16-bit effective-address path, then uses the existing vector-five fault
  delivery. Address-size-overridden `BOUND` remains later S3 work.
- M2 T2 S3 P184 connects the 32-bit `BOUND` form to the existing 32-bit
  ModR/M/SIB address decoder for both accepted prefix orders. It retains the
  same signed dword limits and vector-five fault contract as P183.
- M2 T2 S3 P185 adds operand-size-overridden `CDQ` (`66 99`) from PCjs
  `opCWD`: it sign-extends EAX into EDX without changing flags.
- M2 T2 S3 P186 adds operand-size-overridden `CWDE` (`66 98`) from PCjs
  `opCBW`: it sign-extends AX into EAX without changing flags.
- M2 T2 S3 P187 adds operand-size-overridden near `CALL` and `RET` (`66 E8`
  and `66 C3`) from PCjs `opCALL` and `opRET`. The implementation uses the
  existing 32-bit protected-mode SS:ESP stack contract; 16-bit stack behavior
  remains later S3 work.
- M2 T2 S3 P188 adds operand-size-overridden near `RET imm16` (`66 C2 iw`)
  from PCjs `opRETn`: after restoring EIP from the same 32-bit frame, it adds
  the unsigned immediate cleanup count to ESP.
- M2 T2 S3 P189 adds operand-size-overridden `PUSHAD` and `POPAD` (`66 60`
  and `66 61`) from PCjs `opPUSHA` and `opPOPA`. It snapshots the original ESP
  for the push frame and deliberately skips that saved slot on restoration.
- M2 T2 S3 P190 adds operand-size-overridden general-register `PUSH` and
  `POP` (`66 50-5F`) from the PCjs register-stack opcode family. `PUSH ESP`
  saves the pre-decrement value and `POP ESP` retains the popped value.
- M2 T2 S3 P191 adds operand-size-overridden general-register `INC` and `DEC`
  (`66 40-4F`) from PCjs's register arithmetic family. The 32-bit flag helpers
  update OF, AF, SF, ZF, and PF while preserving CF.
- M2 T2 S3 P192 adds operand-size-overridden near `Jcc` (`66 0F 80-8F cd`)
  from PCjs's 80386 conditional-jump family. It reuses the project condition
  predicates and applies a signed dword displacement to 32-bit EIP.
- M2 T2 S3 P193 adds operand-size-overridden near `JMP` (`66 E9 cd`) from PCjs
  `opJMP`, applying a signed dword displacement to the 32-bit post-instruction
  EIP.
- M2 T2 S3 P194 adds operand-size-overridden ModR/M ADD and SUB directions
  (`66 01/03/29/2B`) as a project-native dword ALU foundation. It shares the
  existing 16-bit and 32-bit address decoders and dword segmented memory path.
- M2 T2 S3 P195 extends that project-native dword ALU path with ADC and SBB
  directions (`66 11/13/19/1B`), preserving the incoming carry as an explicit
  arithmetic operand and using the established 32-bit flag contracts. The
  regression covers register and memory destinations through both address sizes.
- M2 T2 S3 P196 extends the same path with PCjs-selected OR, AND, XOR, and CMP
  directions (`66 09/0B/21/23/31/33/39/3B`). Logical forms use the project
  dword logic-flag contract; CMP retains both operands and updates comparison
  flags only.
- M2 T2 S3 P197 adds PCjs-selected `TEST r/m32,r32` (`66 85 /r`) to the same
  operand-size path. It computes dword logic flags without writing either
  operand, using both the 16-bit and 32-bit effective-address decoders.
- M2 T2 S3 P198 adds PCjs-selected `TEST r/m32,imm32` (`66 F7 /0 id`) with
  the same no-writeback contract. It accepts default and address-size-overridden
  effective addresses while consuming the full dword immediate.
- M2 T2 S3 P199 adds PCjs-selected `MOV r/m32,imm32` (`66 C7 /0 id`) through
  the project-native dword memory path. The register and address-size-overridden
  memory forms preserve the established ModR/M and segmented-access contracts.
- M2 T2 S3 P200 adds the complete PCjs-selected dword Group 1 immediate family:
  `66 81 /0-/7 id` and `66 83 /0-/7 ib`. The byte-immediate form is sign-extended
  to dword width, while CMP retains the destination and all other operations
  use the shared dword writeback and flag contract.
- M2 T2 S3 P201 adds PCjs-selected operand-size-overridden immediate stack
  pushes: `66 68 id` and `66 6A ib`. The byte form is sign-extended and both
  forms reuse the existing protected-mode SS:ESP dword stack contract.
- M2 T2 S3 P202 adds PCjs-selected operand-size-overridden `LEA r32,m`
  (`66 8D /r`). It writes the decoded effective offset without dereferencing
  memory and accepts the established 16-bit and 32-bit address decoders.
- M2 T2 S3 P203 adds project-native 80386 task-register state: selector,
  cached base and limit, and TSS size attribute. This is a state-model
  prerequisite for later LTR, task, and privilege-stack behavior; it does not
  implement those instructions or behaviors yet.
- M2 T2 S3 P204 adds PCjs-selected protected-mode `LTR` and `STR` from Group 6
  (`0F 00 /3` and `/1`). LTR validates a present available GDT TSS descriptor,
  caches its task-register state, and marks the descriptor busy. Task switches
  and TSS-based privilege-stack entry remain later S3 work.
- M2 T2 S3 P205 adds 32-bit TSS-based entry for a protected-mode interrupt or
  trap gate targeting a more privileged nonconforming code segment. It reads
  `ESP0` and `SS0`, validates the target stack descriptor, switches stacks, and
  creates the documented old-SS/old-ESP/EFLAGS/CS/EIP frame. Privilege-return
  IRET, 16-bit frames, conforming targets, and virtual-8086 entry remain later
  S3 work.
- M2 T2 S3 P206 adds 32-bit protected-mode IRET from a higher-privilege frame
  back to a lower-privilege nonconforming code segment. It validates and loads
  the returned code and stack descriptors, restores EIP/EFLAGS/SS/ESP, and
  completes the frame contract established by P205. 16-bit, conforming, and
  virtual-8086 returns remain later S3 work.
- M2 T2 S3 P207 adds an integrated regression for the P205/P206 contract: an
  external interrupt enters a higher-privilege handler through the TSS stack,
  then executes IRET and restores the original lower-privilege code, stack,
  instruction pointer, and flags.
- M2 T2 S3 P208 adds PCjs-selected operand-size-overridden MOVZX and MOVSX
  forms (`66 0F B6/B7/BE/BF /r`). Byte and word sources use the existing 16-bit
  ModR/M decoder and extend into the full destination register without flags.
- M2 T2 S3 P209 connects those dword MOVZX and MOVSX forms to the existing
  32-bit ModR/M/SIB address decoder for `66 67 0F B6/B7/BE/BF /r` memory
  sources. Default-address behavior remains covered by P208.
- M2 T2 S3 P210 adds PCjs-selected operand-size-overridden `BSF` and `BSR`
  (`66 0F BC/BD /r`). Nonzero dword sources select the lowest or highest set
  bit; zero sources preserve the destination and set ZF.
- M2 T2 S3 P211 adds the 80386 operand-size-overridden `LGDT` and `LIDT`
  forms (`66 0F 01 /2,/3`). They load the six-byte pseudo-descriptor's 16-bit
  limit and full 32-bit base; the existing default-operand-size forms retain
  their architecturally required 24-bit base truncation.
- M2 T2 S3 P212 adds `SGDT` and `SIDT` (`0F 01 /0,/1`) for both implemented
  operand-size dispatch paths. Each stores the 16-bit limit and all four
  little-endian base bytes, matching the observed 80386 behavior described by
  PCjs rather than assuming the load instruction's truncation rule applies.
- M2 T2 S3 P213 extends `MOV r32, CRn` and `MOV CRn, r32` (`0F 20/22`) from
  CR0-only dispatch to CR0, CR2, and CR3. It preserves the selected 80386
  behavior that ignores the ModR/M `MOD` bits, and normalizes CR3 to its
  page-directory base alignment. Full nonzero-CPL `#GP(0)` delivery remains
  coupled to the later error-code exception path.
- M2 T2 S3 P215 extends `POP ES`, `POP SS`, and `POP DS` (`07/17/1F`) to the
  existing protected-mode segment loader after reading the selector through
  the prior stack segment. The implemented 16-bit forms therefore share the
  same descriptor validation as `MOV Sreg, r/m16`.
- M2 T2 S3 P216 adds CPL-zero 16-bit protected-mode `POPF` (`9D`). It restores
  the popped low EFLAGS word while preserving the current high word, matching
  the selected 80386 `POPF` behavior.
- M2 T2 S3 P217 extends `LMSW r/m16` (`0F 01 /6`) from its observed register
  form to the generic ModR/M memory form while preserving the existing CR0
  machine-status normalization.
- M2 T2 S3 P218 adds `CLTS` (`0F 06`) at CPL zero, clearing only CR0.TS.
- M2 T2 S3 P219 adds operand-size-overridden `JMP FAR ptr16:32` (`66 EA`) for
  the existing protected-mode code-segment loader.
- M2 T2 S3 P220 adds same-privilege protected-mode `CALL FAR ptr16:16` (`9A`)
  through the existing descriptor loader and 16-bit stack frame path.
- M2 T2 S3 P221 adds same-privilege protected-mode `CALL FAR m16:16` (`FF /3`)
  through the existing descriptor loader and 16-bit stack frame path.
- M2 T2 S3 P222 adds same-privilege protected-mode `RETF` (`CB` and `CA iw`)
  through the existing descriptor loader and 16-bit stack frame path.
- M2 T2 S3 P223 adds same-privilege protected-mode `CALL FAR m16:32`
  (`66 FF /3`) through the existing descriptor loader and 32-bit stack frame path.
- M2 T2 S3 P224 adds protected-mode `JMP FAR m16:32` (`66 FF /5`) through the
  existing descriptor loader and 32-bit instruction-pointer path.
- M2 T2 S3 P225 adds CPL-zero protected-mode `PUSHFD` and `POPFD` (`66 9C/9D`)
  through the existing 32-bit stack path, preserving VM and RF across POPFD.
- M2 T2 S3 P226 runs the local read-only selected DeskPro ROM through project-owned
  physical memory and CPU stepping. It supplies only deterministic zero-valued port reads
  for classification and does not claim device emulation or a firmware boot result.
- M2 T2 S3 P227 adds 32-bit `IMUL r32,r/m32,imm32` and `IMUL r32,r/m32,imm8`
  (`66 69` and `66 6B`) using exact signed-product overflow classification.
- M2 T2 S3 P228 adds 32-bit `IMUL r32,r/m32` (`66 0F AF`) using the same exact
  signed-product overflow classification across both existing address sizes.
- M2 T2 S3 P229 adds single-operand 32-bit `IMUL r/m32` (`66 F7 /5`), writing
  the complete product to EDX:EAX and classifying 32-bit signed overflow.
- M2 T2 S3 P230 completes the selected operand-size-overridden dword Group 3
  arithmetic forms: `NOT`, `NEG`, `MUL`, `IMUL`, `DIV`, and `IDIV`
  (`66 F7 /2-/7`). The shared execution path accepts both existing effective
  address sizes, writes implicit EDX:EAX results, and routes zero-divisor or
  quotient-overflow cases through the existing divide-error delivery boundary.
- M2 T2 S3 P231 adds the signed byte and word Group 3 forms: `F6 /5,/7` use
  AX as the implicit byte-product or dividend register, while `F7 /5,/7` use
  DX:AX for word products and dividends. Exact signed arithmetic preserves the
  defined multiply overflow and divide-error range contracts.
- M2 T2 S3 P232 extends the protected-mode delivery boundary with an optional
  error code and routes nonzero-CPL `CLI` and `STI` through `#GP(0)`. The error
  code is pushed after the return frame, preserving all existing no-error-code
  interrupt and fault frames.
- M2 T2 S3 P233 uses that boundary for nonzero-CPL `CLTS` and control-register
  transfer attempts. Both route to `#GP(0)` before changing architectural state.
- M2 T2 S3 P234 adds default-segment `LODSW` (`AD`), reading DS:SI into AX and
  advancing or retreating SI by one word according to the direction flag.
- M2 T2 S3 P235 routes nonzero-CPL `POPF` and `POPFD` to `#GP(0)` before either
  operation reads the stack, preserving the pre-fault stack for the error frame.
- M2 T2 S3 P236 routes nonzero-CPL `LTR` to `#GP(0)` before it reads its selector
  descriptor or modifies task-register state.
- M2 T2 S3 P237 routes nonzero-CPL `LGDT`, `LIDT`, and `LMSW` through `#GP(0)`
  before operand access or modification of descriptor-table and machine-status state.
- M2 T2 S3 P238 records the owner-authorized execution-size correction. PCjs
  uses per-instruction data and address sizes selected from the CS hidden cache
  and prefixes; the project will replace prefix-special-case dispatch with a
  project-native context while retaining PCjs as behavior authority.
- M2 T2 S3 P239 introduces project-native context parsing only. Its repeated
  prefix behavior follows the owner-approved selection rule; no PCjs or NXVM
  source was copied, and no guest-visible execution behavior changed.
- M2 T2 S3 P240 migrates only immediate-register MOV and register push/pop.
  The selected operand size now controls data width while the SS hidden-cache
  default controls stack addressing. PCjs remains the behavior authority.
- M2 T2 S3 P241 applies the same context to `89` and `8B`: data width follows
  the selected operand size and ModR/M decoding follows the selected address
  size. It is original TypeScript with no copied PCjs or NXVM source.
- M2 T2 S3 P242 migrates the non-repeated default-segment LODS paths. The
  context selects LODSW versus LODSD data width and SI versus ESI indexing;
  PCjs remains the behavioral authority for later prefix and repeat work.
- M2 T2 S3 P243 migrates non-repeated default-segment MOVS and STOS. Their
  data width and source or destination index width are selected by the shared
  context; repeat and segment-override behavior remains deliberately separate.
- M2 T2 S3 P244 migrates non-repeated default-segment CMPS and SCAS. Context
  now selects comparison width and SI/ESI/DI/EDI updates; REP/REPNE remains a
  distinct future migration because it adds count and termination semantics.
- M2 T2 S3 P245 migrates repeat comparison termination. Context now selects
  CX or ECX, data width, and source or destination indexes while F3 and F2
  select zero or nonzero continuation without copying PCjs or NXVM source.
- M2 T2 S3 P246 migrates F3 repeat transfer. Context now selects CX or ECX,
  transfer width, and source or destination indexes for MOVS and STOS.
- M2 T2 S3 P247 migrates accumulator-immediate ALU forms so CS defaults and 66
  select word or dword operands through one project-native path.
- M2 T2 S3 P248 migrates register INC and DEC so CS defaults and 66 select
  word or dword register width through the shared execution context.
- M2 T2 S3 P249 migrates accumulator sign-extension forms so CS defaults and
  66 select CBW/CWDE and CWD/CDQ behavior through the shared context.
- M2 T2 S3 P250 migrates immediate PUSH forms so CS defaults select word or
  dword data and SS defaults independently select stack addressing.
- M2 T2 S3 P251 migrates PUSHA and POPA so CS defaults select word or dword
  register frames and SS defaults independently select stack addressing.
- M2 T2 S3 P252 migrates near relative JMP so CS defaults and 66 select the
  displacement length and target EIP width through the shared context.
- M2 T2 S3 P253 migrates near CALL and RET so CS defaults select relative and
  return widths while SS defaults independently select stack addressing.
- M2 T2 S3 P254 migrates `0F 80..8F` so CS defaults and 66 select the signed
  displacement length and IP/EIP target through the shared context.
- M2 T2 S3 P255 migrates LEA so CS defaults and prefixes select both ModR/M
  effective-address decoding and destination register width through context.
- M2 T2 S3 P256 migrates C6/C7 so context selects ModR/M address width and C7
  word or dword data width through project-native TypeScript.
- M2 T2 S3 P257 migrates LOOP-family count selection so CS default and 67
  choose CX or ECX while the CS cache still selects the IP or EIP target width.
- M2 T2 S3 P258 records the owner priority clarification: T2 execution-size
  migration, remaining 80386 instruction/system paths, ROM trace, coverage
  matrix, and PCjs comparison evidence must close before T3 is requested.
  PCjs remains the behavior authority; NXVM `vcpu.h` and `vcpuins.c` remain
  M2-only structural and coverage references, never implementation or behavior
  sources.
- M2 T2 S3 P259 routes ModR/M word and dword ALU forms through the shared
  context. PCjs's operand/address-size selection supports the project-native
  mapping; a `66` prefix selects the non-default operand size, so pre-existing
  dword fixtures now explicitly use a 16-bit-default code segment. Focused
  default-32 tests cover dword, `66` word, and `67` address-size behavior.
- M2 T2 S3 P260 adds the M2 T2 80386 coverage matrix. NXVM `vcpu.h` and
  `vcpuins.c` inform only its structural and coverage categories; PCjs remains
  the behavioral authority. Partial rows are explicitly not T2 completion.
- M2 T2 S3 P261 routes Group 1 `81`/`83` immediate ALU forms through context.
  PCjs prefix semantics require the immediate width to follow operand width;
  focused default-32 tests cover dword `83`, `66` word, and `67` addressing.
- M2 T2 S3 P262 routes byte ModR/M ALU forms through context. PCjs address-size
  selection makes `67` choose the non-default effective-address form while byte
  operand width remains unchanged; focused default-32 coverage verifies this.
- M2 T2 S3 P263 routes byte Group 1 immediate `80` through context. Its opcode
  extension selects the same project-native arithmetic and flag operations, and
  `67` selects the non-default ModR/M address size without changing byte width.
- M2 T2 S3 P264 routes ModR/M XCHG through context. PCjs operand/address-size
  selection determines the word or dword `87` form and its effective address;
  byte `86` remains byte-width while sharing address selection.
- M2 T2 S3 P265 routes accumulator moffs `A0` through `A3` through context.
  PCjs size selection makes address-immediate width follow address size and
  word/dword data width follow operand size; byte forms remain byte-width.
- M2 T2 S3 P266 routes PUSHF/POPF through context. PCjs-selected flags width
  follows operand size while project-native context keeps SS stack-address width
  independent; protected-mode privilege faults still occur before a POP reads.
- M2 T2 S3 P267 replaces the dword-only MOVZX/MOVSX helper with a generic
  project-native destination-width helper and routes `0F B6/B7/BE/BF` through
  context. PCjs operand/address-size selection controls destination and ModR/M
  width; byte/word source selection remains opcode-defined.
- M2 T2 S3 P268 replaces the dword-only BSF/BSR helper with a generic
  project-native operand-width helper and routes `0F BC/BD` through context.
  PCjs operand/address-size selection controls the scan width and ModR/M
  address form; zero-source destination preservation and ZF handling remain
  shared behavior.
- M2 T2 S3 P269 replaces the dword-only two-operand IMUL helper with a generic
  project-native operand-width helper and routes `0F AF` through context.
  PCjs operand/address-size selection controls signed data width and ModR/M
  address form; established CF/OF overflow handling remains shared behavior.
- M2 T2 S3 P270 replaces the dword-only immediate IMUL helper with a generic
  project-native operand-width helper and routes `69/6B` through context.
  PCjs operand/address-size selection controls signed source, immediate, and
  destination widths, while address-size controls the ModR/M address form.
- M2 T2 S3 P271 routes `0F 90` through `0F 9F` through a project-native SETcc
  helper. PCjs address-size selection controls the byte destination's ModR/M
  address form; condition evaluation and byte width remain opcode-defined.
- M2 T2 S3 P272 routes `8F /0` through the existing project-native contextual
  stack boundary. PCjs operand-size selects popped data width, address-size
  selects a memory destination, and SS D/B selects stack-address width; the
  memory effective address is decoded after the stack pointer advances.
- M2 T2 S3 P273 routes `FF /6` through the existing project-native contextual
  stack boundary. PCjs operand-size selects pushed data width, address-size
  selects a memory source, and SS D/B selects stack-address width; the source
  value is read before the stack pointer changes.
- M2 T2 S3 P274 routes `91` through `97` through a project-native accumulator
  exchange path. PCjs operand-size selection controls whether the exchange
  reads and writes AX or EAX plus the selected register; flags remain unchanged.
- M2 T2 S3 P275 replaces the dword-only BOUND helper with a project-native
  operand-width helper and routes `62` through context. PCjs operand-size
  selection controls signed index and range width, while address-size controls
  the bounds-pair address; existing vector-five fault delivery remains shared.
- M2 T2 S3 P276 routes `8C` and `8E` through a project-native segment-transfer
  helper. Segment selectors remain 16-bit; PCjs address-size selection controls
  the ModR/M memory form, and existing real/protected segment-load validation
  remains shared behavior.
- M2 T2 S3 P277 routes `70` through `7F` through context. PCjs operand-size
  selection controls whether the signed rel8 target is written to IP or EIP;
  the existing shared EFLAGS condition mapping remains authoritative.
- M2 T2 S3 P278 routes `C9` through context after confirming the PCjs LEAVE
  stack-address behavior. Operand-size controls BP/EBP pop width, while SS D/B
  controls SP/ESP address width. This also corrects project-native contextual
  word push/pop accesses to pass a 32-bit SS address explicitly when required.
- M2 T2 S3 P279 adds project-native `ARPL` execution. PCjs supplies the
  protected-mode compatibility authority; the implementation adjusts a 16-bit
  selector's RPL only when needed, writes ZF through a new generic state API,
  and uses existing vector-six delivery outside protected mode.
- M2 T2 S3 P280 adds a project-native LDTR cache and completes its bounded
  instruction path. PCjs remains the behavior authority: `LLDT` is CPL-zero,
  resolves an LDT descriptor in the GDT, and supports a null selector; `SLDT`
  exposes the cached selector. Existing descriptor loading now receives the
  active LDT for TI-selected segment selectors.
- M2 T2 S3 P281 routes `0F 00` system selector forms through the project-native
  execution context. PCjs prefix behavior selects ModR/M effective-address
  width, while SLDT, STR, LLDT, and LTR selector data remains architecturally
  16-bit. The shared helper accepts the context's ModR/M offset and address
  size without changing the existing privilege or descriptor behavior.
- M2 T2 S3 P282 routes the implemented `0F 01` forms through the project-native
  execution context. PCjs prefix behavior selects LGDT/LIDT base width from
  operand size and ModR/M effective-address width from address size. SGDT/SIDT
  preserve their existing six-byte store behavior, and SMSW/LMSW retain fixed
  16-bit data semantics.
- M2 T2 S3 P283 routes implemented `0F 20` and `0F 22` control-register
  transfers through the project-native execution context. PCjs remains the
  behavioral authority: their data width is fixed at 32 bits, operand and
  address prefixes do not change it, and existing CPL-zero fault delivery
  occurs before state transfer.
- M2 T2 S3 P284 routes `0F 06` CLTS through the project-native execution
  context. PCjs remains the behavior authority: operand and address prefixes
  do not change CLTS semantics, while their bytes remain part of the fault
  instruction length and successful EIP advance.
- M2 T2 S3 P285 routes FS/GS stack transfers through the project-native
  execution context. PCjs prefix behavior selects pushed and popped data width,
  while the existing context stack boundary keeps SS D/B selected address width
  independent. Segment loads retain the existing real/protected-mode loader.
- M2 T2 S3 P286 routes near conditional jumps through the project-native
  execution context. PCjs prefix behavior selects the signed displacement and
  destination IP/EIP width, while the existing shared EFLAGS condition mapping
  remains authoritative.
- M2 T2 S3 P287 adds a project-native 32-bit double-shift flags API and routes
  SHLD/SHRD through the execution context. PCjs prefix behavior selects data
  and ModR/M address widths; the shared count, carry, sign, zero, and parity
  model mirrors the established 16-bit project behavior.
- M2 T2 S3 P288 routes LSS/LFS/LGS through a parameterized project-native
  segment-pointer loader. PCjs prefix behavior selects pointer offset and
  destination-register width separately from ModR/M address width; the selector
  remains 16-bit and uses the existing real/protected segment loaders.
- M2 T2 S3 P289 routes register-index BT/BTS/BTR/BTC forms through a
  project-native contextual helper. PCjs prefix behavior selects operand and
  address widths, including signed register bit-index expansion across memory
  operands; the existing carry-flag and mutation semantics remain shared.
- M2 T2 S3 P290 routes `0F BA` immediate-bit forms through the same contextual
  helper. PCjs prefix behavior keeps the bit immediate byte-width while placing
  it after the context-selected ModR/M address encoding.
- M2 T2 S3 P291 adds project-native 32-bit SHL/SHR flag writers and routes
  Group 2 `/4` and `/5` `C1/D1/D3` forms through the execution context. PCjs
  remains the behavioral authority for normalized counts, operand widths, and
  ModR/M address widths; unported rotate and arithmetic-right forms remain on
  their existing path.
- M2 T2 S3 P292 adds project-native 16- and 32-bit SAR flag writers and routes
  Group 2 `/7` `C1/D1/D3` forms through the same context. PCjs remains the
  behavior authority for count normalization and arithmetic sign extension;
  rotate and byte forms remain outside this part.
- M2 T2 S3 P293 adds a project-native 32-bit ROL flag writer and routes Group
  2 `/0` `C1/D1/D3` forms through the context. PCjs remains the behavioral
  authority for normalized count and CF/OF updates; other rotate forms remain
  on their existing path.
- M2 T2 S3 P294 adds project-native 16- and 32-bit ROR flag writers and routes
  Group 2 `/1` `C1/D1/D3` forms through the context. PCjs remains the
  behavioral authority for normalized count and ROR-specific CF/OF updates;
  rotate-through-carry forms remain on their existing path.
- M2 T2 S3 P295 records the owner-authorized CPU authority correction. NXVM
  `vcpu.h` and `vcpuins.c` define required CPU coverage and validated execution
  behavior; Intel IA-32 documentation resolves conflicts, while PCjs remains
  the PC/AT and whole-machine reference. NXVM C, macros, global state, BIOS,
  POST, I/O, and guest-service behavior remain excluded.
- M2 T2 S3 P296 audited the corresponding NXVM handler bodies. `WBINVD`,
  `WRMSR`, `RDMSR`, `CPUID`, and `RSM` all call `UndefinedOpcode()` and set the
  instruction-ignore path. M2 therefore preserves and tests their `#UD`
  behavior; it does not invent later-processor cache, MSR, CPUID, or SMM
  functionality.
- M2 T2 S3 P297 adds a project-native two-byte opcode boundary for NXVM's
  explicit `UndefinedOpcode()` TODO handlers. It uses the existing vector-6
  fault delivery path before any extension-specific execution and verifies the
  faulting EIP for unprefixed and `66`-prefixed forms.
- M2 T2 S3 P298 migrates NXVM Group 2 RCL/RCR behavior through the execution
  context. The project-native helper normalizes counts by the 16- or 32-bit
  carry ring, keeps CF through every rotation, updates OF only for a one-bit
  rotation, and preserves existing ModR/M memory addressing.
- M2 T2 S3 P299 aligns all NXVM Group 2 `/6` forms with its
  `UndefinedOpcode()` path. The context dispatcher recognizes each Group 2
  opcode before host-only unsupported-form handling and delivers vector 6 with
  the original fault EIP.
- M2 T2 S3 P300 adds a project-native byte rotate-right flag writer and routes
  the existing D0 RCR path through it. The helper follows NXVM's one-bit RCR
  overflow rule and preserves OF when the count does not define it.
- M2 T2 S3 P302 migrates defined C0 byte Group 2 forms into a project-native
  contextual helper. It keeps /6 on the existing invalid-opcode path, selects
  ModR/M address width from the execution context, and records undefined OF by
  preserving it when a multi-bit operation does not define it.
- M2 T2 S3 P303 reuses that helper for D0 fixed-count and D2 CL-count byte
  forms. The shared RCR path keeps CF as the outgoing low bit, correcting the
  previous byte-specific result-bit inference.
- M2 T2 S3 P304 keeps byte Group 2 zero-count instructions as architectural
  no-ops after decoding their complete length. It also preserves OF for
  multi-bit byte SHL/SHR/SAR operations, where Intel defines OF only for count
  one. This follows the project's established policy for undefined flags.
- M2 T2 S3 P305 routes F7 Group 3 through project-native contextual word and
  dword helpers. CS D/B plus 66 selects the operand width, and 67 independently
  selects ModR/M addressing. Existing tests that used 66 as a dword selector in
  a default-32 code segment were corrected to use a default-16 code segment;
  a malformed 32-bit-address immediate TEST fixture was also corrected.
- M2 T2 S3 P306 routes FE byte INC/DEC through a project-native contextual
  helper. It preserves the existing byte flags and register rules while using
  the execution context for ModR/M address width.
- M2 T2 S3 P307 routes F6 byte Group 3 through a project-native contextual
  helper. It retains byte data semantics, existing implicit-register behavior,
  divide faults, and flag writers while selecting ModR/M addressing from the
  instruction context.
- M2 T2 S3 P308 adds project-native contextual FF /0 and /1. The helper uses
  existing word/dword flag writers, keeps CF unchanged, and selects operand and
  ModR/M address widths independently from the instruction context.
- M2 T2 S3 P309 routes FF /2 through a project-native contextual near-call
  helper. It reads a complete target before stack mutation, pushes an
  operand-sized return address through the existing SS stack boundary, and
  loads IP or EIP from the context-selected operand width.
- M2 T2 S3 P310 routes FF /4 through a project-native contextual near-jump
  helper. It uses the context-selected operand and ModR/M address widths and
  does not alter stack state.
- M2 T2 S3 P311 adds project-native repeated LODS handling. It selects data
  width from the operand context and count/SI or ESI width from the address
  context, retaining the last loaded accumulator value and direction-flag
  progression.
- M2 T2 S3 P312 routes XLAT through the execution context. AL remains byte
  data while the DS table index selects BX or EBX from the address size.
- M2 T2 S3 P313 routes ENTER through a project-native contextual helper. Its
  frame data width selects BP or EBP values, while SS D/B controls stack
  addresses; the local allocation immediate remains a 16-bit byte count.
- M2 T2 S3 P314 permits only A0-A3 moffs forms through the contextual path when
  a segment override is present. The helper applies the selected segment to the
  direct offset, while other segment-overridden opcode families retain their
  existing dispatcher boundary.
- Mechanical adaptation: a narrow byte-reader interface replaces PCjs bus and
  cache objects.
- Intentional behavior changes: none.
- Incomplete behavior: paging hookup, prefetch, general decode, exceptions,
  interrupt wakeup, protected-mode CLI and far jumps, and remaining instruction
  behavior, including non-register LMSW, wider I/O forms, and segment-load
  forms, remain later S3 work. Concrete port routing is active S5 work.

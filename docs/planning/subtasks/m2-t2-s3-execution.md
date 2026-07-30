# M2 T2 S3 Execution Record

## Objective

Implement the selected PCjs-supported 80386 execution, exception, interrupt,
and privilege behavior required by the generic M2 PC/AT machine, using
project-native TypeScript boundaries.

## Non-Goals

- Do not add 80486, PC110, guest-service, BIOS, DOS, filesystem, or device
  shortcuts.
- Do not begin M2 T2 S4 paging-to-core integration, M2 T3 hardware, or later
  subtasks before their canonical entry conditions are met or the owner
  authorizes a documented ordering correction.
- Do not use NXVM as a behavioral authority.

## Dependencies And Evidence

- PCjs baseline: `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70` in `../pcjs`.
- Behavioral authority: PCjs PCx86 v2 source and the M1 selected-machine
  reference path.
- Structural reference only during M2: NXVM CPU state, module boundaries, and
  trace design.
- Protected ROM and disk assets remain local, ignored inputs; no protected
  bytes are committed.

## Authorized Execution-Size Correction

The owner authorized a bounded correction on 2026-07-29 after evidence showed
that PCjs selects data and address width from the current CS hidden-cache `D/B`
attribute, while the current TypeScript dispatcher uses explicit prefix branches
for most dword behavior. The correction introduces a generic per-instruction
execution context with these contracts:

- CS `default32` supplies the default operand and address sizes.
- One or more `66` prefixes select the non-default operand size; one or more
  `67` prefixes select the non-default address size.
- Repeated same-class prefixes do not cumulatively toggle a size.
- SS `default32` remains the independent stack-address width; operand size
  controls pushed or popped data width where applicable.
- Segment overrides, repeat prefixes, LOCK boundaries, fault instruction EIP,
  trace hooks, and device-facing interfaces remain explicit context or existing
  execution inputs.

The first implementation slice must test 16-bit and 32-bit CS defaults with and
without `66`/`67`, independent SS stack width, prefix combinations, instruction
length, and fault EIP. Migration then proceeds through decode, ModR/M,
immediates, stack, and string paths in verified parts. It does not authorize
hardware, storage, video, PC110, 80486, guest-service, BIOS, DOS, or filesystem
work.

## Owner Priority Clarification

The owner clarified on 2026-07-29 that M2 T2 must finish before any T3 work is
requested. S3 therefore continues with execution-size migration and the
remaining 80386 instruction and system paths. T2 closure requires all scheduled
focused tests, a selected local ROM trace through the project-owned core, a
coverage matrix, and bounded PCjs comparison evidence.

For the M2 CPU only, NXVM `vcpu.h` and `vcpuins.c` are structural and
coverage-reference inputs. They set neither behavior nor implementation source:
do not translate NXVM C, macros, global state, BIOS, POST, I/O hacks, or
guest-service behavior. PCjs remains the compatibility authority and Intel
80386 architecture remains the semantic requirement. T3 remains prohibited
until T2's gates pass and the owner grants a new authorization.

## Working Method

1. Classify one observed reset, BIOS, protected-mode, or interrupt blocker.
2. Compare the exact PCjs behavior and implement the smallest generic CPU
   boundary that resolves that blocker.
3. Add focused TypeScript tests, provenance, a PCjs behavior report when
   required, and a concise tracking entry in the same part commit.
4. Run `pnpm run format`, `pnpm run build`, `pnpm run lint`, `pnpm run test`,
   and `git diff --check` before pushing.

## Acceptance Evidence

- Focused CPU tests cover every implemented instruction, mode, exception, and
  privilege transition.
- The selected standalone PC/AT core executes the available synthetic reset-ROM
  trace through project-owned physical memory without a sibling runtime import.
- Before closing S3, a bounded M1-reference comparison records the remaining
  CPU execution path to the next whole-machine checkpoint.
- S3 does not claim complete 80386 behavior until its coverage and reference
  evidence demonstrate that all behavior required by the selected machine has
  been implemented.

## Stop Conditions

- Stop for owner direction if completing a blocker requires a material module
  redesign, protected-media redistribution, an unclear source license, or a
  milestone/subtask ordering change.
- Record nonblocking later work with the required priority only when it is
  outside the active milestone; do not hide an active S3 blocker behind a TODO.

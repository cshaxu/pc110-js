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
- Use NXVM CPU coverage and validated instruction behavior only as authorized
  by `docs/decisions/m2-t2-nxvm-cpu-authority.md`; do not use its BIOS, POST,
  device, I/O, global-state, macro, or guest-service behavior.

## Dependencies And Evidence

- PCjs baseline: `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70` in `../pcjs`.
- CPU implementation baseline: NXVM `vcpu.h` and `vcpuins.c`, constrained by
  the owner-authorized decision record.
- CPU coverage and instruction behavior authority: NXVM `vcpu.h` and
  `vcpuins.c`.
- PC/AT compatibility and whole-machine reference: PCjs PCx86 v2 source and
  the M1 selected-machine reference path.
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

The owner authorized an M2 T2 CPU baseline correction after this record was
created. NXVM `vcpu.h` and `vcpuins.c` now define required CPU coverage and are
the first-order and decisive execution reference. Do not translate NXVM C,
macros, global state, BIOS, POST,
I/O hacks, or guest-service behavior. PCjs remains the PC/AT compatibility and
whole-machine reference. NXVM compatibility extensions listed in the decision
record are mandatory `#UD` behavior only; later-processor functionality remains
out of scope. T3 remains prohibited until T2's gates pass and the owner grants
a new authorization.

## Owner-Authorized Reconstruction Method Correction

The owner replaced the incremental execution-context migration method on
2026-07-29. The verified TypeScript CPU is frozen as legacy/reference evidence
at `cpu-legacy-reference` commit `26bd074`. It remains executable for tests,
trace evidence, and differential comparison, but receives no new primary CPU
behavior. No broad source move accompanies the freeze.

The primary implementation is now a clean project-native TypeScript 80386 CPU
rebuilt in NXVM opcode-family order. The authoritative order and status are
recorded in `docs/coverage/m2-t2-nxvm-opcode-ledger.md`; module boundaries and
delivery rules are recorded in `docs/planning/m2-t2-nxvm-cpu-reconstruction.md`.
Each family must be delivered as a complete relevant family rather than a
single observed opcode or ModR/M extension. Existing execution-context work is
legacy/reference evidence only and cannot be used to claim rebuilt coverage.

This correction preserves all existing M2 T2 completion gates. It authorizes
neither M2 T3 nor platform, firmware, guest-service, PC110, storage, video,
BIOS, DOS, or filesystem work.

## Working Method

1. Select the next incomplete NXVM opcode family or recorded architectural
   dependency from the opcode ledger in numeric family order.
2. Implement the complete applicable NXVM behavior in project-native
   TypeScript. An observed reset, BIOS, protected-mode, or interrupt blocker
   may identify a dependency or validate the result, but does not narrow the
   family scope.
3. Use PCjs only for PC/AT compatibility and whole-machine comparison. Add
   focused TypeScript tests, provenance, a PCjs behavior report when
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
- S3 coverage closure is followed by M2 T2 S6, which must prove the rebuilt
  CPU as the sole executing CPU in the PCjs-assisted integration harness before
  the CPU is accepted as ready for native-device migration.

## Mandatory T2-To-T3 Transition Gate

After all M2 T2 subtasks and completion evidence are closed, execute
`docs/steering/m2-t2-post-completion-architecture-review.zh-CN.md` before
starting M2 T3. This is a behavior-preserving architecture-hardening gate, not
authorization for new hardware, firmware, guest-service, or PC110 behavior.
It must preserve the verified T2 baseline and record its result before normal
M2 T3 work resumes.

## Stop Conditions

- Stop for owner direction if completing a blocker requires a material module
  redesign, protected-media redistribution, an unclear source license, or a
  milestone/subtask ordering change.
- Record nonblocking later work with the required priority only when it is
  outside the active milestone; do not hide an active S3 blocker behind a TODO.

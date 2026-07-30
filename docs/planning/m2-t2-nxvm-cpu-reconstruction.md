# M2 T2 NXVM-Ordered CPU Reconstruction

## Decision

The owner authorized a replacement of the incremental execution-context
migration method on 2026-07-29. M2 T2 now reconstructs the project-native
80386 CPU in NXVM opcode-family order. This is a change of implementation
method, not a reduction of the M2 T2 completion gate.

`../nxvm/src/device/vcpu.h` and `../nxvm/src/device/vcpuins.c` are the
first-order reference for CPU coverage and validated instruction behavior.
Intel IA-32 documentation resolves semantic conflicts. PCjs remains the
PC/AT, compatibility, ROM-trace, and whole-machine comparison authority.

## Frozen Reference

`cpu-legacy-reference` is a snapshot branch at `26bd074`, the last verified
and pushed incremental CPU baseline. The existing `src/cpu/x86/` modules and
their tests remain executable legacy/reference evidence. They are not a source
of new CPU behavior and must not be imported by the rebuilt CPU at runtime.

No source move accompanies this freeze. Avoiding a broad import rewrite keeps
the verified reference runnable. Differential adapters may use it only in
tests, never in the rebuilt CPU production path.

## Rebuilt CPU Boundaries

The rebuilt CPU will be project-native TypeScript under `src/cpu/rebuilt/`:

- `state/`: registers, flags, segment caches, control, debug, and task state.
- `decode/`: instruction fetch, prefixes, opcode dispatch, and immediates.
- `addressing/`: ModR/M, SIB, effective addresses, and moffs decoding.
- `instructions/`: numerically ordered opcode-family modules.
- `protection/`: segmentation, descriptors, protection checks, and paging.
- `events/`: faults, exceptions, software interrupts, and external interrupts.
- `debug/`: trace hooks and stable state dumps.

The rebuilt CPU may depend on existing project memory, machine, device, and
public interfaces. UI code remains outside the emulation core. It must not
depend at runtime on legacy CPU modules, PCjs, or NXVM.

## Family Delivery Rule

Each family is completed as a family, not as an observed single opcode or
ModR/M extension. Where applicable, delivery includes byte, word, and dword
forms; register and memory operands; immediates; 16-bit and default-32 code;
`66` and `67`; flags; fault EIP; protection and privilege behavior; and
focused tests. An architectural boundary may split a family only when the
opcode ledger records the reason before implementation.

Every completed family updates the ledger, tracking, provenance, and a PCjs
comparison report, runs the full gate, and commits as `M2 T2 S3 Pxxx:`.

Shared decode or addressing infrastructure is added only within an active
opcode-interval delivery. Do not create standalone parser, type, adapter,
trace, or utility parts before an interval has execution behavior.

## Owner-Authorized Interval Delivery Correction

P327 is a verified, pushed `00-3F` in-progress execution slice, not a
completion claim for that interval or for M2 T2. The owner authorized the
following delivery correction on 2026-07-29: future parts use NXVM-driven
large numeric opcode intervals or complete opcode families as their default
unit. Each part begins with a concise NXVM handler checklist in the ledger and
delivers executable TypeScript behavior with its necessary local
infrastructure. Split an interval only for a genuine architectural dependency,
and record that dependency in the ledger before implementation.

This correction permits P327's selector-validation and protection-fault work
to remain recorded dependencies; it does not permit those omissions to be
claimed as completed behavior. It also does not lower any M2 T2 completion
gate.

## Exclusions

Do not translate NXVM C source, macros, global state, BIOS, POST, device,
I/O, or guest-service behavior. Do not start M2 T3, hardware, storage, video,
PC110, BIOS, DOS, guest-service, or filesystem work. Later-processor entries
that NXVM marks as `UndefinedOpcode()` remain required `#UD` behavior only.

## Completion Gate

M2 T2 still requires complete NXVM-covered 80386 behavior, paging, faults,
ROM trace, M1 comparison, coverage evidence, and all scheduled tests. The
post-T2 architecture review remains mandatory before M2 T3.

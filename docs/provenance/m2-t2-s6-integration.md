# M2 T2 S6 Differential Provenance

## Identity

- Subsystem: verification-only PCjs CPU differential oracle.
- Source repository and commit: PCjs
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## P1 Retired Inventory And Contract

P1 records only the retired selected M1 device proxy inventory and project-owned
bridge types. It copies no PCjs source. The active S6 harness does not use it.

## P2 Authorized Oracle Boundary

The harness may load the pinned PCjs CPU and its minimal test-only support
objects from the sibling checkout through relative paths. It must construct an
isolated oracle machine state, execute one instruction on each side, normalize
the observed results, and compare them. It must never expose PCjs code in the
product build, product browser runtime, or distribution.

## P3 Executable Baseline

`src/integration/pcjs/differential-harness.ts` dynamically imports the PCjs
opcode helper modules, CPUx86, Busx86, and Memoryx86 only while an explicit
test invokes the oracle. It initializes independent one-megabyte RAM images
and equivalent real-mode state. No PCjs source is copied, modified, bundled, or
used by product runtime code.

P4 snapshots the isolated PCjs RAM image before the step and diffs it after the
step. This observes changed memory state even when PCjs writes through an
internal memory-block path rather than the public Busx86 setter.

## P11 Approved Compatibility Exception

The pinned PCjs CPU oracle differs from NXVM for real-mode primary opcode D6.
The owner approved retaining the project's NXVM/80386 vector-six behavior on
2026-07-30. The exception does not copy or modify PCjs source and is recorded
as EXC-001 in the project-wide compatibility register.

## P12 Logical-Flag Conflict

The existing generic dispatcher exposed a PCjs mismatch in an attempted
real-mode accumulator-arithmetic program. The owner approved retaining the
NXVM-aligned behavior and recording EXC-002. No PCjs source was copied or
changed.

## P14 Numeric Program Intervals

P14 passes real-mode byte streams and instruction budgets through the existing
rebuilt dispatcher and isolated PCjs CPU. It adds no PCjs source,
opcode-specific oracle implementation, or runtime dependency.

## P15 Changed-Byte Normalization

The rebuilt memory journal now records only writes that alter the RAM image,
matching the PCjs before/after snapshot delta. This is observation
normalization, not a CPU memory-write behavior change.

## P16 String I/O Program

P16 uses the existing declared-port adapter and independent RAM images. It adds
no device emulation, PCjs source, or product runtime dependency.

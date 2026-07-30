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

## P17 Conditional Program

P17 provides a generic byte stream to the existing dispatcher. It adds no
PCjs source or branch-specific oracle behavior.

## P18 Group One Program

P18 uses the shared dispatcher and a real-mode immediate register program. It
adds no PCjs source, opcode-specific oracle, or product runtime dependency.

## P19 ModR/M Program

P19 uses the shared dispatcher for register ModR/M and LEA forms. It adds no
PCjs source, custom oracle behavior, or product dependency.

## P20 Accumulator Program

P20 uses the shared dispatcher for accumulator and flag-transfer forms. It adds
no PCjs source, instruction-specific oracle, or product runtime dependency.

## P21 Moffs Program

P21 uses independent RAM images and the shared dispatcher for all accumulator
moffs forms. It adds no PCjs source or runtime dependency.

## P22 Byte String Program

P22 uses independent RAM images and the shared dispatcher for byte string
operations. It adds no PCjs source, device emulation, or product runtime
dependency.

## P24 Immediate Shift And Move Program

P24 uses the project-native dispatcher and two independent real-mode RAM
images for C0/C1 immediate shifts and C6/C7 immediate MOV forms. PCjs remains
a verification-only oracle; no PCjs source, runtime dependency, or
instruction-specific oracle logic enters the product.

## P25 Near Return Program

P25 uses the project-native dispatcher and independent real-mode RAM images
for C2/C3 near returns through a prepared stack frame. PCjs remains a
verification-only oracle; no PCjs source, runtime dependency, or
instruction-specific oracle logic enters the product.

## P26 Far Pointer Load Program

P26 uses the project-native dispatcher and independent real-mode RAM images
for C4/C5 LES and LDS word far-pointer loads. PCjs remains a verification-only
oracle; no PCjs source, runtime dependency, or instruction-specific oracle
logic enters the product.

## P27 Stack Frame Program

P27 uses the project-native dispatcher and independent real-mode RAM images
for C8/C9 ENTER and LEAVE stack-frame operations. PCjs remains a
verification-only oracle; no PCjs source, runtime dependency, or
instruction-specific oracle logic enters the product.

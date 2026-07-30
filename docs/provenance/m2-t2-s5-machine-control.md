# M2 T2 S5 Machine-Control Provenance

## Identity

- Subsystem: project-native rebuilt CPU port dispatch, reset, stepping, and trace.
- Source contract: selected M1 PCjs machine and PCx86 bus behavior at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## P5 Rebuilt Port Dispatch

P5 adds a project-native width-aware port dispatcher for the rebuilt CPU.
Unclaimed ports remain explicit errors, so this code supplies no device value
and does not reproduce PCjs device behavior. It imports no PCjs, NXVM, or
legacy CPU runtime code.

## P6 Rebuilt Machine Composition

P6 composes project-native physical memory, the rebuilt port dispatcher, and
the rebuilt CPU into a deterministic reset/step/run boundary with unified CPU
and port traces. It does not add any hardware device or reference runtime.

## P7 Rebuilt Trace Stop Boundary

P7 routes the selected-ROM trace through the rebuilt machine core and records
halt, budget, or error stops with completed instruction count and CPU state.
An unmapped port remains a diagnostic boundary rather than an emulated device.

## P8 S5 Closure

P8 closes S5 from P5-P7 evidence without introducing a device, a synthetic ROM
response, or any PCjs, NXVM, or legacy CPU runtime dependency.

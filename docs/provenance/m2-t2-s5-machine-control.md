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

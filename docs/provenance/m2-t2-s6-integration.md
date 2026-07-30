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

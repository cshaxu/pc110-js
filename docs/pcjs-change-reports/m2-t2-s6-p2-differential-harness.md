# M2 T2 S6 P2 PCjs Change Report: Differential Harness Direction

## Summary

- Affected PCjs-derived subsystem: verification-only CPU oracle boundary.
- Changed behavior: no PCjs source or product behavior changes; S6 replaces a
  retired device-proxy proposal with a test-only lockstep CPU comparison.

## Justification

- PCjs device construction requires material Busx86, CPUx86, and computer
  lifecycle compatibility.
- A CPU differential oracle isolates instruction semantics without embedding a
  hidden PCjs device runtime in the product.

## Verification

- The implementation must initialize independent equivalent states, execute
  exactly one instruction per side, and compare normalized state and effects.
- PCjs use must remain test-only and relative-path based.
- The standalone browser DOS workload remains a project-owned native-machine
  M2 completion gate.

# M2 T2 S6 P1 PCjs Change Report: Retired Proxy Inventory

## Summary

- Affected PCjs-derived subsystem: retired selected M1 device-proxy boundary.
- Changed behavior: none; this part records historical inventory and a
  project-owned bridge contract that is not used by the active S6 design.

## Justification

- Source inspection found that selected PCjs devices require material PCjs
  Bus/CPU lifecycle compatibility. The owner replaced the proposal with a
  test-only one-instruction PCjs CPU differential oracle.

## Verification

- Focused tests validate the historical descriptor contract.
- No PCjs source was copied or modified.
- The active S6 harness has separate P2 provenance and verification evidence.

# M2 T3 S1 PIC Provenance

## Reference Boundary

- Behavioral reference: pinned PCjs `chipset.js` PIC documentation and port
  behavior from the read-only sibling checkout.
- Product code: project-native TypeScript design; no PCjs source, device,
  runtime module, firmware, media, or browser resource is copied or imported.

## Initial Scope

The implementation starts with 8259A ICW/OCW state, request arbitration,
master/slave cascade, and vector acknowledgement. Unsupported optional 8259A
modes remain explicit deferred behavior until a real workload activates them.

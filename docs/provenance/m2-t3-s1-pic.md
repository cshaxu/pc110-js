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

## P2 Single-Controller Core

P2 implements the 8259A state model in project-native TypeScript from the
documented ICW/OCW protocol and read-only behavioral reference. It does not
copy PCjs code or couple to PCjs CPU, bus, device, firmware, or browser code.

## P3 PC/AT Cascade

P3 composes the project-native controllers with the PC/AT slave-on-master-IRQ2
wiring and exports four structural port ranges for the rebuilt port bus. The
device remains CPU-independent; no PCjs device, CPU, firmware, or synthetic
guest behavior is used.

## P4 Machine Admission

P4 registers the local PIC ranges in the rebuilt machine core and sends a
non-destructive pending vector through the existing project-native CPU external
interrupt boundary before acknowledging the PIC. It preserves CPU IF and
instruction-inhibition rules without a PCjs runtime dependency.

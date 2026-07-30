# M2 T3 S3 DMA Provenance

## Reference Boundary

- Behavioral reference: pinned read-only PCjs `chipset.js` DMA controller and
  page-register definitions.
- Product code: original TypeScript only; no PCjs device, runtime, firmware,
  media, browser resource, or storage behavior is imported.

## Initial Scope

The DMA subsystem owns controller and page-register state, explicit transfer
grants, and generic memory/device interfaces. FDC-specific data flow and all
protected media remain outside T3 S3.

## P2 Controller State Core

P2 implements local 8237-style controller state and explicit transfer grants
from the selected component protocol. It has no PCjs import, port bus, memory
bus, FDC, firmware, media, or host-timing dependency.

## P3 PC/AT Port Composition

P3 composes two local controller instances and the selected page-register ports
with the rebuilt machine bus. The implementation remains independent of PCjs,
memory movement, FDC, firmware, media, and host scheduling.

## P4 Cascade And Transfer Boundary

P4 adds local channel-4 cascade arbitration and a generic data adapter driven
solely by explicit grants. It does not introduce a device implementation or a
storage, firmware, media, or host-time dependency.

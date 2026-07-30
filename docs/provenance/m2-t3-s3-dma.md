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

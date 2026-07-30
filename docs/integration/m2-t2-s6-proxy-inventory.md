# Retired M2 T2 S6 PCjs Proxy Inventory

## Boundary

This inventory records the retired temporary-PCjs-device proposal for
historical provenance. The owner-authorized S6 design uses a one-instruction
PCjs CPU differential oracle and does not instantiate these devices.

## Retired Temporary Proxies

| ID | PCjs source | Bridge boundary | Native replacement owner | Verification workload |
| --- | --- | --- | --- | --- |
| `chipset` | `machines/pcx86/modules/v2/chipset.js` | port dispatch, IRQ, DMA request, reset, cycle advance | M2 T3 PIC/PIT/DMA/RTC/system-port variants | M1 browser boot markers |
| `video` | `machines/pcx86/modules/v2/video.js` | port dispatch, mapped video memory, cycle advance, browser presentation | M2 T5 VGA | M1 VGA markers and DOS prompt |
| `fdc` | `machines/pcx86/modules/v2/fdc.js` | port dispatch, IRQ, DMA request, reset, cycle advance | M2 T4 floppy controller | M1 floppy mount and boot-sector path |
| `hdc` | `machines/pcx86/modules/v2/hdc.js` | port dispatch, IRQ, DMA request, reset, cycle advance | M2 T4 fixed storage | selected machine initialization |
| `keyboard` | `machines/pcx86/modules/v2/keyboard.js` | browser input, port dispatch, IRQ, reset | M2 T5 keyboard input | M1 keyboard readiness |
| `com1` | `machines/pcx86/modules/v2/serial.js` | port dispatch, IRQ, reset, cycle advance | M2 T5 serial | M1 initialization |
| `com2` | `machines/pcx86/modules/v2/serial.js` | port dispatch, IRQ, reset, cycle advance | M2 T5 serial | M1 initialization |
| `mouse` | `machines/pcx86/modules/v2/mouse.js` | browser input through `com1`, reset | M2 T5 serial pointer | M1 initialization |

## Historical Prohibited Paths

- `machines/pcx86/modules/v2/cpux86.js` is not a proxy and must not execute.
- The frozen `src/cpu/x86/` CPU and `../nxvm` must not execute guest code.
- The browser XSL and UI resources are presentation resources, not hardware
  proxies and cannot own guest state or ports.

## Retired Contract

`src/integration/pcjs/bridge-contracts.ts` remains historical contract evidence.
It must not be attached to the S6 harness or any product runtime.

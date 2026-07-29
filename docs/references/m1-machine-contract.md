# M1 Reference Machine Contract

## Identity

- Reference source: PCjs PCx86 v2 at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source machine XML:
  `machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml`.
- Reference designation: `m1-deskpro386-vga-4096`.
- Role: browser reference baseline for M1 and behavioral source contract for
  M2. This is not the standalone pc110-js runtime.

## CPU And Memory

| Area | Contract |
| --- | --- |
| CPU | 80386 model |
| Bus | 32-bit computer bus |
| Low RAM | `0x00000`, size `0xA0000` |
| DeskPro RAM window | `0xFA0000`, size `0x60000` |
| Extended RAM | `0x100000`, size `0x300000` |
| System ROM | `0xF8000`, size `0x8000`, aliases `0xF0000`, `0xFFFF0000`, and `0xFFFF8000` |

## Devices

| Device | Contract | Boundary |
| --- | --- | --- |
| Chipset | PCjs `deskpro386` model | DeskPro-specific variant |
| Video | IBM VGA with 1986-10-27 VGA ROM | Standard PC-compatible device |
| Floppy controller | IBM FDC library, two 1.44MB drives | Standard PC/AT-compatible device |
| Fixed storage | IBM AT Type 5 47MB configuration | Standard PC/AT-compatible device |
| Keyboard | IBM 84-key keyboard | Standard PC/AT-compatible device |
| Serial | COM1 and COM2 | Standard PC-compatible device |
| Pointer | Serial mouse on COM1 | Standard PC-compatible device |

## Boot And Media Policy

- The M1 boot input is the read-only, hash-validated local `dos-floppy` asset.
- Drive A uses the known-good 1.44MB floppy through the selected FDC path.
- Default COMPAQ DOS auto-mount names and PCjs disk catalogs are excluded.
- The HDC remains configured hardware but is not a required M1 boot media
  source.

## Browser Contract

- Serve PCjs browser, XSL, CSS, and release resources from the pinned Git
  object at a local virtual root.
- Serve no resource from the sibling worktree HEAD unless it is identical to the
  pinned object.
- Present PCjs VGA, keyboard, FDC media, reset, and run controls in the normal
  browser machine UI.

## M2 Implementation Boundary

M2 must reproduce every selected device through project-native TypeScript and
real hardware paths. The 80386 CPU, VGA, FDC, HDC, keyboard, serial, mouse, and
common interrupt, timer, DMA, RTC, system-port, and bus behavior retain generic
PC/AT implementations. The DeskPro 32-bit computer wiring, chipset, RAM window,
and ROM map remain explicit selectable machine-specific variants. No PC110
behavior belongs in this contract.

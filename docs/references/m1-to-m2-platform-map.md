# M1 To M2 Platform Hardware Map

| PCjs v2 source module | M2 destination area | Required separation |
| --- | --- | --- |
| `chipset.js` | `src/devices/chipset/` | split PIC, PIT, DMA, RTC/CMOS, system ports, and A20/reset glue into testable devices |
| `interrupts.js` | `src/cpu/x86/interrupts.ts` | CPU-facing exception and interrupt acceptance |
| `ram.js`, `rom.js` | `src/memory/devices/` | mapped-memory device ownership |
| DeskPro configuration | `src/machine/configurations/deskpro386.ts` | explicit variant wiring, never the generic default |

M2 starts with generic PC/AT variants. The selected DeskPro chipset, ROM map,
and RAM window are profile-selected deltas. Future PC110 platform behavior must
be variants rather than edits to the generic devices.

# M2 T5 P28 VGA Status And Feature Evidence

PCjs documents that the IBM VGA ROM reads Input Status 0 at `0x3C2` after
programming DAC register zero and expects SWSENSE to reflect whether any RGB
component equals `0x2D`. P28 implements this selected color-monitor behavior
from the native DAC and adds Feature Control write aliases at `0x3BA`/`0x3DA`
with the `0x3CA` readback register.

The selected five-million-instruction trace completes at `F000:C675` after the
VGA ROM returns to system firmware. A 40M trace still records repeated
`F000:C7D8 -> C000:06E1 -> F000:C7DA` service transfers. That later path is
not claimed resolved by P28 and remains a PCjs-comparison target.

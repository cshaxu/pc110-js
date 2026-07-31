# M2 T5 P120 Provenance: Device Boundary Scheduling

P119's per-counter phase proved that PCjs PIT reload state is relative to the
load cycle, but a local counter-only delay still updated the visible count one
instruction too early at `F000:BB1B`.

PCjs performs device updates before each CPU instruction. The native core now
queues the elapsed CPU-cycle work after an instruction and settles PIT, RTC,
DMA, video, and pending device effects before the following instruction. CPU
virtual cycles advance immediately, while device visibility and IRQ admission
follow the PCjs instruction boundary.

Browser replay crossed `F000:BB1B`, `F000:BB19`, and `F000:BB26`. The next
first difference is `F000:BB29`: PIT1 is equal, while PIT0 reflects remaining
native `856` versus PCjs `889` CPU-cycle accounting.

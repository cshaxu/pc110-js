# M2 T5 S5 Unpopulated I/O Provenance

- Behavioral reference: PCjs `bus.js` specifies `0xFF` for unregistered input
  and ignored unregistered output.
- Trigger: selected DeskPro ROM probes absent MDA-style `0x3BC` before the
  configured parallel adapter at `0x378`.
- Product code: original machine-port-bus policy selected only by the rebuilt
  whole-machine composition.
- Excluded: LPT placeholder, PCjs code/runtime, BIOS change, or guest service.

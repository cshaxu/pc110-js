# M2 T5 S1 P10 VGA Memory Provenance

Behavioral reference: pinned read-only PCjs `video.js` VGA memory access,
latch, plane, and Graphics Controller mode behavior. Product code is original
TypeScript. PCjs runtime, fonts, BIOS, renderer, media, and browser code are
not imported.

The native implementation owns four 64 KiB planes, latches, selected aperture
windows, Sequencer map masks, chain-four/even-odd address selection, and
Graphics Controller read/write modes. Rendering remains a later consumer.

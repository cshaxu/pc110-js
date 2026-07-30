# M2 T5 S1 P11 VGA CRTC Provenance

Behavioral reference: pinned read-only PCjs `video.js` CRTC register map and
defined masks. Product code is original TypeScript. PCjs runtime, timing loop,
renderer, firmware, fonts, media, and browser code are not imported.

The VGA core owns the shared indexed CRTC ports; retained CGA compatibility
owns only mode, color, and status ports.

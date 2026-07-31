# M2 T5 S6 P160 Lockstep Extension Provenance

## Evidence

The browser diagnostic used the selected project-native DeskPro profile, the
pinned PCjs `pc110` diagnostic branch, and the validated local floppy. It
reconstructed P157's cold 65,536-boundary match before requesting one ordinary
1,024-instruction batch from the retained paused endpoints.

## Result

The extension reported `Lockstep batch matched: 1024 boundaries, 4441/4441
cycles`. This confirms that the coordinator can advance beyond the recorded
baseline without a reset or state transfer between endpoints.

## Boundary

The comparison remains diagnostic-only and compares its established normalized
CPU, timing, and selected-device fields. It does not introduce a PCjs runtime
dependency, state import, device proxy, or compatibility exception.

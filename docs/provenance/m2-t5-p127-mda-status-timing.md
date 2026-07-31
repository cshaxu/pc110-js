# M2 T5 P127 Provenance: MDA Status Timing

The first post-P126 lockstep difference was the `IN AL,DX` at `F000:BB3A`
from MDA status port `0x3BA`: native returned `0x00`; PCjs returned `0xF9`.

PCjs derives MDA status from its 16 MHz 80386 video timing: reset begins in
vertical retrace, uses 350 horizontal periods per frame, 75 percent horizontal
active time, 96 percent vertical active time, and keeps MDA bits 7-4 set.
The project-native device now models those parameters from a supplied virtual
CPU clock. No ROM-address or firmware-specific behavior was added.

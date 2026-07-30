# M2 T5 S1 P11 PCjs Change Report: VGA CRTC

PCjs identifies `0x3D4/0x3D5` as the active VGA CRTC indexed interface.
Original TypeScript now assigns those ports to a native VGA CRTC rather than a
compatibility-only CRTC bank, retaining CGA mode/color/status ports separately.
No PCjs runtime, renderer, firmware, media, or browser code is imported.

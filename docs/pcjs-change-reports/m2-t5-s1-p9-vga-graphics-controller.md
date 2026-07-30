# M2 T5 S1 P9 PCjs Change Report: VGA Graphics Controller

PCjs maps the complete VGA Graphics Controller index/data bank at
`0x3CE`/`0x3CF` and uses its state to select video-memory behavior. Original
TypeScript now retains the same native register classes and defined bit widths
through an independently designed device model. No PCjs runtime, memory,
renderer, firmware, media, or browser implementation is imported.

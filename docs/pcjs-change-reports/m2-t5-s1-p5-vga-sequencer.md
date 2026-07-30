# M2 T5 S1 P5 PCjs Change Report: VGA Sequencer

PCjs maps the five VGA sequencer register classes through `0x3C4`/`0x3C5`.
Original TypeScript now retains that project-native bank and its defined bit
widths. The trace controls are project-owned diagnostics only; no PCjs timing,
renderer, firmware, media, or browser implementation is imported.

# M2 T5 S1 P4 PCjs Change Report: VGA Attribute Controller

PCjs maps the VGA attribute-controller index/data flip-flop, palette-enable
bit, register bank, and status-one reset behavior. Original TypeScript now
retains those native register contracts through a narrow existing-status
callback. It imports no PCjs rendering code, fonts, BIOS, media, timing,
browser logic, or framebuffer behavior.

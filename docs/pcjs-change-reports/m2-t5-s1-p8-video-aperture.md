# M2 T5 S1 P8 PCjs Change Report: Video Aperture

PCjs exposes VGA memory through hardware-controlled video windows rather than
ordinary system RAM. Original TypeScript now provides a generic physical-memory
device aperture so native VGA memory can own its address window. The aperture
observes A20 normalization, preserves immutable ROM ownership, and imports no
PCjs runtime, video memory, renderer, firmware, or browser implementation.

# M2 T5 S1 P10 PCjs Change Report: VGA Planar Memory

PCjs models VGA memory as controller-owned planes with latches and register
selected access modes. Original TypeScript now provides an independently
designed four-plane device mapped through the project-native physical-memory
aperture. It imports no PCjs runtime, renderer, fonts, BIOS, media, or browser
implementation.

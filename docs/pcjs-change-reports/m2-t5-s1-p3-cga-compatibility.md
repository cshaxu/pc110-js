# M2 T5 S1 P3 PCjs Change Report: CGA Compatibility

PCjs maps the complete CGA CRTC, mode, color, and status register family as
video compatibility behavior. Original TypeScript now retains that native
state and machine port ownership. It imports no PCjs rendering code, fonts,
BIOS, media, browser logic, or framebuffer behavior.

# M2 T5 S1 P2 PCjs Change Report: MDA Compatibility

PCjs maps the complete MDA CRTC alias family, mode, and status registers as
part of video compatibility behavior. Original TypeScript now retains that
native state and machine port ownership. It imports no PCjs rendering code,
font, BIOS, media, browser logic, or printer behavior.

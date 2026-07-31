# M2 T5 S6 P158 Fast Option-ROM Checkpoint Provenance

## Evidence

After P157's 65,536-boundary cold native-versus-PCjs lockstep match, one
governed Fast Execution probe ran the project-native selected DeskPro profile
for 1,000,000 instructions with the validated local floppy. Its identity is
project `afb0fc95b2b36fd443d3821867ee35599487a829`, PCjs reference
`c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`, and floppy SHA-256
`fadeb3a27c6a0e1cf582dde0b9aecb7e5d30678f2f967f2f4562f167cc0cb1d5`.

## Result

The native trace completed its budget at `C000:020B`, inside the selected IBM
VGA option ROM. The ignored local diagnostic log retains the same identity and
final boundary. No unimplemented boundary, device error, FDC command,
boot-sector read, DOS prompt, or synthetic behavior was observed.

## Boundary

This is one Fast whole-machine checkpoint after a new exact-lockstep baseline.
It is not a long replay, a DOS-boot claim, or authorization for a device or
firmware workaround.

# M2 T5 P29 ROM Service Progress Evidence

The selected DeskPro ROM instruction at `F000:C7D8` is `INT 10h; RET`.
The selected IBM VGA ROM entry at `C000:06E1` is `INT 6Dh; IRET` before its
normal video-service dispatch. Therefore the repeated
`F000:C7D8 -> C000:06E1 -> F000:C7DA` transfer is ordinary video POST service
flow, not a device fault or a self-loop.

With selected local system ROM, IBM VGA ROM, and floppy media, the native
80,000,000-instruction regression completes naturally at `F000:C24B` without
an unmapped-port stop or device exception. The final address is a regular ROM
POST instruction and is not a boot-completion claim.

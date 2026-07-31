# M2 T5 P144 Provenance: DeskPro 4 MiB Memory Correction

The selected M1 source machine is
`machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml` at pinned PCjs
commit `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`. Its `ramExt` aperture starts
at `0x100000` and has size `0x300000`.

P77 incorrectly recorded and implemented only `0x100000` bytes of extended
RAM. P144 corrects the project-native selected-machine factory to the M1
contract while retaining its separate low-RAM and relocatable-RAM apertures.
No ROM, BIOS, guest-memory initialization, PCjs runtime dependency, or
keyboard behavior is added.

A clean browser rerun with the corrected map reached the same `F000:C24B`
keyboard-buffer path with command byte `0x5D`. The configuration mismatch is
therefore corrected independently, but is not presented as the explanation
for the remaining keyboard-path blocker.

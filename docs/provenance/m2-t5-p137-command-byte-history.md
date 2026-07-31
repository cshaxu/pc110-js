# M2 T5 P137 Provenance: PCjs Command-Byte History

Browser whole-machine evidence established a real post-lockstep difference:
native stops with 8042 command byte `0x5D`, while PCjs continues with `0x45`.
The new PCjs `pc110`-branch probe preserves only command-byte changes so the
earlier transition sequence survives a normal reference run.

The project-native emulator is unchanged by the PCjs probe. The probe informs
the next native device correction only after the resulting history is compared
with native 8042 evidence.

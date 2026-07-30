# M2 T5 S1 P2 Verification: MDA Compatibility

Focused tests cover the full alias port group, indexed CRTC data, mode, status,
reset, machine composition, and byte width. The selected trace advances to 224
instructions at `F000:BB36` and stops at CGA mode port `0x3D8`. The full quality
gate must pass before this part is committed.

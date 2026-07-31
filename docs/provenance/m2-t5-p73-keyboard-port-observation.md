# M2 T5 P73 Provenance

- Trigger: the ordinary bounded browser port tail is overwritten by VGA and
  timer traffic before the firmware reaches the keyboard-buffer wait.
- Contract: retain the latest sixteen native accesses to ports `0x60` and
  `0x64` separately in the existing development status snapshot.
- Boundary: this is fixed-memory observation only. It changes no CPU, PIC,
  8042, keyboard, timing, firmware, input, or guest-visible behavior.

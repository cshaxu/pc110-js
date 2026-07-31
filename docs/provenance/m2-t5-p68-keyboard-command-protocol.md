# M2 T5 P68 Provenance

- Trigger: P67's bounded replay and browser observation showed a real keyboard
  event could not complete the selected BIOS setup because native `0x60` data
  writes without a pending 8042 controller command were discarded.
- Behavioral reference: pinned PCjs 8042 command-byte documentation and its
  selected keyboard path; pinned DeskPro ROM code sends `0xED` LED setup and
  `0xF4` scan enable through port `0x60`.
- Contract: the project-native keyboard now acknowledges `0xED` plus its LED
  parameter and `0xF4`/`0xF5`/`0xF6` scan-control commands. Responses still
  use the existing 8042 output buffer and IRQ1 route. No BDA write, firmware
  service, host-time delay, or injected scan code is added.
- Boundary: reset, resend, scan-set selection, typematic, and multi-byte
  keyboard response queuing remain `TODO(High)` until selected-ROM evidence
  requires them.

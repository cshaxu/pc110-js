# NXVM Structure Notes

NXVM is useful to this project as a familiar emulator source-layout reference.

Observed high-level structure:

```text
src/
  main.c
  machine.c
  console.c
  debug.c
  device/
  platform/
  xasm32/
```

Useful ideas for pc110js:

- Keep machine orchestration separate from device implementations.
- Keep platform integration separate from emulated hardware.
- Keep debugger and tracing code as first-class modules.
- Keep assembler, disassembler, and inspection tools outside the core machine loop.
- Keep research, deprecated code, and design notes out of the primary runtime path.

Non-goals:

- Do not port NXVM C code by default.
- Do not copy NXVM platform abstractions directly.
- Do not reproduce NXVM BIOS or DOS shortcuts.

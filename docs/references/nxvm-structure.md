# NXVM Structure Notes

NXVM is a secondary M2 CPU architecture reference. PCjs remains the behavior
and compatibility authority for M1/M2 comparison. PC110-EMU is the authority
for PC110-specific hardware behavior.

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

Useful ideas for pc110-js:

- Keep machine orchestration separate from device implementations.
- Keep platform integration separate from emulated hardware.
- Keep debugger and tracing code as first-class modules.
- Keep assembler, disassembler, and inspection tools outside the core machine loop.
- Keep research, deprecated code, and design notes out of the primary runtime path.
- Model 32-bit general registers, visible segment selectors and hidden segment
  caches, descriptor tables, task-related state, control registers, debug
  registers, paging state, and page-fault data explicitly.
- Keep decoding, instruction dispatch, protected-mode control, memory/I/O
  boundaries, interrupt injection, and trace/state-dump hooks separately
  testable.
- Use an opcode coverage matrix and deterministic trace records for focused
  PCjs comparison.

Reference boundary:

- `src/device/vcpu.h` and `src/device/vcpuins.c` may inform TypeScript module
  boundaries, data-model completeness, and debugging capability.
- Active NXVM code is not a behavior authority; its 80386 coverage and edge
  behavior require PCjs-based verification.
- `doc/code/deprecated/cpu/vcpu_i386` is excluded from implementation research.

Non-goals:

- Do not port NXVM C code by default.
- Do not copy NXVM platform abstractions directly.
- Do not reproduce NXVM BIOS or DOS shortcuts.
- Do not introduce guest services, POST helpers, or interrupt-service shortcuts
  into M2 execution paths.

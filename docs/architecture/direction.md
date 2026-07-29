# Architecture Direction

`pc110js` is a standalone TypeScript emulator project. It should not be a thin wrapper around the PCjs website tree, and it should not become a raw fork-shaped copy of the PCjs repository.

## Source Strategy

PCjs is the primary implementation source for mature PC/AT-compatible emulator behavior. The project will migrate PCjs behavior into the pc110js source layout in controlled subsystem-sized steps.

The migration goal is not to preserve PCjs file layout. The goal is to preserve useful behavior while making the resulting codebase natural for this project.

## Early Machine Target

The first emulator target is a complete bootable 486-class PC/AT virtual machine. This target should boot a known-good DOS disk image before PC110-specific hardware work becomes the dominant activity.

This baseline is the safety rail for later PC110 bring-up.

## Implementation Language

TypeScript is the implementation language for emulator code. Plain JavaScript should be limited to scripts, configuration, generated compatibility shims, or tool requirements that cannot reasonably use TypeScript.

## Layout Inspiration

NXVM is useful as a source-organization reference. Its structure separates the emulator into entry/control code, machine logic, device modules, platform code, debugger code, and assembler/disassembler tooling.

`pc110js` should use similar conceptual boundaries, adapted for browser-first TypeScript:

```text
src/
  core/
  machine/
  bus/
  cpu/
  memory/
  devices/
  platform/
  debugger/
  tools/
  profiles/
  assets/
```

This layout is a starting point, not a fixed contract. It should evolve only when real integration work justifies a change.

## Migration Rules

- Migrate by subsystem.
- Record provenance for each imported subsystem.
- Preserve behavior first; clean up second.
- Keep behavior changes separate from mechanical TypeScript adaptation.
- Add tests and smoke checks around each migrated subsystem as soon as practical.
- Keep PCjs license and attribution requirements visible.

# Architecture Direction

## Product Boundary

`pc110-js` is a standalone browser-first TypeScript emulator. It owns its build, runtime, UI, tests, configuration, and release model. Sibling repositories are read-only references and are not runtime dependencies of a released build.

## Boot-Preserving Migration

The project uses vertical migration:

1. Run an unmodified PCjs PCx86 v2 machine and boot the known-good DOS disk.
2. Record the exact PCjs commit, machine configuration, assets, command, expected markers, and proof.
3. Import the smallest complete PCjs dependency closure into the pc110-js source layout.
4. Prove the migrated browser runtime reaches the same DOS result.
5. Publish and manually verify `QUICKSTART.md` immediately.
6. Convert one coherent module group at a time to TypeScript.
7. Rerun the golden boot after every migration increment.
8. Introduce the PC110 profile only after the generic baseline is stable.

This keeps a whole-machine result available early. CPU-first and device-first work is allowed only inside an already bootable vertical baseline.

## CPU Scope

PCjs PCx86 v2 explicitly supports CPU models through the 80386. The generic golden machine therefore uses a supported 80386 configuration.

The IBM Palm Top PC 110 requires 486SX/SL-compatible behavior. That behavior is implemented as an explicit delta over the proven PCjs core and must be driven by firmware traces or conformance tests. Passing `80486` as a numeric model to code that only defines `80386` is not evidence of complete 80486 support.

The initial PC110 CPU delta is limited to:

- reset state and reset alias behavior required by the dumped firmware;
- 486 instructions actually reached by firmware or guest tests;
- control-register and exception semantics demonstrated to differ from the PCjs 80386 baseline;
- timing behavior only where correctness depends on it.

Complete 80486 conformance is outside the initial boot goal unless separately approved and planned.

## Source Layout

The expected layout is:

```text
src/
  app/
  core/
  cpu/
  memory/
  bus/
  devices/
  machine/
  profiles/
  platform/
  debugger/
  tools/
  pcjs/
tests/
docs/
local-assets/
```

`src/pcjs/` is a migration staging area for provenance-tracked PCjs source. Mechanically converted modules should move into the natural project boundary only when tests protect their behavior. The layout may evolve when real integration work justifies it.

## Device Boundaries

- The machine profile selects device implementations and owns machine wiring.
- A registry may select generic PC/AT or PC110-specific variants.
- Adapters isolate PCjs lifecycle, bus, timing, memory, and browser assumptions from local contracts.
- Standard PC/AT behavior remains PCjs-derived unless evidence shows it cannot meet the goal.
- PC110 wrappers own PC110-specific wiring and quirks without duplicating generic cores.
- Unknown I/O remains traceable and explicit; it is not silently converted into successful behavior.

## Runtime Boundaries

- Browser UI and emulator execution are separate modules.
- Headless execution uses the same machine core as the browser.
- Host time, scheduling, file selection, rendering, and audio are platform services.
- Emulated time must be deterministic in tests and must not depend directly on wall-clock time.
- Protected assets are loaded through explicit local configuration and validated by size and hash.

## Evidence Boundary

PCjs is primary for standard PC/AT implementation. Real hardware, dumped firmware behavior, and reliable hardware documentation are primary for PC110-specific behavior. PC110-EMU and previous attempts provide supporting evidence and investigation leads. See [the evidence policy](../governance/evidence-policy.md).

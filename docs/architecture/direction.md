# Architecture Direction

## Product Boundary

`pc110-js` is a standalone browser-first TypeScript emulator. It owns its build, runtime, UI, tests, configuration, and release model. Sibling repositories are read-only references and are not runtime dependencies after the standalone TypeScript baseline is complete.

## Four Delivery Nodes

### 1. PCjs Reference Integration

The project first proves the source reference:

1. Pin PCjs and select PCx86 v2.
2. Select the smallest existing, complete 80386 PC/AT machine that can boot the known-good DOS floppy.
3. Add project-owned commands or a harness that refer to `../pcjs` through relative paths.
4. Boot DOS without modifying or copying PCjs runtime source.
5. Record the exact machine, dependency closure, assets, commands, and observable result.

This is a reference baseline. It proves what must be preserved, but it is not the pc110-js golden implementation.

### 2. Standalone TypeScript 386 Golden Baseline

The project then studies PCjs behavior and implements the required machine inside this repository:

- complete 80386 instruction execution required by the selected baseline;
- physical memory, ROM, RAM, paging, and A20 behavior;
- I/O bus and machine lifecycle;
- PIC, PIT, DMA, RTC/CMOS, system ports, and 8042 behavior;
- floppy and required fixed-storage behavior;
- VGA display and keyboard input;
- deterministic clocking, tracing, browser presentation, and headless execution.

The result must be a clean TypeScript runtime organized around pc110-js boundaries. It must not depend on a copied PCjs JavaScript runtime, a vendor-shaped PCjs tree, or sibling `../pcjs` at runtime.

This is not a legal clean-room implementation. PCjs source is intentionally studied and its behavior may be derived or adapted. Every derived subsystem therefore retains provenance, attribution, and MIT obligations.

M2 is complete only when this standalone TypeScript machine boots the same DOS floppy, matches the M1 reference markers, and provides a manually verified root-level `QUICKSTART.md`.

### 3. High-ROI PC110 Integration

High-ROI means behavior that materially advances or enables:

- PC110 reset and ROM execution;
- POST progress;
- boot-device discovery and DOS boot;
- usable display;
- usable keyboard or pointing input.

PC110 support is added as profile-selected variants behind interfaces already exercised by the generic machine. The generic M2 implementation remains registered and selectable for every replaced device.

### 4. Medium- And Low-ROI PC110 Integration

After the PC110 boot and usability baseline is secure, remaining features are added by evidence and value. Examples include advanced PCMCIA behavior, power management, audio, infrared, modem, memo-pad behavior, and special controls.

The same registry and profile mechanism must support future machine-specific hardware and ROMs. No interface should encode PC110 assumptions when the behavior belongs in a profile or variant.

## CPU Scope

PCjs PCx86 v2 explicitly supports CPU models through the 80386. M2 therefore delivers a complete minimal 80386 CPU suitable for the selected PC/AT machine.

The IBM Palm Top PC 110 requires 486SX/SL-compatible behavior. M3 introduces that behavior through an explicit CPU variant or bounded delta driven by firmware traces and conformance tests. Passing `80486` as a numeric model to code that defines support only through `80386` is not an implementation.

Complete general-purpose 80486 conformance remains outside the initial PC110 goal unless separately approved.

## Device Selection

The selection path is:

```text
Machine Profile -> Device Registry -> Device Interface -> Device Variant
```

Rules:

- M2 registers every generic 80386 PC/AT implementation as the default variant.
- M3 and M4 add PC110 variants without editing generic behavior in place.
- A profile selects variants, ROMs, memory maps, I/O ownership, and wiring.
- A mixed profile may select generic implementations for unchanged hardware and PC110 variants only where required.
- Tests must be able to instantiate the generic profile independently from every PC110 profile.
- Interfaces remain minimal and grow only when a second real implementation requires a new contract.

## Source Layout

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
tests/
docs/
local-assets/
```

PCjs-derived TypeScript belongs in the natural project subsystem, accompanied by provenance records. A permanent `vendor/pcjs` runtime tree is not part of the target architecture.

## Runtime Boundaries

- Browser UI and emulator execution are separate modules.
- Headless execution uses the same machine core as the browser.
- Host time, scheduling, file selection, rendering, and audio are platform services.
- Emulated time is deterministic in tests and does not depend directly on wall-clock time.
- Protected assets are loaded through explicit local configuration and validated by size and hash.

## Evidence Boundary

PCjs is primary for standard PC/AT implementation. Real hardware, dumped firmware behavior, and reliable hardware documentation are primary for PC110-specific behavior. PC110-EMU and previous attempts provide supporting evidence and investigation leads. See [the evidence policy](../governance/evidence-policy.md).

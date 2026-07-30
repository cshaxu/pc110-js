# Project Breakdown

This is the canonical work breakdown for `pc110-js`.

```text
Milestone -> Task -> Subtask -> Part
```

Commit subjects use:

```text
M<milestone> T<task> S<subtask> P<part>: <description>
```

Parts are implementation commits within a subtask. Completion is governed by [execution-policy.md](execution-policy.md), and current state is recorded in [status.md](status.md).

## Direction Rebaseline

Before emulator implementation began, the owner corrected the delivery model. The previous M1-M13 roadmap is superseded by the four primary delivery nodes below. This owner-authorized correction is recorded as M0 T3 S1 P2. M0-M5 identifiers are frozen after that commit.

Primary delivery nodes:

1. M1: PCjs Reference Integration.
2. M2: Standalone TypeScript 386 Golden Baseline.
3. M3: High-ROI PC110 Integration.
4. M4: Medium- And Low-ROI PC110 Integration.

M0 provides governance. M5 provides preservation-grade release packaging.

## Reference And Evidence Rules

Repository consultation order is PCjs, PC110-EMU, pc110js-v2, pc110js-v1, then
NXVM, except for the owner-authorized M2 T2 CPU baseline correction recorded in
`docs/decisions/m2-t2-nxvm-cpu-authority.md`. For that CPU work, NXVM coverage
and validated execution behavior are the decisive implementation baseline, and
PCjs remains the PC/AT compatibility and whole-machine reference. NXVM BIOS,
POST, device, I/O,
global-state, macro, and guest-service code remains excluded. Evidence
authority is domain-specific:

- Standard PC/AT behavior: PCjs PCx86 v2 is the primary implementation source.
- PC110 behavior: real hardware, dumped firmware behavior, and reliable hardware documentation are primary.
- PC110-EMU and previous attempts: supporting evidence and investigation leads only.

See [evidence-policy.md](../governance/evidence-policy.md).

## M0: Governance And Project Foundation

Goal: make autonomous execution bounded, reproducible, legally traceable, and resistant to direction drift.

### T0: Project Rules

- S1: Define English-only artifact rules.
- S2: Define TypeScript runtime implementation rules.
- S3: Define the M/T/S/P commit hierarchy.
- S4: Define verified-subtask commit and push rules.
- S5: Define prioritized TODO rules.
- S6: Define read-only reference and PCjs change-report rules.
- S7: Define licensing and protected-media rules.

### T1: Baseline Records

- S1: Record the PCjs upstream Git baseline.
- S2: Record the PC110-EMU Git and local working-snapshot baseline.
- S3: Record the pc110js-v2 hash-based snapshot.
- S4: Record the pc110js-v1 hash-based snapshot.
- S5: Record the NXVM structure-reference baseline.
- S6: Record the known-good local DOS floppy identity without committing it.

### T2: Architecture Direction

- S1: Define the standalone product boundary.
- S2: Define domain-specific source authority.
- S3: Define the PCjs reference-to-TypeScript assimilation path.
- S4: Define the canonical milestone roadmap.
- S5: Define provenance, evidence, and PCjs change-report templates.

### T3: Pre-Goal Setup Audit

- S1: Correct planning conflicts and missing governance artifacts, apply the owner-authorized four-node direction correction, add durable root agent guidance, add task tracking, require an M1 browser reference run, add milestone snapshot branches, and add committed goal specifications.

Completion gate:

- Governance, license, third-party notices, baseline records, templates, canonical breakdown, and status record are committed.
- No protected image or emulator implementation source is tracked.
- M0-M5 identifiers are frozen.
- M1-M5 snapshot-branch rules are committed.

## M1: PCjs Reference Integration

Goal: make this project reproducibly launch, run, and validate the pinned sibling PCjs implementation in a browser through relative references, without copying or modifying PCjs runtime source.

### T1: Reference Contract

- S1: Select PCjs PCx86 v2 as the implementation reference generation.
- S2: Verify the pinned PCjs commit and read-only sibling path.
- S3: Record that the highest supported generic CPU model is 80386.
- S4: Define the project-owned reference-run boundary and relative path resolution.

### T2: Minimal Complete 386 Machine Selection

- S1: Select one existing PCjs 80386 PC/AT machine configuration.
- S2: Inventory every configured hardware device and required source module.
- S3: Inventory BIOS, ROM, disk, configuration, browser, and build dependencies.
- S4: Reject machine candidates that require unrelated PCjs website or archive content.
- S5: Record the exact reference machine contract that M2 must implement.

### T3: Project-Owned Reference Runner

- S1: Add a TypeScript project runner or project-owned command that serves and starts the selected sibling PCjs machine in a browser.
- S2: Resolve `../pcjs` and local media through relative configuration.
- S3: Fail clearly when the sibling commit, required source, or local assets do not match.
- S4: Keep the sibling checkout read-only during every run.

### T4: Reference DOS Boot

- S1: Attach the known-good DOS floppy read-only.
- S2: Reach BIOS startup and boot-sector loading.
- S3: Reach the DOS prompt in the browser.
- S4: Record deterministic or observable boot markers.
- S5: Capture compact manual browser proof and exact commands.
- S6: Add and manually verify `docs/quickstart/m1-reference.md`.

### T5: Reference Mapping

- S1: Map PCjs CPU and instruction modules to M2 destinations.
- S2: Map memory, bus, machine, and timing modules.
- S3: Map chipset, interrupt, timer, DMA, RTC, and system-port modules.
- S4: Map storage, video, keyboard, and browser integration modules.
- S5: Record license boundaries and excluded archival assets.

Completion gate:

- A command owned by pc110-js serves and opens the pinned sibling PCjs implementation in a browser.
- The selected complete 80386 PC/AT machine boots the known-good DOS floppy to a visible DOS prompt in that browser.
- The complete configured hardware and source dependency closure is recorded.
- The owner can reproduce the reference-mode browser run by following the
  manually verified `docs/quickstart/m1-reference.md` procedure.
- No PCjs runtime source was copied or modified.
- The result is named the M1 PCjs reference baseline, not the pc110-js golden implementation.

## M2: Standalone TypeScript 386 Golden Baseline

Goal: implement a clean, complete, standalone TypeScript version of the selected 80386 PC/AT machine inside this repository and boot the same DOS floppy without a runtime dependency on PCjs.

### T1: Architecture And Variant Foundation

- S1: Pin the Node.js, package-manager, TypeScript, build, test, lint, and format toolchain.
- S2: Add browser and headless entry points using the same machine core.
- S3: Define machine profile, device registry, device interface, and device variant contracts.
- S4: Define deterministic emulated time and host scheduling boundaries.
- S5: Define relative local-asset configuration with size and SHA-256 validation.
- S6: Register the generic `pc-at-386` profile as the default machine family.

### T2: TypeScript CPU, Memory, And Bus

- S1: Implement the PCjs-supported 80386 CPU state and reset model in TypeScript.
- S2: Implement real, protected, virtual-8086, and paging behavior required by the PCjs-supported 80386 model.
- S3: Implement all supported opcode families, exceptions, interrupts, and privilege behavior with focused conformance coverage.
- S4: Implement physical memory, RAM, ROM, shadowing where selected, A20, and memory access contracts.
- S5: Implement I/O port dispatch, machine reset, deterministic stepping, and trace hooks.
- S6: After S3, S4, and S5 close, establish the final PCjs-assisted CPU
  integration gate: run the project-native rebuilt CPU as the sole executing
  CPU against temporary read-only PCjs device adapters, boot the M1 browser
  workload, and record CPU/memory/I-O comparison evidence without creating a
  product runtime dependency.

#### Authorized Dependency Correction (2026-07-29)

M2 T2 S3 paused after P16 because its verified reset-ROM trace reaches a far
jump into low RAM. The owner authorized a bounded S4 preemption: first record
the dependency, adopt the project module boundaries, and implement only the
physical-memory, A20, and ROM-mapping capability needed for that trace. Re-run
the trace through the new layout before resuming S3. This changes execution
order only; it does not reduce, replace, or relax any M2 completion criterion.

### T3: TypeScript Core PC/AT Hardware

Entry gate: M2 T2 S6 must prove that the rebuilt CPU, not the PCjs CPU, drives
the M1 browser workload through the PCjs-assisted verification harness. Every
native device introduced below replaces one declared PCjs proxy or tightly
coupled group and must preserve the same workload before its proxy is retired.

- S1: Implement master and slave 8259A-compatible PIC variants.
- S2: Implement 8253/8254-compatible PIT and speaker timing.
- S3: Implement 8237-compatible DMA controllers and page registers.
- S4: Implement RTC/CMOS and selected-machine configuration state.
- S5: Implement system ports, NMI, reset, and A20 glue.
- S6: Implement the selected 8042 and keyboard-controller behavior.
- S7: Verify BIOS POST checkpoints through real device paths.

### T4: TypeScript Storage Hardware

- S1: Implement the selected floppy controller and drive behavior.
- S2: Implement raw floppy image attachment without filesystem or DOS knowledge.
- S3: Implement selected fixed-storage hardware if present in the M1 machine contract.
- S4: Implement IRQ, DMA, command, result, error, and write-protect behavior required by the selected devices.
- S5: Verify BIOS boot-sector reads through emulated hardware.

### T5: TypeScript Video, Input, And Platform Presentation

- S1: Implement the selected VGA or display hardware and video memory behavior.
- S2: Render the hardware framebuffer through a browser-owned presentation layer.
- S3: Implement keyboard scan-code and controller delivery through the selected hardware path.
- S4: Map browser input without placing browser assumptions in device cores.
- S5: Implement every additional configured M1 device without placeholders.
- S6: Add structured trace, status, and error presentation.

### T6: Whole-Machine Golden Acceptance

- S1: Assemble the complete `pc-at-386` profile entirely from TypeScript runtime modules.
- S2: Boot the known-good DOS floppy to a prompt in headless and browser-capable workflows where feasible.
- S3: Match the defined M1 reference boot markers.
- S4: Add generic whole-machine regression commands.
- S5: Verify no runtime import or path depends on `../pcjs`.
- S6: Add and manually verify root-level `QUICKSTART.md`.
- S7: Record the golden baseline proof, limitations, and performance envelope.

### T7: Assimilation And License Audit

- S1: Complete a provenance record for every PCjs-derived subsystem.
- S2: Verify runtime implementation files are TypeScript except documented unavoidable tooling exceptions.
- S3: Verify project-native module names, boundaries, lifecycle, and contracts.
- S4: Verify PCjs copyright, MIT license, and third-party notices.
- S5: Verify no PCjs archival programs, ROMs, disks, images, or third-party documentation were copied.

Completion gate:

- The complete selected 80386 PC/AT machine is implemented inside pc110-js in TypeScript.
- Every configured hardware device has a real hardware model; no placeholder or guest-service shortcut is active.
- The machine boots the known-good DOS floppy to a prompt.
- The runtime has no dependency on `../pcjs` or copied PCjs JavaScript.
- The PCjs-assisted integration harness has proven the rebuilt CPU as the sole
  executing CPU against the M1 browser workload before native hardware
  migration, and every temporary PCjs proxy is replaced before M2 closes.
- Generic devices are registered as selectable default variants.
- The M1 reference result remains reproducible for comparison.
- `QUICKSTART.md` is short, complete, and manually verified in a browser.
- M2 becomes the pc110-js golden regression baseline.

## M3: High-ROI PC110 Integration

Goal: add all PC110 behavior needed for real ROM execution, POST, boot, display, input, and basic browser usability while preserving the complete M2 generic machine.

### T1: PC110 Profile And ROM Boundary

- S1: Define the PC110 machine profile, ROM identities, RAM, memory map, I/O ownership, and wiring.
- S2: Add local firmware loading with size and SHA-256 validation.
- S3: Map the PC110 BIOS, reset alias, and required ROM windows.
- S4: Verify reset-vector bytes and the first firmware control transfer.
- S5: Keep the M2 `pc-at-386` profile independently runnable.

### T2: PC110 CPU And Boot Platform Variants

- S1: Define evidence-backed 486SX/SL reset-state and instruction differences.
- S2: Add a PC110 CPU variant or bounded delta without claiming complete 80486 support.
- S3: Add high-ROI memory, chipset, CMOS, reset, A20, interrupt, timer, and DMA variants.
- S4: Register every variant beside its M2 generic implementation.
- S5: Add focused evidence, conformance, and generic-regression tests.

### T3: PC110 Boot Storage Variants

- S1: Identify the ROM-visible floppy, fixed, removable, and PCMCIA boot paths.
- S2: Add high-ROI controller, socket, bridge, and storage variants.
- S3: Reach hardware-issued boot-sector access without BIOS or DOS shortcuts.
- S4: Keep generic M2 FDC and storage implementations selectable.
- S5: Record unresolved nonblocking storage behavior for M4.

### T4: PC110 Display And Input Variants

- S1: Add the display behavior required for ROM progress and usable output.
- S2: Add keyboard, pointer, and controller behavior required for boot and basic use.
- S3: Keep browser presentation and events outside hardware variants.
- S4: Keep generic M2 display and input implementations selectable.
- S5: Add framebuffer, keyboard, pointer, and ROM-checkpoint tests.

### T5: PC110 Boot And Usability Acceptance

- S1: Advance real firmware through POST using one classified blocker at a time.
- S2: Reach firmware boot-device selection and boot-sector loading.
- S3: Reach the DOS prompt through emulated PC110 hardware.
- S4: Add deterministic PC110 boot markers and a noninteractive smoke command where feasible.
- S5: Add profile switching to `QUICKSTART.md` and verify both generic and PC110 procedures.
- S6: Capture compact manual browser proof.

Completion gate:

- All high-ROI PC110 modules required for boot and basic use are integrated as variants.
- The PC110 profile boots DOS through real firmware and hardware paths.
- Every replaced device can be switched back to the M2 generic implementation through profile configuration.
- The generic M2 golden regression remains green.
- Unknown medium- and low-ROI behavior remains explicit and traceable.

## M4: Medium- And Low-ROI PC110 Integration

Goal: complete remaining PC110 hardware by evidence and value while proving that the profile and variant architecture remains suitable for future machines.

### T1: Extended Storage And PCMCIA

- S1: Complete non-boot-critical PCMCIA controller, socket, card, and memory-window behavior.
- S2: Expand removable and fixed-storage compatibility.
- S3: Add hot-plug, write, error, and edge-case behavior where hardware supports it.
- S4: Preserve generic and M3 boot regressions.

### T2: Audio And Speaker

- S1: Complete PC speaker behavior required beyond M2.
- S2: Add PC110 audio-controller and compatible sound variants.
- S3: Keep Web Audio presentation outside hardware cores.
- S4: Add register, timing, and browser-output checks.

### T3: Power And Platform Features

- S1: Add power-management and status-controller behavior.
- S2: Add suspend, resume, battery, and setup behavior supported by evidence.
- S3: Add save and restore after deterministic state boundaries are proven.
- S4: Add platform tests and real-hardware comparisons.

### T4: Optional PC110 Devices And Controls

- S1: Add infrared behavior.
- S2: Add modem behavior.
- S3: Add memo-pad and special input behavior.
- S4: Add remaining documented PC110 devices by evidence and ROI.

### T5: Real Hardware Validation

- S1: Define reproducible emulator-versus-hardware observation records.
- S2: Validate boot, reset, storage, display, input, audio, and platform behavior.
- S3: Track confirmed differences with evidence levels.
- S4: Resolve release-blocking differences and document remaining limitations.

### T6: Future Machine Extensibility

- S1: Audit interfaces for accidental PC110-specific assumptions.
- S2: Verify ROM, memory map, I/O ownership, wiring, and variants are profile-selected.
- S3: Verify generic and PC110 profiles can coexist in one build.
- S4: Document how a future machine profile adds ROMs and hardware variants.
- S5: Avoid implementing a speculative third machine solely to prove abstraction.

Completion gate:

- Medium- and low-ROI PC110 modules are integrated or explicitly documented as unsupported with evidence.
- Generic and PC110 variants remain selectable and independently testable.
- Interfaces contain no avoidable PC110 assumptions.
- Real-hardware validation and known limitations are documented.
- Future machine profiles can add ROMs, wiring, and variants without replacing existing implementations.

## M5: Release And Preservation Documentation

Goal: make the verified project independently buildable, inspectable, and distributable.

### T1: User Documentation

- S1: Finalize Quick Start, build, asset, run, profile-selection, and troubleshooting guides.
- S2: Document supported browsers, profiles, media, and limitations.
- S3: Verify fresh-clone generic and PC110 browser runs.

### T2: Developer Documentation

- S1: Document architecture, profiles, registry, interfaces, and variants.
- S2: Publish provenance, evidence, and PCjs change-report indexes.
- S3: Document tracing, testing, and hardware-validation workflows.
- S4: Document the future machine-profile workflow.

### T3: License And Attribution

- S1: Audit PCjs attribution and MIT notice preservation.
- S2: Audit third-party source and asset licensing.
- S3: Verify protected media is absent.
- S4: Complete the release checklist.

### T4: Release Packaging

- S1: Verify clean install, build, tests, and browser demos.
- S2: Verify M1 reference, M2 generic, and M3/M4 PC110 regressions.
- S3: Produce versioned release notes and known limitations.
- S4: Tag the verified release.

Completion gate:

- A fresh clone can build and run using only documented local asset placement.
- Generic 386 and PC110 profiles are selectable from the same project.
- License, attribution, provenance, evidence, and known limitations are complete.

# Project Breakdown

This document defines the working breakdown for `pc110js`.

Hierarchy:

```text
Milestone -> Task -> Subtask -> Part
```

Commit subjects use this format:

```text
M<milestone> T<task> S<subtask> P<part>: <description>
```

Part numbers belong to commits or small implementation slices and are not expanded here unless a subtask needs finer planning.

## Reference Priority

Implementation decisions should use references in this order:

1. PCjs.
2. PC110-EMU.
3. pc110js-v2.
4. pc110js-v1.
5. NXVM.

Use PCjs as the primary implementation source for mature PC/AT behavior. Use PC110-EMU as a behavioral oracle for PC110-specific behavior. Use pc110js-v2 as a source of lessons and evidence from prior deep investigations. Use pc110js-v1 and NXVM only as lower-priority references, with NXVM mainly informing source organization.

## M0: Governance And Project Foundation

### T0: Project Rules

- S1: Define English-only artifact rules.
- S2: Define TypeScript-first implementation rules.
- S3: Define commit format rules.
- S4: Define verified-subtask push rules.
- S5: Define TODO priority rules.
- S6: Define PCjs provenance and migration rules.
- S7: Define protected media and license rules.

### T1: Repository Setup

- S1: Initialize the standalone `pc110js` repository.
- S2: Create the GitHub remote repository.
- S3: Record the PCjs upstream baseline.
- S4: Record the NXVM structure-reference baseline.
- S5: Create the initial `src/`, `docs/`, and planning layout.

### T2: Architecture Direction

- S1: Define the standalone TypeScript project direction.
- S2: Define the PCjs subsystem migration strategy.
- S3: Define the NXVM-inspired source layout.
- S4: Define the milestone-level roadmap.
- S5: Define the provenance record template.

## M1: TypeScript Runtime Shell

### T1: Build System

- S1: Add `package.json`.
- S2: Add TypeScript configuration.
- S3: Add bundler and development-server setup.
- S4: Add test runner setup.
- S5: Add lint and formatting checks.

### T2: Runtime Entry Points

- S1: Add a browser entry point.
- S2: Add a headless Node entry point.
- S3: Add a shared emulator lifecycle shell.
- S4: Add configuration loading.
- S5: Add asset path resolution without absolute local paths.

### T3: UI Skeleton

- S1: Add a minimal emulator page.
- S2: Add a screen container.
- S3: Add run, pause, and reset controls.
- S4: Add a log and trace panel.
- S5: Add configured asset loading or disk image selection.

### T4: Verification

- S1: Add a build smoke test.
- S2: Add a browser page smoke test.
- S3: Add a headless CLI smoke test.
- S4: Add CI-ready script names.
- S5: Push the verified runtime-shell baseline.

## M2: PCjs Subsystem Inventory And Migration Plan

### T1: PCjs Source Inventory

- S1: Identify CPU sources.
- S2: Identify memory and bus sources.
- S3: Identify machine orchestration sources.
- S4: Identify BIOS and ROM loading sources.
- S5: Identify essential PC/AT device sources.
- S6: Identify debugger and trace hook sources.

### T2: Minimal 486 Machine Definition

- S1: Define the target CPU level.
- S2: Define required RAM behavior.
- S3: Define required BIOS and ROM paths.
- S4: Define required floppy or storage boot paths.
- S5: Define required display paths.
- S6: Define required input paths.

### T3: Migration Order

- S1: Define CPU and memory import order.
- S2: Define bus and interrupt import order.
- S3: Define timer and DMA import order.
- S4: Define storage import order.
- S5: Define video and input import order.
- S6: Define machine assembly import order.

### T4: Provenance And License

- S1: Create the provenance template.
- S2: Create the migrated-code attribution location.
- S3: Record PCjs MIT license handling.
- S4: Define the local-change report format.
- S5: Verify that protected media is not committed.

## M3: Core 486 CPU And Memory

### T1: CPU Migration

- S1: Import and adapt the PCjs CPU core into the TypeScript layout.
- S2: Preserve source provenance.
- S3: Establish typed CPU state.
- S4: Establish reset and stepping APIs.
- S5: Add CPU trace hooks.

### T2: Memory Migration

- S1: Import and adapt the memory model.
- S2: Add a typed physical memory API.
- S3: Add ROM and RAM mapping support.
- S4: Add memory trace hooks.
- S5: Add bounds and contract tests.

### T3: Core Execution Loop

- S1: Add the machine clock and step loop.
- S2: Add run, pause, and reset lifecycle operations.
- S3: Add exception and fault reporting.
- S4: Add deterministic stepping mode.
- S5: Add a headless stepping smoke test.

### T4: Core Verification

- S1: Add simple instruction execution checks.
- S2: Add reset-state checks.
- S3: Add memory mapping checks.
- S4: Compare selected behavior against the PCjs baseline.
- S5: Push the verified core baseline.

## M4: Essential PC/AT Devices

### T1: Bus And Interrupts

- S1: Migrate and adapt I/O port dispatch.
- S2: Migrate and adapt PIC behavior.
- S3: Migrate and adapt IRQ wiring.
- S4: Add typed device registration.
- S5: Add I/O trace output.

### T2: Timers And DMA

- S1: Migrate and adapt PIT behavior.
- S2: Migrate and adapt DMA controller behavior.
- S3: Add timing integration with the machine loop.
- S4: Add timer trace hooks.
- S5: Add contract tests.

### T3: Storage Boot Path

- S1: Migrate and adapt the floppy controller.
- S2: Add disk image loading.
- S3: Add read-only boot image mode.
- S4: Add storage trace hooks.
- S5: Add a boot-sector read smoke test.

### T4: Video And Input

- S1: Migrate and adapt the minimal display path needed for DOS.
- S2: Add screen-buffer presentation to a browser canvas.
- S3: Migrate and adapt the keyboard controller path.
- S4: Add browser keyboard input mapping.
- S5: Add display and input smoke checks.

### T5: BIOS And ROM Integration

- S1: Define BIOS asset loading.
- S2: Map BIOS ROM into memory.
- S3: Add missing-asset diagnostics.
- S4: Add reset-vector verification.
- S5: Add BIOS startup trace.

## M5: Bootable 486-Class PC/AT VM

### T1: Machine Assembly

- S1: Assemble CPU, memory, bus, and devices into a `pc-at-486` profile.
- S2: Add a profile configuration schema.
- S3: Add profile-specific asset requirements.
- S4: Add browser launch support.
- S5: Add headless launch support.

### T2: DOS Boot

- S1: Load the known-good DOS floppy image.
- S2: Reach BIOS boot-sector loading.
- S3: Reach the DOS startup path.
- S4: Reach the DOS prompt.
- S5: Capture proof logs or screenshots.

### T3: Regression Harness

- S1: Add a baseline boot smoke command.
- S2: Add expected trace markers.
- S3: Add asset presence checks.
- S4: Add a noninteractive regression script.
- S5: Document the verification procedure.

### T4: Stabilization

- S1: Remove accidental debug noise.
- S2: Document known limitations.
- S3: Verify clean clone setup.
- S4: Verify that protected media is not committed.
- S5: Push the verified 486 VM baseline.

## M6: PC110 Profile Skeleton

### T1: PC110 Machine Profile

- S1: Add a `pc110` profile.
- S2: Add PC110 asset declarations.
- S3: Add PC110 missing-asset diagnostics.
- S4: Add PC110-specific trace categories.
- S5: Keep the `pc-at-486` baseline isolated.

### T2: PC110 ROM Loading

- S1: Define PC110 ROM placement.
- S2: Load PC110 BIOS and ROM assets from local paths.
- S3: Verify reset-vector behavior.
- S4: Capture the first execution trace.
- S5: Document the first blocker.

### T3: PC110 Device Registry

- S1: Define the device variant registry.
- S2: Allow profile-level device selection.
- S3: Add a placeholder PC110 chipset or platform device.
- S4: Add a trace-only unknown I/O handler.
- S5: Add TODO priority markers for deferred behavior.

## M7: PC110 ROM Trace Bring-Up

### T1: Trace Infrastructure

- S1: Add structured ROM execution trace.
- S2: Add I/O port trace.
- S3: Add memory map trace.
- S4: Add IRQ and DMA trace.
- S5: Add trace export.

### T2: First POST Path

- S1: Run PC110 ROM until the first blocker.
- S2: Classify the blocker by subsystem.
- S3: Compare with PC110-EMU behavior.
- S4: Compare with available hardware notes.
- S5: Record evidence and decisions.

### T3: Bring-Up Queue

- S1: Convert blockers into prioritized tasks.
- S2: Mark boot-blocking behavior as high priority.
- S3: Mark interesting nonblocking behavior as low priority.
- S4: Preserve the `pc-at-486` regression baseline.
- S5: Push the verified trace baseline.

## M8: Boot-Blocking PC110 Platform Migration

### T1: PC110 Chipset Basics

- S1: Implement only trace-backed chipset registers.
- S2: Add provenance and evidence notes.
- S3: Add device contract tests.
- S4: Re-run ROM traces.
- S5: Document remaining blockers.

### T2: PC110 BIOS Expectations

- S1: Implement required platform responses.
- S2: Avoid fake DOS or BIOS shortcuts.
- S3: Add trace-backed TODOs for incomplete behavior.
- S4: Verify no standard PC regression.
- S5: Push the verified chipset step.

### T3: PC110 Storage Path

- S1: Identify the PC110-relevant boot storage path.
- S2: Implement boot-blocking storage behavior.
- S3: Verify boot-sector access.
- S4: Advance toward DOS loading.
- S5: Document storage limitations.

## M9: PC110 Bootable Baseline

### T1: PC110 DOS Boot

- S1: Boot with the PC110 ROM and profile as far as possible.
- S2: Resolve boot-blocking device gaps.
- S3: Reach DOS startup.
- S4: Reach the DOS prompt if feasible.
- S5: Capture proof logs or screenshots.

### T2: Regression

- S1: Add a PC110 boot smoke command.
- S2: Preserve the 486 PC/AT smoke command.
- S3: Add trace diff markers.
- S4: Document required local assets.
- S5: Push the verified PC110 boot baseline.

## M10: PC110 Usability

### T1: Display

- S1: Implement PC110-relevant display behavior needed for usability.
- S2: Verify browser rendering.
- S3: Add screenshot checks.
- S4: Document visual limitations.
- S5: Preserve baseline boot.

### T2: Input

- S1: Implement keyboard behavior.
- S2: Implement pointing or special input behavior only if boot or usability requires it.
- S3: Add browser event mapping.
- S4: Add input smoke checks.
- S5: Document limitations.

### T3: Runtime UX

- S1: Add run, pause, and reset ergonomics.
- S2: Add disk and ROM status display.
- S3: Add trace controls.
- S4: Add error messages for missing assets.
- S5: Add a basic user guide.

## M11: PC110 Feature Expansion

### T1: Storage And PCMCIA

- S1: Expand PC110 storage behavior.
- S2: Investigate PCMCIA only when evidence supports it.
- S3: Add tests and traces.
- S4: Document compatibility.
- S5: Push verified feature increments.

### T2: Power And Platform Features

- S1: Add power-management behavior by ROI.
- S2: Add setup or BIOS behavior by ROI.
- S3: Add save and restore if useful.
- S4: Add tests.
- S5: Document limitations.

### T3: Optional Devices

- S1: Add sound support.
- S2: Add infrared support.
- S3: Add modem support.
- S4: Add memo pad or special input support.
- S5: Add other nonblocking devices.

## M12: Real Hardware Validation

### T1: Observation Format

- S1: Define real-hardware test note format.
- S2: Define emulator-versus-hardware comparison format.
- S3: Define evidence priority levels.
- S4: Add trace attachment conventions.
- S5: Add community research citation conventions.

### T2: Validation Runs

- S1: Validate boot behavior.
- S2: Validate storage behavior.
- S3: Validate display and input behavior.
- S4: Validate platform register behavior.
- S5: Convert differences into tasks.

## M13: Release And Documentation

### T1: User Documentation

- S1: Add install and build guide.
- S2: Add asset placement guide.
- S3: Add running guide.
- S4: Add troubleshooting guide.
- S5: Add known limitations.

### T2: Developer Documentation

- S1: Add architecture overview.
- S2: Add migration provenance index.
- S3: Add device interface guide.
- S4: Add trace and debugging guide.
- S5: Add testing guide.

### T3: License And Attribution

- S1: Add PCjs attribution.
- S2: Add PCjs MIT license handling.
- S3: Add third-party code index.
- S4: Add asset policy.
- S5: Add release checklist.

### T4: Release Packaging

- S1: Verify clean clone setup.
- S2: Verify build.
- S3: Verify browser demo.
- S4: Verify regression commands.
- S5: Tag the release.

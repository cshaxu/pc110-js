# Project Breakdown

This is the canonical work breakdown for `pc110-js`.

```text
Milestone -> Task -> Subtask -> Part
```

Commit subjects use:

```text
M<milestone> T<task> S<subtask> P<part>: <description>
```

Parts are implementation commits within a subtask and are numbered when work begins. Milestone, task, and subtask identifiers are frozen once implementation starts. Completion is governed by [execution-policy.md](execution-policy.md), and current state is recorded in [status.md](status.md).

## Reference And Evidence Rules

Repository consultation order is PCjs, PC110-EMU, pc110js-v2, pc110js-v1, then NXVM. Evidence authority is domain-specific:

- Standard PC/AT behavior: PCjs PCx86 v2 is the primary implementation source.
- PC110 behavior: real hardware, dumped firmware behavior, and reliable hardware documentation are primary.
- PC110-EMU and previous attempts: supporting evidence and investigation leads only.

See [evidence-policy.md](../governance/evidence-policy.md).

## M0: Governance And Project Foundation

Goal: make autonomous execution bounded, reproducible, legally traceable, and resistant to direction drift.

### T0: Project Rules

- S1: Define English-only artifact rules.
- S2: Define TypeScript-first implementation and temporary PCjs JavaScript staging rules.
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
- S3: Define boot-preserving vertical PCjs migration.
- S4: Define the canonical milestone roadmap.
- S5: Define provenance, evidence, and PCjs change-report templates.

### T3: Pre-Goal Setup Audit

- S1: Correct planning conflicts and missing governance artifacts, then freeze identifiers for implementation.

Completion gate:

- Governance, license, third-party notices, baseline records, templates, canonical breakdown, and status record are committed.
- No protected image is tracked.
- The repository contains no emulator implementation yet.

## M1: Unmodified PCjs Golden Baseline

Goal: prove the pinned upstream implementation boots the known-good DOS disk before migration.

### T1: Golden Machine Definition

- S1: Select PCjs PCx86 v2 as the source generation.
- S2: Record that the supported generic CPU target is 80386, not complete 80486.
- S3: Select one existing PCjs 80386 PC/AT machine configuration with the minimum required devices.
- S4: Inventory its source, ROM, machine-configuration, and runtime dependencies.

### T2: Unmodified Browser Boot

- S1: Document an exact command that starts the pinned sibling PCjs checkout.
- S2: Attach the known-good DOS floppy read-only by local path or browser selection.
- S3: Reach the DOS prompt without modifying PCjs source.
- S4: Capture machine identity, asset hashes, browser result, and compact proof.

### T3: Golden Regression Contract

- S1: Define observable boot markers that do not depend only on elapsed wall time.
- S2: Record expected display or trace markers and failure diagnostics.
- S3: Record a manual rerun procedure.
- S4: Publish the golden-baseline verification record.

Completion gate:

- Unmodified PCjs at the pinned commit reaches a DOS prompt with the recorded floppy.
- Another run can reproduce the result from the documented machine identity and commands.
- No pc110-js emulator source has been copied yet.

## M2: Standalone TypeScript Runtime Shell

Goal: establish project-owned tooling and runtime boundaries without inventing emulator behavior.

### T1: Reproducible Toolchain

- S1: Select and pin the Node.js and package-manager contract.
- S2: Add `package.json`, lockfile, and strict TypeScript configuration.
- S3: Add build and development-server commands.
- S4: Add unit-test, lint, format, and type-check commands.
- S5: Add CI using the same commands as local verification.

### T2: Runtime Boundaries

- S1: Add browser and headless entry points.
- S2: Add a shared machine lifecycle shell with run, pause, reset, and deterministic step operations.
- S3: Isolate wall-clock scheduling from emulated time.
- S4: Add profile and local-asset configuration loading.
- S5: Add clear missing-asset and hash-mismatch errors.

### T3: Minimal Browser Surface

- S1: Add the emulator screen surface.
- S2: Add run, pause, reset, and media controls.
- S3: Add compact machine status and trace output.
- S4: Add browser and headless shell smoke tests.

Completion gate:

- A clean clone can install, build, type-check, test, and open the shell.
- The shell contains no fabricated PC hardware behavior.
- No runtime path depends on an absolute developer-machine path.

## M3: Minimal Bootable PCjs Vertical Migration

Goal: move the smallest complete PCjs PC/AT runtime into the standalone project and preserve the M1 DOS result immediately.

### T1: Dependency Closure And Provenance

- S1: Derive the complete runtime dependency closure from the M1 golden machine.
- S2: Create provenance records and third-party notice entries before import.
- S3: Import only required PCjs runtime source under `src/pcjs/`.
- S4: Retain verbatim notices and document every temporary JavaScript exception.
- S5: Verify that no PCjs archival ROM, disk, image, or unrelated website content was copied.

### T2: Standalone Machine Boot

- S1: Adapt PCjs startup to the project-owned browser shell.
- S2: Resolve configuration and asset paths through relative local configuration.
- S3: Boot the known-good DOS floppy read-only.
- S4: Match the M1 boot markers and reach the DOS prompt.
- S5: Add automated smoke coverage around the manual browser result.

### T3: Manual Quick Start

- S1: Add root-level `QUICKSTART.md` using the approved requirement.
- S2: Verify the Quick Start from a fresh checkout state with local protected assets.
- S3: Verify install, start, browser URL, media attachment, controls, and DOS prompt manually.
- S4: Record the Quick Start verification result.

Completion gate:

- The standalone repository boots DOS in a browser from a documented command.
- `QUICKSTART.md` is short, complete, and manually verified.
- M1 and M3 boot results are observably equivalent for the defined markers.
- Temporary imported JavaScript is fully inventoried and has removal conditions.

## M4: TypeScript Migration And Stable Device Boundaries

Goal: convert the migrated PCjs closure mechanically while keeping the whole machine bootable.

### T1: Mechanical Conversion Order

- S1: Record the dependency-aware module conversion order.
- S2: Convert shared utilities and lifecycle modules.
- S3: Convert CPU, memory, and bus modules without behavior changes.
- S4: Convert chipset and storage modules without behavior changes.
- S5: Convert video, input, and remaining runtime modules without behavior changes.

### T2: Typed Integration Boundaries

- S1: Type machine lifecycle and profile contracts.
- S2: Type memory, I/O port, IRQ, DMA, timer, reset, and trace contracts.
- S3: Add adapters only where PCjs assumptions cross project-owned boundaries.
- S4: Keep the generic PC/AT profile independent from PC110 variants.

### T3: Conversion Regression

- S1: Rerun the DOS boot after each coherent module conversion.
- S2: Compare selected CPU and device behavior with the pinned PCjs baseline.
- S3: Remove temporary JavaScript exceptions when their modules are converted.
- S4: Record any intentional PCjs behavior change in a one-page report.

Completion gate:

- Emulator runtime source is TypeScript except for documented unavoidable exceptions.
- The browser Quick Start and DOS regression remain green.
- Device boundaries are based on working integration, not speculative framework design.

## M5: Stable PC/AT Baseline And PC110 CPU Delta

Goal: freeze the reusable generic baseline and add only the PC110-required 486SX/SL CPU differences.

### T1: Generic Baseline Stabilization

- S1: Stabilize deterministic headless stepping and browser scheduling.
- S2: Add reset, boot-sector, interrupt, storage, display, and input regression markers.
- S3: Record expected performance without making timing host-dependent.
- S4: Publish the stable generic PC/AT verification record.

### T2: PC110 CPU Requirements

- S1: Inventory 486SX/SL reset-state differences required by PC110 firmware.
- S2: Inventory firmware-reached 486 instructions missing from PCjs.
- S3: Define conformance tests for every accepted CPU delta.
- S4: Keep complete 80486 conformance explicitly out of scope unless separately approved.

### T3: CPU Delta Implementation

- S1: Implement reset alias and reset register behavior.
- S2: Implement only trace-backed 486 instructions and semantics.
- S3: Add a PCjs change report for each intentional core behavior change.
- S4: Verify both generic PC/AT and PC110 CPU-delta tests.

Completion gate:

- Generic PC/AT DOS boot remains unchanged.
- Every 486SX/SL delta has evidence and a focused test.
- Documentation does not claim complete 80486 support.

## M6: PC110 Profile And ROM Skeleton

Goal: add the PC110 machine identity and load real firmware without requiring complete POST.

### T1: PC110 Profile

- S1: Define CPU, RAM, firmware, display, input, storage, and platform requirements.
- S2: Define PC110 memory and I/O ownership without speculative behavior.
- S3: Add profile-level generic and PC110 device selection.
- S4: Keep the generic PC/AT profile isolated.

### T2: Firmware Loading

- S1: Define ignored local firmware placement and hashes.
- S2: Load and map the PC110 BIOS and reset alias.
- S3: Verify reset-vector bytes and first control transfer.
- S4: Produce clear missing-asset and mismatch diagnostics.

### T3: Registry And Trace Skeleton

- S1: Add the device variant registry required by real profile differences.
- S2: Add structured CPU, memory, I/O, IRQ, DMA, and reset trace categories.
- S3: Leave unknown behavior explicit and traceable.
- S4: Record deferred behavior with prioritized TODOs.

Completion gate:

- The real PC110 BIOS starts executing from verified bytes.
- The first firmware control transfer is captured.
- Generic PC/AT boot still passes.

## M7: PC110 ROM Trace Bring-Up

Goal: advance real firmware by classifying one boot blocker at a time.

### T1: Bounded Trace Tools

- S1: Add deterministic instruction and cycle budgets.
- S2: Add focused I/O, memory, interrupt, DMA, and reset traces.
- S3: Add trace filtering, export, and stable checkpoint markers.
- S4: Prevent unbounded console output and wall-clock-only success criteria.

### T2: First POST Frontier

- S1: Run firmware until the first reproducible blocker.
- S2: Classify the blocker by device and evidence level.
- S3: Compare PCjs behavior, firmware context, PC110-EMU, prior attempts, and available hardware evidence.
- S4: Define the smallest evidence-producing next change.

### T3: Bring-Up Queue

- S1: Convert only demonstrated blockers into implementation subtasks.
- S2: Separate boot blockers from nonblocking research leads.
- S3: Record high, medium, and low TODOs with activation conditions.
- S4: Preserve generic PC/AT and prior PC110 checkpoints.

Completion gate:

- The first blocker and evidence are reproducible.
- The next implementation step is bounded.
- No guessed device behavior is accepted.

## M8: Boot-Blocking PC110 Platform Behavior

Goal: implement the minimum evidence-backed platform behavior needed to move POST and firmware boot forward.

### T1: Platform Blockers

- S1: Implement trace-backed chipset or board registers.
- S2: Implement required reset, A20, CMOS, timer, interrupt, or DMA differences.
- S3: Add focused contract and regression tests.
- S4: Rerun firmware to the next checkpoint.

### T2: Display And Input Blockers

- S1: Implement only firmware-blocking display setup behavior.
- S2: Implement only firmware-blocking keyboard or pointing-controller behavior.
- S3: Keep browser input and rendering outside hardware cores.
- S4: Preserve trace evidence and generic regressions.

### T3: Storage Discovery Blockers

- S1: Identify the firmware-visible PC110 boot storage path.
- S2: Implement controller and platform behavior without guest-service shortcuts.
- S3: Verify hardware-visible sector access.
- S4: Record unresolved PCMCIA or storage questions without speculative completion.

Completion gate:

- Each accepted behavior removes a demonstrated blocker.
- Every change has evidence, focused tests, and prior-baseline regression coverage.

## M9: PC110 Bootable Baseline

Goal: boot real guest media through the PC110 profile and hardware path.

### T1: Firmware Boot Path

- S1: Reach firmware boot-device selection.
- S2: Reach hardware-issued boot-sector access.
- S3: Load a valid boot sector without synthetic BIOS or DOS services.
- S4: Reach DOS startup and then the prompt.

### T2: PC110 Regression Contract

- S1: Add deterministic firmware and DOS checkpoint markers.
- S2: Add a noninteractive PC110 smoke command where feasible.
- S3: Preserve the generic PC/AT smoke command.
- S4: Record required local assets by identity only.
- S5: Capture compact manual browser proof.

Completion gate:

- The PC110 profile reaches a DOS prompt through emulated hardware.
- Generic PC/AT DOS boot still passes.
- No protected media or guest-service shortcut is committed.

## M10: PC110 Browser Usability

Goal: make the bootable machine practical for interactive browser use.

### T1: Display

- S1: Implement PC110-relevant display behavior required for usable output.
- S2: Present a deterministic framebuffer in the browser.
- S3: Add screenshot or framebuffer checks.
- S4: Document visual limitations.

### T2: Input

- S1: Implement keyboard behavior required for normal operation.
- S2: Implement pointing and special input by usability value and evidence.
- S3: Add browser event mapping and focused tests.
- S4: Document input limitations.

### T3: Runtime Experience

- S1: Finalize run, pause, reset, and media controls.
- S2: Expose useful machine, asset, and trace status.
- S3: Keep advanced diagnostics unobtrusive during normal use.
- S4: Update and manually verify `QUICKSTART.md`.

Completion gate:

- A user can start, boot, view, and control the PC110 profile from the Quick Start alone.

## M11: PC110 Feature Expansion

Goal: expand compatibility in ROI order after the bootable baseline is secure.

### T1: Storage And PCMCIA

- S1: Expand PC110 storage compatibility.
- S2: Implement PCMCIA behavior from hardware and firmware evidence.
- S3: Add tests, traces, and compatibility notes.

### T2: Power And Platform Features

- S1: Add power-management behavior by observed value.
- S2: Add setup and platform behavior by observed value.
- S3: Add save and restore only after deterministic state boundaries exist.

### T3: Optional Devices

- S1: Add sound support.
- S2: Add infrared or modem support.
- S3: Add memo-pad and special input support.
- S4: Add other nonblocking devices by evidence and user value.

Completion gate:

- Each feature is isolated by a device or profile boundary, has evidence and tests, and preserves both boot baselines.

## M12: Real Hardware Validation

Goal: compare emulator behavior with real PC110 machines and community research.

### T1: Observation Protocol

- S1: Define reproducible real-hardware observation records.
- S2: Define emulator-versus-hardware comparison records.
- S3: Define trace attachment, citation, and privacy conventions.
- S4: Identify tests that can be repeated by multiple machines or owners.

### T2: Validation Runs

- S1: Validate boot and reset behavior.
- S2: Validate storage behavior.
- S3: Validate display and input behavior.
- S4: Validate platform register behavior.
- S5: Convert confirmed differences into bounded future subtasks.

Completion gate:

- Important compatibility claims cite reproducible hardware observations.
- Known differences are prioritized and documented.

## M13: Release And Preservation Documentation

Goal: make the project independently buildable, inspectable, and distributable.

### T1: User Documentation

- S1: Finalize Quick Start, build, asset, run, and troubleshooting guides.
- S2: Document supported browsers, profiles, media, and limitations.
- S3: Verify a fresh-clone browser run.

### T2: Developer Documentation

- S1: Document architecture and device interfaces.
- S2: Publish the provenance and PCjs change-report indexes.
- S3: Document tracing, testing, and hardware-validation workflows.

### T3: License And Attribution

- S1: Audit PCjs attribution and MIT notice preservation.
- S2: Audit third-party source and asset licensing.
- S3: Verify that protected media is absent.
- S4: Complete the release checklist.

### T4: Release Packaging

- S1: Verify clean install, build, tests, and browser demo.
- S2: Verify generic PC/AT and PC110 regressions.
- S3: Produce versioned release notes and known limitations.
- S4: Tag the verified release.

Completion gate:

- A fresh clone can build and run using only documented local asset placement.
- License, attribution, provenance, and known limitations are complete.

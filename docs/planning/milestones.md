# Milestones

This document records the initial milestone-level breakdown. Project, task, and subtask levels will be expanded later.

## Milestone 0: Project Foundation

Establish the standalone `pc110js` repository, project rules, baseline records, reference inventory, TypeScript-first policy, and source migration strategy.

Completion signals:

- Governance documents are committed.
- PCjs and NXVM baselines are recorded.
- Initial architecture direction is documented.
- No emulator implementation is required yet.

## Milestone 1: TypeScript Project Shell

Create the standalone TypeScript build, test, lint, and browser runtime shell owned by `pc110js`.

Completion signals:

- The project can build TypeScript.
- The project can run a minimal browser entry point.
- The project can run automated tests.
- Scripts avoid hard-coded local absolute paths.

## Milestone 2: PCjs Subsystem Inventory and Migration Plan

Identify the minimal PCjs subsystem set needed for a bootable 486-class PC/AT virtual machine.

Completion signals:

- CPU, memory, bus, interrupt, timer, DMA, storage, keyboard, video, ROM, and machine orchestration sources are mapped.
- Import order is documented.
- Provenance format is defined.
- No large code import happens without the plan.

## Milestone 3: Core 486 Execution Baseline

Migrate or adapt the PCjs CPU, memory, and execution core into the pc110js TypeScript layout.

Completion signals:

- CPU and memory code builds under TypeScript.
- Basic instruction-level tests or smoke checks exist.
- Core behavior remains traceable to the pinned PCjs baseline.

## Milestone 4: Essential PC/AT Device Baseline

Migrate or adapt the minimum PC/AT devices required for DOS boot.

Completion signals:

- Required bus, PIC, PIT, DMA, CMOS, keyboard controller, floppy or storage controller, ROM, and display paths are present enough for integration.
- Device contracts are typed.
- Trace hooks exist for boot-blocking device interactions.

## Milestone 5: Bootable 486-Class PC/AT VM

Assemble the migrated core and devices into a complete 486-class PC/AT virtual machine that boots a known-good DOS disk image.

Completion signals:

- A single command starts the emulator.
- The browser runtime can boot to a DOS prompt with the known-good disk image.
- A smoke check proves the boot baseline.
- This becomes the main regression baseline for later PC110 work.

## Milestone 6: PC110 Machine Profile Skeleton

Create the PC110 machine profile without requiring complete PC110 ROM success.

Completion signals:

- PC110 profile configuration exists.
- PC110 ROM and media paths are declared with clear missing-asset errors.
- PC110 experiments do not break the 486 PC/AT baseline.

## Milestone 7: PC110 ROM Trace Bring-Up

Run PC110 ROM far enough to produce structured, useful trace data.

Completion signals:

- ROM execution starts.
- I/O port, memory, interrupt, and device access traces are captured.
- The first blocking hardware differences are documented.

## Milestone 8: Boot-Blocking PC110 Platform Devices

Implement only the PC110-specific hardware behavior that blocks ROM, POST, or DOS boot progress.

Completion signals:

- Each implemented behavior is backed by evidence.
- Each device change has regression protection.
- Non-blocking PC110 hardware remains deferred.

## Milestone 9: PC110 Storage Boot Path

Make at least one PC110-relevant storage path bootable without a fake DOS layer.

Completion signals:

- Storage path behavior is traceable.
- DOS boot succeeds through a PC110-relevant path.
- Baseline 486 PC/AT boot still passes.

## Milestone 10: PC110 Display and Input Usability

Make the PC110 profile usable enough for interactive browser operation.

Completion signals:

- Display output is usable.
- Required keyboard or pointing input works.
- The browser UI can drive the emulated machine.

## Milestone 11: PC110 Hardware Feature Expansion

Add PC110-specific hardware features by ROI and evidence quality.

Completion signals:

- Features are isolated into projects.
- Each feature has evidence, tests, and known limitations.
- Regression stability remains the priority.

## Milestone 12: Real Hardware Validation Loop

Validate emulator behavior against real PC110 machines and community research.

Completion signals:

- Observation records exist.
- Emulator and real-hardware differences are tracked.
- High-priority differences feed future work.

## Milestone 13: Preservation-Grade Release

Package the project so other users can run, inspect, and validate it.

Completion signals:

- A fresh clone can build and run with documented asset placement.
- License and attribution requirements are complete.
- Known limitations are documented.
- Demo and regression commands are documented.

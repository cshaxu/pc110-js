# Contributing Guidelines

This project is a browser-first IBM Palm Top PC 110 emulator. These guidelines are project constraints, not suggestions.

## Language

- All repository artifacts must be written in English.
- This includes source files, documentation, comments, commit messages, scripts, configuration, generated files, test data, file names, directory names, reports, and issue templates.
- Conversations with the project owner may use Chinese, but Chinese text must not be added to this repository.

## Implementation Language

- TypeScript is the default implementation language.
- New emulator source code must be TypeScript unless there is a documented reason not to use TypeScript.
- Plain JavaScript is allowed only when unavoidable for scripts, configuration, generated compatibility shims, or external tool requirements.
- JavaScript exceptions should remain small and documented.
- Type safety should be used to clarify emulator contracts, device boundaries, register shapes, memory maps, and trace records.

## Project Direction

- `pc110js` is the canonical standalone project.
- The project must own its startup flow, build system, tests, documentation, source layout, and distribution model.
- The first implementation milestones target a complete bootable 486-class PC/AT virtual machine before PC110-specific hardware work dominates the schedule.
- PCjs is the primary implementation source for mature PC/AT-compatible behavior.
- PCjs code may be migrated into this repository, but migration must be deliberate, documented, and organized into the pc110js source layout.
- Do not preserve the original PCjs website/repository layout wholesale inside this project.
- Do not rewrite core PC components such as CPU, bus, memory, DMA, PIC, PIT, FDC, basic storage, or basic VGA unless there is clear evidence that the PCjs implementation cannot support the pc110js goal.
- PC110-EMU is a behavioral oracle, not an architecture template.
- PC110-EMU may be used to understand expected behavior, ROM boot paths, register values, hardware observations, and device quirks.
- Do not copy PC110-EMU hacks, fake DOS or PCDOS layers, temporary bypasses, or broad control-flow structure into this project.
- NXVM is a source-organization reference, not an implementation source.
- NXVM may guide module boundaries such as core machine, devices, platform, debugger, and tools, but its C implementation should not be ported unless explicitly approved for a narrow reason.
- Every meaningful milestone must preserve a bootable baseline.
- Do not accept a state where future PC110 accuracy breaks the known-good DOS boot path.
- Prefer breadth-first progress over depth-first hardware archaeology.
- Investigate hardware details only as far as the current milestone requires.
- Do not fully reverse-engineer a device just because a related detail appears in a trace, unless that device blocks the milestone.
- Do not implement speculative hardware behavior.
- Hardware behavior must be supported by at least one source: PCjs behavior, ROM traces, real hardware observation, PC110-EMU behavior, datasheets, another credible emulator, or a test requirement.

## PCjs Code Migration

- PCjs code should be migrated by subsystem, not copied as an undifferentiated tree.
- Imported behavior must be placed into the pc110js source structure under `src/`.
- Each migrated subsystem must record provenance before or alongside the code import.
- Provenance records should include source repository, source commit, source paths, destination paths, migration scope, license notes, and local changes.
- Prefer mechanical TypeScript adaptation first, followed by small cleanups only after behavior is protected by tests.
- Do not mix large behavior changes with code migration.
- Local changes to imported PCjs behavior must be traceable and reviewable.
- If the migration requires modifying the source PCjs repository, write a one-page report under `docs/pcjs-change-reports/`.
- Keep PCjs attribution and MIT license requirements intact.

## Engineering Practices

- Keep changes small, purposeful, and reviewable.
- Each patch should have a clear reason, such as booting, loading an image, adding an adapter boundary, connecting one device, or resolving one trace-backed failure.
- Prefer adapters, device variants, machine profiles, registries, and configuration before changing migrated PCjs internals.
- Keep WebAssembly optional.
- WASM may be used for performance hotspots or carefully isolated reuse, but early progress must favor debuggable TypeScript and tests.
- Do not add a fake DOS layer.
- The goal is to emulate hardware well enough to boot real BIOS and DOS images, not to emulate DOS services as a shortcut.
- Preserve upstream PCjs compatibility as an observable property for migrated behavior.

## Upstream Baselines

- Development must start from a recorded PCjs upstream Git commit.
- The PCjs baseline must be documented before PCjs-derived implementation work begins.
- Baseline records should be stored under `docs/baselines/`.
- A baseline record must include:
  - repository location;
  - Git commit hash;
  - branch name, if known;
  - working tree status at the time of recording;
  - date of recording;
  - reason this baseline was selected.
- Do not describe the baseline as "current PCjs" without a commit hash.
- If the PCjs baseline changes, add a new baseline record explaining why.
- Reference repositories such as NXVM should also be recorded when they influence project structure or planning.

## Commit Discipline

- Commit messages must be written in English.
- Every commit should map to the project breakdown hierarchy: milestone, task, subtask, and part.
- Use this commit subject format:

```text
M<milestone> T<task> S<subtask> P<part>: <description>
```

- Use `0` as a placeholder only when that hierarchy level has not been defined yet.
- Examples:

```text
M0 T0 S0 P1: add project governance docs
M1 T1 S1 P1: record PCjs upstream baseline
M1 T2 S1 P1: add DOS boot smoke command
M5 T3 S2 P1: add minimal device registry
```

- Avoid unstructured exploratory commits.
- If a commit captures exploration, its subject must still identify the milestone, task, subtask, and part it belongs to.
- Prefer small commits that preserve a reviewable and runnable project state.
- Do not combine unrelated milestone or task work in one commit.
- Historical commits made before this rule changed may use the previous `M P T S part` format, but all new commits must use `M T S P`.

## Remote Synchronization

- The canonical remote repository is `pc110-js` on GitHub.
- Locally verified subtasks that meet commit standards should be pushed to the canonical remote promptly.
- Do not push work that has not passed the relevant local verification for its subtask.
- If verification cannot be run, the final note for that work must explain what was not verified and why.
- Remote pushes should preserve small, reviewable commits rather than batching unrelated work.

## Architecture

- Use a source layout that separates machine orchestration, CPU/core execution, devices, buses, platform integration, debugging, tools, and tests.
- Treat machine profiles as product boundaries.
- Standard PC/AT, 486 baseline, PC110 baseline, and PC110 ROM experiments must remain separable.
- PC110-specific experiments must not silently alter the standard PC/AT boot path.
- Keep device interfaces minimal.
- Define only the interfaces required by real integration work, such as I/O port access, memory mapping, IRQ, DMA, timers, reset, save/restore, and trace hooks.
- Avoid designing a perfect generic hardware framework before the project has enough evidence to justify it.

## Debugging and Tracing

- Use trace-first debugging for ROM boot failures, I/O port access, IRQs, DMA, disk activity, video initialization, and other hardware integration paths.
- Prefer structured, switchable trace output over ad hoc console logging.
- Unknown behavior should become a trace-backed issue or TODO, not a guessed implementation.

## Tests and Milestones

- Tests define progress.
- Maintain at least these classes of checks as the project grows:
  - baseline boot checks for known-good DOS images;
  - asset presence checks that do not commit protected images by accident;
  - device contract tests for adapter behavior;
  - smoke regression checks for milestone completion.
- Each milestone must be demoable.
- A milestone should have a command, a visible result, and a short log, screenshot, or trace proving that it works.
- Define stop conditions before deep hardware investigations.
- Examples: stop after the next BIOS I/O failure is identified, or stop after the minimal behavior needed to pass one POST checkpoint is implemented.
- Document decisions, not only discoveries.
- When deferring work, record why it is deferred and what evidence would make it worth doing.
- Regression stability is more important than architectural elegance.

## TODO Comments

- TODO comments are allowed and encouraged when they help future work resume safely.
- Every TODO must include a priority in this format: `TODO(High)`, `TODO(Medium)`, or `TODO(Low)`.
- `TODO(High)` means the work is required for complete PC110 behavior, but is intentionally outside the current milestone.
- `TODO(Medium)` means the work is likely important for compatibility, correctness, maintainability, or diagnostics, but does not block the current milestone.
- `TODO(Low)` means the work is an interesting lead, cleanup opportunity, or deeper investigation target that should not distract from current progress.
- TODO comments should include enough context for a future contributor to understand why the item exists.
- Do not use TODO comments to hide broken behavior that blocks the current milestone.

## PCjs Internal Changes

- Changing the source PCjs repository requires a short one-page report before or alongside the change.
- The report must state:
  - what PCjs code is being changed;
  - why a pc110js-side adapter, migration, profile, registry entry, or configuration-only approach is insufficient;
  - what evidence supports the change;
  - what baseline boot or regression checks protect the change;
  - how the change can be reduced, reverted, or upstreamed later.
- Reports should be stored under `docs/pcjs-change-reports/`.
- Do not make broad PCjs refactors without a trace-backed need.

## Assets and Provenance

- ROMs, BIOS dumps, disk images, ISO images, VHDs, VMDKs, and other protected media must not be committed by default.
- Any committed media asset requires explicit provenance, license or permission notes, and a reason it belongs in the repository.
- Local asset paths may be documented, but protected media should remain outside Git unless explicitly approved.


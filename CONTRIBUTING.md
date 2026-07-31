# Contributing Guidelines

These rules are project constraints.

## Language

- Every repository artifact must be written in English.
- This includes source, documentation, comments, commit messages, scripts, configuration, generated text, test data, file names, directory names, reports, and issue templates.
- Conversations with the project owner may use Chinese, but Chinese text must not enter the repository.

## Implementation Language

- Emulator and application runtime code must be TypeScript.
- Plain JavaScript is allowed only for a narrow external-tool requirement, generated compatibility file, or configuration format that cannot reasonably use TypeScript.
- Every JavaScript exception requires a documented reason and removal condition.
- M1 may execute JavaScript from the read-only sibling PCjs checkout through relative references.
- PCjs runtime JavaScript must not become the accepted implementation inside this repository.
- PCjs-derived TypeScript remains derivative work and must preserve provenance, copyright, and license obligations.

## Delivery Nodes

### M1: PCjs Reference Integration

- Use project-owned commands or a harness to refer to `../pcjs` through relative paths.
- Select PCx86 v2 and a complete minimal 80386 PC/AT machine.
- Boot the known-good DOS floppy without modifying or copying PCjs runtime source.
- Provide a browser-accessible PCjs reference-mode run through a pc110-js-owned
  command and a manually verified concise procedure.
- Record the machine, dependency closure, assets, commands, and observable result.
- Call this the PCjs reference baseline, not the pc110-js golden implementation.

### M2: Standalone TypeScript 386 Golden Baseline

- Study and adapt PCjs behavior into a clean TypeScript implementation organized by pc110-js subsystem boundaries.
- Implement the complete minimum 80386 PC/AT hardware required by the selected M1 machine.
- Own the build, startup, machine lifecycle, profiles, registry, browser UI, headless runtime, tests, and asset configuration.
- Boot the same DOS floppy with no runtime dependency on `../pcjs`.
- Match defined M1 reference markers.
- Add and manually verify the root-level `QUICKSTART.md`.

### M3: High-ROI PC110 Integration

- Add PC110 behavior that blocks or materially advances ROM execution, POST, boot, display, input, or basic usability.
- Add PC110 implementations as profile-selected device variants.
- Keep every M2 generic implementation registered and independently selectable.
- Do not edit generic device behavior in place to make the PC110 profile work.

### M4: Medium- And Low-ROI PC110 Integration

- Add remaining PC110 features by evidence and user value.
- Preserve the same interfaces, registry, and profile selection model.
- Keep contracts usable for future machine-specific hardware and ROM profiles.
- Avoid speculative generalization; extend an interface only for a demonstrated second implementation need.

## Source Authority

- Use PCjs PCx86 v2 as the primary implementation source for standard PC/AT CPU, memory, bus, chipset, storage, video, and input behavior.
- PCjs PCx86 v2 supports through the 80386. Do not describe it as a complete 80486 core.
- Introduce PC110-required 486SX/SL behavior in M3 as explicit, tested CPU variants or deltas.
- Use real PC110 observations, dumped firmware execution, and reliable hardware documentation as primary PC110 evidence.
- Use PC110-EMU as a supporting implementation reference. Its hacks and placeholder behavior are not authoritative.
- Use pc110js-v2 and pc110js-v1 as historical evidence and failure-analysis sources.
- Use NXVM only during M2 as a secondary reference for directory layout, file
  boundaries, CPU data-model completeness, instruction-coverage inventory, and
  trace/debugging design. Its CPU behavior still requires PCjs verification.
  Treat NXVM POST, BIOS, guest services, interrupt services, device logic, and
  platform behavior as unreliable hacks. Do not use NXVM as an M3-or-later
  reference unless the owner explicitly reauthorizes it.
- Follow [the evidence policy](docs/governance/evidence-policy.md) for every nontrivial hardware claim.

## Reference Repositories

- Sibling reference repositories are read-only.
- Do not commit changes in `../pcjs`, `../PC110-EMU`, `../pc110js-v2`, `../pc110js-v1`, or `../nxvm` as part of pc110-js work.
- Record the exact source commit or snapshot hashes before using reference material.
- If a reference snapshot changes, add a new baseline record instead of silently editing the old record.
- Released and M2-complete runtime paths must not depend on sibling repositories.

## PCjs Assimilation

- M1 establishes behavior to preserve; it does not establish a source tree to copy.
- M2 implementation belongs under the natural pc110-js `src/` subsystem boundaries.
- Preserve behavior first within each bounded module adaptation, then clean up only after focused and whole-machine tests protect it.
- Record source repository, commit, source paths, destination paths, scope, license, and intentional changes using [the provenance template](docs/provenance/template.md).
- Preserve original copyright and license notices in copies or substantial derived portions.
- Do not copy the PCjs website tree, machine archive, programs, ROMs, disks, images, or third-party documentation.
- Do not call a line-by-line JavaScript-to-TypeScript transliteration architectural assimilation. Names, module boundaries, lifecycle ownership, and device contracts should become natural to this project while tested behavior remains traceable.
- Do not mix a large subsystem adaptation, architectural redesign, and intentional behavior change in one commit.
- Every M2 increment must compare focused behavior with M1 and advance an observable whole-machine checkpoint.

## PCjs Change Reports

- Any intentional behavior change to PCjs-derived implementation requires a one-page report before or alongside the change.
- This applies to TypeScript implementation in this repository and to any proposed upstream PCjs patch.
- The sibling PCjs checkout remains read-only; an upstream patch must be prepared inside this repository unless the owner explicitly authorizes a different workflow.
- Use [the PCjs change report template](docs/pcjs-change-reports/template.md).
- The report must identify the changed behavior, why configuration or an adapter is insufficient, supporting evidence, regression coverage, compatibility risk, and a reduction or upstream path.

## Device Architecture

- Selection follows `Machine Profile -> Device Registry -> Device Interface -> Device Variant`.
- M2 registers generic 80386 PC/AT devices as default variants.
- M3 and M4 add machine-specific variants without removing generic variants.
- Machine profiles own ROM selection, memory maps, I/O ownership, device selection, and wiring.
- Generic PC/AT, PC110, and future machine profiles must remain independently instantiable.
- Interfaces stay minimal and are expanded only by real integration requirements.
- Avoid designing a universal hardware framework before multiple working variants require it.

## Engineering Direction

- Preserve the latest achieved runnable baseline.
- Prefer breadth-first milestone progress over unbounded hardware investigation.
- Stop an investigation when the active blocker is classified and the next evidence-producing experiment is known.
- Keep unknown behavior visible in structured traces.
- WebAssembly is optional and requires a measured need.
- Do not add fake BIOS, DOS, PCDOS, interrupt-service, filesystem, boot-repair, or application-specific shortcuts.

## Tests And Verification

- Use npm only. Keep `package-lock.json` authoritative and do not add pnpm,
  Yarn, Bun, or their lockfiles/workspace files.
- Tests and reproducible demonstrations define progress.
- Each completed subtask has explicit acceptance criteria and exact verification commands.
- M1 proves the sibling PCjs reference run.
- M2 proves the standalone TypeScript golden machine and browser Quick Start.
- M3 and M4 preserve both M1 reference comparability and the M2 generic golden regression.
- Browser milestones require a manual browser check in addition to automated checks.
- A locally verified subtask that meets commit standards must be pushed promptly to the canonical GitHub remote.
- Do not claim or push a subtask as complete when required verification was not run.
- Follow [the execution policy](docs/planning/execution-policy.md).

## Quick Start

- M2 T6 must add a root-level `QUICKSTART.md` with the standalone TypeScript 80386 PC/AT golden baseline.
- It must be short enough to follow without reading architecture documentation.
- It must cover dependency installation, local asset placement, the exact start command, URL, disk selection, expected DOS result, and a manual browser checklist.
- It must use relative project paths and ignored local asset configuration.
- M3 and M4 update the same Quick Start with profile selection while preserving the generic 386 procedure.

## TODO Comments

- TODO comments are allowed when they make future work resumable.
- Every TODO uses `TODO(High)`, `TODO(Medium)`, or `TODO(Low)`.
- `TODO(High)` is required for complete PC110 behavior but intentionally outside the current milestone.
- `TODO(Medium)` is likely important for correctness, compatibility, maintainability, or diagnostics but does not block the current milestone.
- `TODO(Low)` is an interesting lead or cleanup item that should not distract from current progress.
- Include the reason, relevant evidence, and activation condition when practical.
- Never hide an active milestone blocker behind a TODO.

## Commits

The hierarchy is:

```text
Milestone -> Task -> Subtask -> Part
```

Use:

```text
M<milestone> T<task> S<subtask> P<part>: <description>
```

Examples:

```text
M1 T4 S5 P1: capture PCjs reference DOS boot proof
M2 T6 S6 P1: add TypeScript golden baseline Quick Start
M3 T3 S2 P1: add PC110 boot-storage device variant
M4 T2 S2 P1: add PC110 audio device variant
```

- Keep commits small, purposeful, and reviewable.
- Do not combine unrelated tasks.
- Parts are numbered from 1 within a subtask.
- Historical commits may retain the hierarchy active when they were created.
- The owner-authorized pre-implementation direction correction in `M0 T3 S1 P2` replaces the previous M1-M13 roadmap. M0-M5 identifiers are frozen after that correction.

## Task Tracking

- Maintain concise task logs under `docs/tracking/`.
- Each task uses exactly one file named `M<milestone>-T<task>.md`.
- Organize each task log with one `## S<subtask>` section per subtask. Use a
  short `P<part>` entry for each relevant commit.
- Create the task log when the task begins. Update the relevant subtask section
  in the same commit as every change to that subtask.
- Record only scope, outcome, verification state, blockers, and durable follow-
  up information. Link to verification, evidence, provenance, or change-report
  records instead of duplicating their contents.
- Do not record protected media content, credentials, machine-specific paths, or
  long narrative progress reports.

## Milestone Snapshots

- M1 through M5 each end with an immutable snapshot branch named `m1` through
  `m5`.
- After a milestone completion gate passes, push the final verified `main`
  commit, create the matching snapshot branch from that exact commit, and push
  the branch to `origin` before beginning the next milestone.
- Verify that `main`, the local snapshot branch, and `origin/m<milestone>`
  resolve to the same commit at snapshot creation time.
- Record the branch name and successful remote push in the active task tracking
  section and milestone verification record. Git ref equality is the authority
  for the snapshot commit identity; a literal SHA may be recorded only in the
  first post-snapshot transition commit on `main` and must not move the snapshot.
- Snapshot branches are preservation references. Do not develop on them, merge
  into them, force-push them, or move them after creation without explicit owner
  authorization.
- Development continues on `main`. A goal may enter the next milestone only
  when it explicitly authorizes that transition and the preceding snapshot is
  verified and pushed.

## Goal Specifications

- Long-running goals may use committed English specifications under
  `docs/goals/`.
- A short goal prompt must name the specification and state its authorized
  milestone boundary.
- The specification revision present at goal start is binding. Changing it does
  not expand an active goal unless the owner explicitly updates the goal.
- A specification must define the authorized scope, non-goals, completion
  gates, milestone transitions, snapshot behavior, required records, and stop
  conditions.

## Assets And Licensing

- Follow [the asset policy](docs/governance/asset-policy.md).
- ROMs, BIOS dumps, disk images, ISOs, VHDs, VMDKs, and other protected media are not committed by default.
- A committed media asset requires explicit provenance, redistribution permission, and owner approval.
- Reference code without a clear license must not be copied.
- Keep [third-party notices](THIRD_PARTY_NOTICES.md) current with every derived subsystem.

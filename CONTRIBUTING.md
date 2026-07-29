# Contributing Guidelines

These rules are project constraints.

## Language

- Every repository artifact must be written in English.
- This includes source, documentation, comments, commit messages, scripts, configuration, generated text, test data, file names, directory names, reports, and issue templates.
- Conversations with the project owner may use Chinese, but Chinese text must not enter the repository.

## Implementation Language

- New emulator and application code must be TypeScript.
- Plain JavaScript is allowed only for external tool requirements, small configuration shims, generated compatibility files, or verbatim PCjs migration staging.
- A JavaScript exception must be narrow, documented, and assigned a removal condition.
- Verbatim PCjs JavaScript is third-party source, not new local implementation. It must retain provenance and license notices.
- TypeScript conversion must be mechanical first. Behavior changes require separate commits and tests.

## Project Direction

- `pc110-js` is a standalone project, not a PCjs website fork and not a translation of PC110-EMU.
- Establish the unmodified PCjs golden boot before importing emulator code.
- Migrate a complete bootable vertical slice before splitting or redesigning subsystems.
- Preserve the latest achieved boot baseline after every migration or behavior change.
- Prefer breadth-first milestone progress over unbounded hardware investigation.
- Stop an investigation when the active blocker is classified and the next evidence-producing experiment is known.
- Do not add fake BIOS, DOS, PCDOS, interrupt-service, filesystem, boot-repair, or application-specific shortcuts.
- WebAssembly is optional and must not be introduced without a measured need.

## Source Authority

- Use PCjs PCx86 v2 as the primary implementation source for standard PC/AT CPU, memory, bus, chipset, storage, video, and input behavior.
- PCjs PCx86 v2 supports through the 80386. Do not describe it as a complete 80486 core.
- Model PC110-required 486SX/SL differences as explicit, tested deltas.
- Use real PC110 observations, dumped firmware execution, and reliable hardware documentation as primary PC110 evidence.
- Use PC110-EMU as a supporting implementation reference. Its hacks and placeholder behavior are not authoritative.
- Use pc110js-v2 and pc110js-v1 as historical evidence and failure-analysis sources.
- Use NXVM only as a familiar source-organization reference unless a narrow port is explicitly approved.
- Follow [the evidence policy](docs/governance/evidence-policy.md) for every nontrivial hardware claim.

## Reference Repositories

- Sibling reference repositories are read-only.
- Do not commit changes in `../pcjs`, `../PC110-EMU`, `../pc110js-v2`, `../pc110js-v1`, or `../nxvm` as part of pc110-js work.
- Record the exact source commit or snapshot hashes before using reference material.
- If a reference snapshot changes, add a new baseline record instead of silently editing the old record.

## PCjs Migration

- First prove an unmodified PCjs PCx86 v2 machine boots the known-good DOS disk.
- Import the smallest complete dependency closure that preserves the same boot behavior.
- Keep the first imported closure recognizable and mechanically adapted.
- Place migrated runtime source under `src/`; do not copy the PCjs website tree wholesale.
- Record source repository, commit, source paths, destination paths, scope, license, hashes where useful, and local changes using [the provenance template](docs/provenance/template.md).
- Preserve original copyright and license notices in copies or substantial portions.
- Do not copy PCjs programs, images, ROMs, disks, or third-party documentation merely because they are present in the PCjs repository. The PCjs license explicitly excludes third-party archival and demonstration material.
- Do not mix a large import, TypeScript conversion, architectural cleanup, and behavior change in one commit.
- Every migration increment must rerun the latest golden boot regression.

## PCjs Change Reports

- Any intentional behavior change to PCjs-derived implementation requires a one-page report before or alongside the change.
- This applies both to migrated code in this repository and to a proposed upstream PCjs patch.
- The sibling PCjs checkout remains read-only; an upstream patch must be prepared inside this repository unless the owner explicitly authorizes a different workflow.
- Use [the PCjs change report template](docs/pcjs-change-reports/template.md).
- The report must identify the changed behavior, why an adapter or configuration is insufficient, supporting evidence, regression coverage, compatibility risk, and a reduction or upstream path.

## Architecture

- Machine profiles are product boundaries.
- Keep the generic PC/AT baseline, PC110 profile, and ROM experiments separable.
- PC110-specific behavior must not silently alter the generic PC/AT path.
- Keep machine orchestration, CPU, memory, buses, devices, profiles, platform integration, browser UI, tracing, and tools separate when actual integration work justifies the boundary.
- Keep interfaces minimal and driven by real integration needs.
- Avoid designing a universal device framework before two real implementations require it.

## Tests And Verification

- Tests and reproducible demonstrations define progress.
- Each completed subtask must have explicit acceptance criteria and exact verification commands.
- Boot proof must include deterministic machine and asset identities plus a compact verification record.
- Browser milestones require a manual browser check in addition to automated checks.
- A locally verified subtask that meets commit standards must be pushed promptly to the canonical GitHub remote.
- Do not claim or push a subtask as complete when required verification was not run.
- Follow [the execution policy](docs/planning/execution-policy.md).

## Quick Start

- M3 must add a root-level `QUICKSTART.md` with the first migrated browser-bootable PCjs baseline.
- It must be short enough to follow without reading architecture documentation.
- It must cover dependency installation, local asset placement, the exact start command, URL, disk selection, expected DOS result, and a manual browser checklist.
- It must use relative project paths and an ignored local asset configuration.
- The Quick Start is part of the M3 acceptance criteria, not deferred release documentation.

## TODO Comments

- TODO comments are allowed when they make future work resumable.
- Every TODO must use `TODO(High)`, `TODO(Medium)`, or `TODO(Low)`.
- `TODO(High)` is required for complete PC110 behavior but intentionally outside the current milestone.
- `TODO(Medium)` is likely important for correctness, compatibility, maintainability, or diagnostics but does not block the current milestone.
- `TODO(Low)` is an interesting lead or cleanup item that should not distract from current progress.
- Include the reason, relevant evidence, and activation condition when practical.
- Never hide an active milestone blocker behind a TODO.

## Commits

The planning hierarchy is:

```text
Milestone -> Task -> Subtask -> Part
```

Use this subject format:

```text
M<milestone> T<task> S<subtask> P<part>: <description>
```

Examples:

```text
M0 T1 S2 P1: record PC110-EMU reference baseline
M1 T2 S3 P1: capture unmodified PCjs DOS boot proof
M3 T3 S1 P1: add migrated baseline Quick Start
M7 T2 S2 P1: classify first PC110 ROM blocker
```

- Keep commits small, purposeful, and reviewable.
- Do not combine unrelated tasks.
- Parts are numbered from 1 within a subtask.
- Historical commits made before the hierarchy correction may retain their original subject format.
- Planning identifiers are frozen once implementation starts. Add new items without renumbering completed or active items.

## Assets And Licensing

- Follow [the asset policy](docs/governance/asset-policy.md).
- ROMs, BIOS dumps, disk images, ISOs, VHDs, VMDKs, and other protected media are not committed by default.
- A committed media asset requires explicit provenance, redistribution permission, and owner approval.
- Reference code without a clear license must not be copied.
- Keep [third-party notices](THIRD_PARTY_NOTICES.md) current with every import.

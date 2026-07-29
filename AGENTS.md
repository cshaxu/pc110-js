# Agent Instructions

These instructions apply to the entire `pc110-js` repository. More specific
instructions may be added in nested `AGENTS.md` files when a subsystem needs
them.

## Required Reading

Before changing the repository, read these sources in order:

1. `docs/planning/status.md` for the current eligible work.
2. `docs/planning/breakdown.md` for scope and completion gates.
3. `docs/planning/execution-policy.md` for subtask execution rules.
4. `CONTRIBUTING.md` for engineering and commit constraints.
5. The relevant architecture, governance, baseline, evidence, provenance, and
   requirement documents for the active subtask.

Do not treat this file as a substitute for those canonical documents.

## Scope And Repository Boundaries

- This repository is the canonical product repository.
- Sibling repositories are read-only references. Never modify `../pcjs`,
  `../PC110-EMU`, `../pc110js-v2`, `../pc110js-v1`, or `../nxvm` as part of
  this project's work.
- Use relative paths for sibling references and local assets. Never commit a
  developer-machine absolute path.
- Follow `docs/governance/asset-policy.md`. ROMs, firmware, disk images, and
  other protected media are local inputs unless redistribution is explicitly
  approved and documented.
- Preserve unrelated user changes. Do not use destructive Git operations to
  discard work.

## Language And Implementation

- Every repository artifact must be written in English, including source,
  documentation, comments, tests, generated text, file names, and commit
  messages.
- Emulator and application runtime code must be TypeScript. JavaScript
  exceptions require the justification and removal condition defined in
  `CONTRIBUTING.md`.
- M1 may run JavaScript from the read-only sibling PCjs checkout. M1 must not
  copy PCjs runtime source into this repository.
- M1 must expose its selected PCjs reference machine through a pc110-js-owned
  browser launch path and document the manual reference-mode procedure.
- M2 must provide the standalone project-owned TypeScript implementation and
  must not depend on sibling PCjs code at runtime.
- Do not add fake BIOS, DOS, PCDOS, filesystem, boot-repair, guest-service, or
  application-specific shortcuts.
- Any intentional behavior change to PCjs-derived implementation requires the
  one-page report defined in `docs/pcjs-change-reports/template.md`.

## Execution Discipline

- Execute exactly one active subtask at a time.
- The goal text defines the authorized outcome and completion criteria. Do not
  cross a milestone, task, or subtask boundary unless the goal authorizes it
  and the next unit has defined entry conditions and acceptance criteria.
- A goal may reference a committed specification under `docs/goals/`. Treat
  the revision present when the goal starts as binding. Do not alter that
  specification to broaden active scope unless the owner explicitly updates
  the goal.
- Select work from `docs/planning/status.md`; update that file whenever active
  or completed work changes.
- Before implementation, create the required subtask record described in
  `docs/planning/execution-policy.md` when the canonical breakdown does not
  already contain the required detail.
- Prefer breadth-first progress toward an observable whole-machine checkpoint.
  Classify one blocker before implementing one blocker, and stop investigations
  at the policy's evidence and escalation boundaries.
- Preserve every established runnable or boot baseline.
- Record deferred work only as `TODO(High)`, `TODO(Medium)`, or `TODO(Low)` as
  defined in `CONTRIBUTING.md`. Never hide an active blocker behind a TODO.
- Milestone completion does not authorize the next milestone unless the goal
  explicitly names that next milestone. A goal that authorizes M1 through M2
  may begin M2 only after the M1 completion gate and milestone snapshot process
  both pass.

## Verification, Commits, And Pushes

- Define exact verification commands and observable acceptance evidence before
  implementation.
- Run all required automated checks and manual browser checks. Do not claim a
  subtask complete when required verification was skipped or failed.
- Add a compact English verification record under `docs/verification/` for
  every completed subtask.
- Maintain the task tracking record at
  `docs/tracking/M<milestone>-T<task>.md`. Create it when work on a task
  begins, give every active subtask its own section, and add one concise part
  entry in the same commit as each change to that subtask.
- Review the working tree for protected assets, generated files, unrelated
  changes, and machine-specific paths before committing.
- Use commit subjects in this exact form:

  `M<milestone> T<task> S<subtask> P<part>: <description>`

- Keep parts small and reviewable. A verified completed subtask must be pushed
  promptly to the canonical remote.
- When M1 through M5 completes, create and push the corresponding immutable
  snapshot branch `m<milestone>` from the final verified `main` commit before
  beginning the next milestone. Continue development on `main`, never on a
  snapshot branch.
- If a stop or escalation condition is reached, preserve the last known-good
  state, record the evidence, and ask the owner for direction instead of
  broadening the implementation.

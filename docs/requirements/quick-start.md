# Quick Start Requirement

M2 T6 must add and manually verify a root-level `QUICKSTART.md` when the standalone TypeScript 80386 PC/AT machine boots DOS in the browser.

## Audience

The reader has a fresh repository checkout, a supported browser, Node.js, and a locally owned DOS floppy image. The reader should not need architecture knowledge or sibling source repositories.

## Required Content

`QUICKSTART.md` must contain only the shortest reliable path to a visible DOS prompt:

1. Supported Node.js and package-manager versions.
2. Dependency installation command.
3. Relative local asset placement or browser file-selection step.
4. Expected floppy SHA-256 and read-only recommendation.
5. Exact development-server command.
6. Exact local URL.
7. Machine profile and media selection steps.
8. Expected boot result.
9. Run, pause, reset, and media-control basics.
10. A short troubleshooting section for missing assets, hash mismatch, blank display, and failed boot.

Do not include architecture explanation, project history, feature marketing, or hardware research notes.

## Manual Acceptance Checklist

The M2 verifier must follow the document from a fresh checkout state and confirm:

- dependency installation succeeds;
- no absolute local path is required;
- the server starts with the documented command;
- the documented URL opens in the browser;
- the local floppy can be attached without entering Git;
- the emulator reaches the expected DOS prompt;
- run, pause, and reset operate without layout breakage;
- browser console output contains no unexpected errors;
- refreshing and repeating the documented process is reliable.

The compact result belongs in `docs/verification/`; protected media and raw screenshots remain local unless reviewed and approved.

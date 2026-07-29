# M1 Browser Reference-Run Requirement

M1 must provide a browser-accessible reference-mode emulator run for the
project owner. It is a controlled launch of the pinned read-only sibling PCjs
implementation, not the standalone pc110-js emulator.

## Required Result

- A command owned by pc110-js serves and opens the selected PCjs PCx86 v2
  80386 PC/AT machine in a supported browser.
- The command resolves the sibling PCjs checkout and local media through
  relative paths.
- The known-good local DOS floppy is attached read-only and reaches a visible
  DOS prompt through the selected PCjs hardware path.
- The browser run exposes usable display, keyboard input, pause, reset, and
  media controls supplied by the reference machine.
- Missing sibling source, incorrect pinned commit, missing local media, and
  hash mismatch failures are clear and actionable.

## Required Guide

M1 T4 S6 must add `docs/quickstart/m1-reference.md`. It must be concise and
manually verified. It must state:

1. That the procedure is PCjs reference mode, not the standalone pc110-js
   emulator.
2. The exact project-owned start command and browser URL.
3. Relative sibling-checkout and local-media prerequisites.
4. The expected floppy SHA-256 and read-only attachment procedure.
5. The expected visible DOS prompt.
6. Run, pause, reset, keyboard, and media-control basics.
7. Short troubleshooting for missing PCjs, baseline mismatch, missing media,
   hash mismatch, blank display, and failed boot.

The guide must not require a developer-machine absolute path, copy PCjs source,
or claim that M2 standalone behavior already exists.

## Manual Acceptance

The verifier must follow the guide from the pc110-js checkout and confirm:

- the project-owned command starts the local server;
- the documented URL opens the selected machine in a browser;
- the machine reaches the DOS prompt from the local floppy;
- keyboard input, pause, reset, and media controls work;
- browser console output has no unexpected errors;
- refresh and repeat boot work reliably;
- the sibling PCjs checkout remains unchanged.

Record the compact result under `docs/verification/`. Protected media and raw
screenshots remain local unless separately reviewed and approved.

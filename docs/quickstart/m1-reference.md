# M1 PCjs Reference Quick Start

This runs the M1 PCjs reference baseline. It is not the standalone pc110-js
emulator; that is the M2 goal.

## Prerequisites

- Node.js 22 or later and pnpm 11.9.0.
- A sibling layout containing `pc110-js`, `pcjs`, and `fdd.img`.
- The floppy must be 1,474,560 bytes with SHA-256
  `FADEB3A27C6A0E1CF582DDE0B9AECB7E5D30678F2F967F2F4562F167CC0CB1D5`.
  Keep it read-only; the runner verifies and serves it without modifying it.

## Run

From the `pc110-js` checkout:

```text
pnpm install
pnpm reference
```

The command opens `http://127.0.0.1:5173/_pc110js/machine.xml`. Wait for the
VGA display to reach `A:\>`.

## Controls

- Click the VGA display before typing.
- `Halt` pauses or resumes execution; `Reset` restarts the PCjs machine.
- Use the drive A selector and media controls for local disks. The supplied
  `fdd.img` is mounted automatically as read-only host media.
- `Ctrl-Alt-Del`, `Keys`, and `Full Screen` are PCjs browser controls.

## Troubleshooting

- Missing `../pcjs`: place the pinned PCjs sibling beside this checkout.
- Baseline error: ensure the sibling contains pinned commit
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Missing floppy, size, or hash error: restore the local `../fdd.img` without
  converting it.
- Blank display or failed boot: reset, wait for the FDC mount, then refresh the
  page. Stop another local service or set `PORT` to use a different port.

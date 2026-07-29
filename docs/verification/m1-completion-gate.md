# M1 Completion Gate

## Result

Pass.

## Baseline

- PCjs reference source: `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Machine: `m1-deskpro386-vga-4096`.
- Media: verified local 1.44MB floppy served read-only.

## Evidence

- The project-owned TypeScript runner serves resources from the pinned Git
  object and leaves the sibling checkout unchanged.
- Local Edge captures recorded PCjs firmware and FDC markers, then `A:\>`.
- The reference UI exposes Halt, Reset, keyboard, and media controls.
- `pnpm run build` passed during the completion review.
- The tracked-file audit found no protected media extensions.
- Quick Start, source maps, license boundary, and excluded archive records are
  committed.

## Classification

This is the M1 PCjs reference baseline. It is not the standalone pc110-js
implementation or M2 golden baseline.

## Immutable Snapshot

`m1` was created and pushed from
`26bbf1c5a2eaf73dec4729e70fc23b80dafb5183`. At verification time, `main`,
local `m1`, and `origin/m1` resolved to that exact commit.

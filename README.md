# pc110-js

Browser-first IBM Palm Top PC 110 emulator project.

This repository is the canonical standalone project. It owns its startup flow, build system, tests, source layout, documentation, and release packaging. The local checkout directory is normally named `pc110-js`; reference repositories may be placed beside it and are always treated as read-only.

## Direction

- Establish a reproducible, unmodified PCjs PCx86 v2 DOS boot before migrating code.
- Migrate the smallest complete PCjs PC/AT runtime as a vertical slice that remains bootable.
- Keep new project code TypeScript-first. Verbatim PCjs JavaScript may exist temporarily only as a provenance-tracked migration stage.
- Convert migrated PCjs code mechanically and incrementally while preserving the DOS boot baseline.
- Treat PCjs as the primary source for standard PC/AT behavior.
- Treat real hardware observations, dumped firmware behavior, and reliable hardware documentation as primary evidence for PC110-specific behavior.
- Treat PC110-EMU and previous pc110-js attempts as investigation references, not hardware truth or architecture templates.
- Implement only trace-backed PC110 behavior required by the active milestone.
- Never add fake BIOS, DOS, PCDOS, or guest-service shortcuts.

PCjs PCx86 v2 supports CPUs through the 80386. The project therefore uses a proven PCjs 80386 PC/AT machine as its generic golden baseline and models the PC110-required 486SX/SL differences explicitly. It does not claim complete 80486 emulation without a separate conformance milestone.

## Project Documents

- [Contribution and engineering rules](CONTRIBUTING.md)
- [Architecture direction](docs/architecture/direction.md)
- [Canonical project breakdown](docs/planning/breakdown.md)
- [Execution policy](docs/planning/execution-policy.md)
- [Current status](docs/planning/status.md)
- [Evidence policy](docs/governance/evidence-policy.md)
- [Asset policy](docs/governance/asset-policy.md)
- [Quick Start requirement](docs/requirements/quick-start.md)

The runnable `QUICKSTART.md` will be added in M3 with the first migrated browser-bootable PCjs baseline. It must be verified manually in a browser before that subtask is complete.

## Reference Order

Repository consultation order is:

1. `../pcjs`
2. `../PC110-EMU`
3. `../pc110js-v2`
4. `../pc110js-v1`
5. `../nxvm`

This order does not override evidence authority. PCjs leads standard PC/AT implementation decisions; PC110-specific claims are decided by real hardware, firmware behavior, and reliable hardware documentation.

Protected ROM and media images are not part of this repository. Local assets are identified by hashes and loaded through ignored local configuration.

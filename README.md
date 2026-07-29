# pc110-js

Browser-first IBM Palm Top PC 110 emulator project.

This repository is the canonical standalone project. It owns its startup flow, build system, tests, source layout, documentation, and release packaging. The local checkout directory is normally named `pc110-js`; reference repositories may be placed beside it and are always read-only.

## Delivery Model

The project has four primary delivery nodes:

1. **PCjs reference integration**: this project uses relative references to `../pcjs`, selects a minimal complete PCx86 v2 80386 PC/AT machine, and proves that it boots the known-good DOS floppy.
2. **Standalone TypeScript 386 golden baseline**: PCjs behavior is studied and reorganized into this repository as a clean, complete TypeScript implementation of the required 80386 PC/AT CPU and hardware. It boots the same DOS floppy with no runtime dependency on `../pcjs` and includes the first manually verified browser `QUICKSTART.md`.
3. **High-ROI PC110 integration**: boot-, POST-, storage-, display-, and input-critical PC110 variants are added through stable device interfaces, registries, and machine profiles. Every generic device remains selectable.
4. **Medium- and low-ROI PC110 integration**: remaining PC110 hardware is added through the same variant mechanism, while preserving the ability to add other machine profiles, hardware implementations, and ROMs later.

M0 establishes governance before these delivery nodes. M5 packages the verified implementation for preservation-grade release.

## Core Rules

- New runtime implementation is TypeScript.
- M1 references sibling PCjs source; it does not copy PCjs runtime source into this repository.
- M2 produces project-owned TypeScript modules organized around this project's architecture, not a JavaScript vendor tree or a transliterated PCjs website layout.
- The TypeScript implementation remains PCjs-derived where PCjs behavior is used, so provenance, copyright, and MIT notices must be preserved.
- PCjs PCx86 v2 supports CPUs through the 80386. The standalone generic baseline is therefore a complete minimal 80386 PC/AT, not a claimed complete 80486.
- PC110-required 486SX/SL behavior is introduced as explicit, evidence-backed CPU variants or deltas in M3.
- Generic and machine-specific devices are selected through profiles and registries; PC110 work never overwrites the generic baseline.
- Real hardware, dumped firmware behavior, and reliable hardware documentation lead PC110-specific decisions.
- PC110-EMU and previous pc110-js attempts are investigation references, not hardware truth or architecture templates.
- Fake BIOS, DOS, PCDOS, filesystem, boot-repair, and guest-service shortcuts are prohibited.

## Project Documents

- [Agent instructions](AGENTS.md)
- [Contribution and engineering rules](CONTRIBUTING.md)
- [Architecture direction](docs/architecture/direction.md)
- [Canonical project breakdown](docs/planning/breakdown.md)
- [Execution policy](docs/planning/execution-policy.md)
- [Current status](docs/planning/status.md)
- [Task tracking logs](docs/tracking/)
- [Evidence policy](docs/governance/evidence-policy.md)
- [Asset policy](docs/governance/asset-policy.md)
- [Quick Start requirement](docs/requirements/quick-start.md)
- [M1 browser reference-run requirement](docs/requirements/m1-reference-browser-run.md)

Protected ROM and media images are not part of this repository. Local assets are identified by hashes and loaded through ignored local configuration.

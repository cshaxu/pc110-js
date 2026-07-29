# pc110js

Browser-first IBM Palm Top PC 110 emulator project.

This repository is the canonical PC110 emulator project. It owns its startup flow, build system, tests, project structure, and distribution model.

This project starts from a conservative baseline:

- Build a standalone TypeScript codebase.
- Bring in PCjs implementation code through documented, provenance-preserving migration work.
- Organize imported PCjs behavior into the pc110js source layout instead of preserving the original PCjs site/repository layout wholesale.
- Keep the first implementation milestones focused on a complete bootable 486-class PC/AT virtual machine.
- Treat PC110-EMU as a behavioral reference, not as code to translate wholesale.
- Review previous pc110js attempts for lessons, especially `pc110js-v2`, without inheriting their direction blindly.
- Treat NXVM as a source-organization reference, not as implementation code to port.
- Preserve a bootable baseline after every meaningful change.

Project constraints:

- All repository artifacts must be written in English, including source files, documentation, comments, commit messages, scripts, configuration, generated files, and test data.
- Conversations with the project owner may use Chinese, but no Chinese text should be added to this repository.
- TypeScript is the default implementation language. Plain JavaScript is allowed only when unavoidable for scripts, configuration, or external tool compatibility.
- Engineering constraints and contribution rules are documented in [CONTRIBUTING.md](CONTRIBUTING.md).
- Architecture decisions are documented under [docs/architecture](docs/architecture).
- Milestones are documented under [docs/planning](docs/planning).

Reference repositories and assets are expected beside this repository, in this priority order for implementation decisions:

- `../pcjs`
- `../PC110-EMU`
- `../pc110js-v2`
- `../pc110js-v1`
- `../nxvm`
- `../fdd.img`


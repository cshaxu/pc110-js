# NXVM Baseline

- Repository location: `../nxvm`
- Upstream repository: `https://github.com/cshaxu/nxvm.git`
- Branch: `master`
- Commit: `6d6b7d70ab6ed83ab973d27aeea6db88f4e87e4f`
- Commit summary: `6d6b7d7 update license`
- Working tree status at recording time: clean
- Recorded date: 2026-07-28

## Selection Reason

NXVM is used only during M2 as a source-organization and CPU-structure reference:
its layout separates machine orchestration, device modules, platform integration,
console/debugger functionality, and tooling. Its active CPU code may inform
data-model completeness, instruction-coverage planning, and trace design, but
PCjs remains the behavior authority.

NXVM POST, BIOS, guest-service, interrupt-service, device, and platform code
is not reliable evidence because it may contain compatibility hacks. NXVM is
not an implementation source and is not an M3-or-later reference unless the
owner explicitly reauthorizes it.

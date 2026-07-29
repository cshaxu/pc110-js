# PCjs Baseline

- Repository location: `../pcjs`
- Upstream remote: `origin` (`https://github.com/jeffpar/pcjs`)
- Upstream branch: `origin/master`
- Upstream commit: `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`
- Upstream commit summary: `c7f21b4fa Fixed some node package vulnerabilities`
- Working tree status at recording time: the sibling checkout also contains a local `pc110` branch for experiments, but the migration baseline is `origin/master` at the commit above.
- Recorded date: 2026-07-28
- PCx86 source generation selected for the reference baseline: v2
- PCx86 v2 supported CPU ceiling: 80386
- Upstream license file SHA-256: `EE832CFADFFE876903D608599BE7F33983E5F908CBF138A941801FDA1A6E540F`

## Selection Reason

This commit is the latest fetched PCjs upstream `origin/master` commit at the time the pc110-js standalone direction was recorded. M1 must prove a PCx86 v2 DOS boot referenced from this commit before TypeScript implementation work begins. PCjs-derived work must cite this baseline unless a later baseline record supersedes it.

PCx86 v2 defines supported CPU models through the 80386. The M1 reference machine and M2 standalone golden machine must use a supported 80386 configuration. PC110-required 486SX/SL behavior is a separately tested M3 variant or delta, not an implied upstream 80486 implementation.

The PCjs MIT license excludes programs, images, and documentation produced by other parties and included only for archival or demonstration purposes. Source migration must not copy neighboring media or archival content without separate permission.

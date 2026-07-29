# pc110js-v2 Reference Snapshot

- Repository location: `../pc110js-v2`
- Snapshot type: non-Git local directory
- Recorded date: 2026-07-28
- Use: prior investigation evidence and failure-analysis reference

Key file SHA-256 identities:

- `package.json`: `4A6648C5E62D59790B6F7A1528DFB04C8B21526561D10A1EFB9EE56611619833`
- `README.md`: `5A53834C1D295EAA3CA8C9754F563A672913044A9DCA5C54C3821A5E29C1FF5B`
- `docs/PROGRESS.md`: `5748DF4BFDB60D691F4D82D06D4D303850B812E347AEC0B86A5A92C4CF048073`
- `docs/PCJS_BASELINE.md`: `5034A1C0DFAC0DB606A7521ABF0E6854CAA1E42C415A7015011665593A8FD493`
- `src/machine/pc110-profile.ts`: `B7739A0ADD0180BABF91C93D8035839C8DB1A6ADD32185345EBCDFA9F4C015E9`
- `src/machine/pcjs-cpu-adapter.ts`: `29C4C82CB4C4462C602E5BD97A8DE70B4A2C0CBCD2A61681A2155A5B6AF1F003`

The snapshot contains useful ROM traces, hardware questions, and evidence of an attempted PCjs CPU adapter. It also demonstrates the risk of passing numeric model `80486` to a PCjs core that defines support through 80386 and then implementing only selected cache-control opcodes. Use findings as leads; do not inherit its architecture or locally reimplemented generic devices.

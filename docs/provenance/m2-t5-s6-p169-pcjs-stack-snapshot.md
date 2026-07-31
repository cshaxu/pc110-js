# M2 T5 S6 P169 PCjs Stack Snapshot Provenance

## Evidence

The one-million-instruction cold search first narrowed to `F000:A8D4`, opcode
`0x52` (`PUSH DX`), at equal virtual cycle `2,742,177`. The native endpoint
reported `ESP=0xFE`; PCjs reported `ESP=0x100`.

PCjs `opPUSHDX()` calls `pushWord()`, which updates `regLSP`. PCjs's CPU
documentation identifies `regLSP` as the linear SS:SP cache and requires
`getSP()` to read architectural SP. The diagnostic's direct `regESP` read was
therefore not an architectural snapshot.

## Decision

Normalize only the opt-in PCjs diagnostic snapshot through `cpu.getSP()`. This
corrects the oracle field without changing native CPU behavior or accepting a
compatibility exception.

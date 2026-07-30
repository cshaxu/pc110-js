# Compatibility Exceptions Register

This is the sole project-wide register of approved compatibility exceptions.
Do not record an approved exception only in a test, tracking entry,
verification note, or PCjs change report.

Every entry must identify one minimized fixture, normalized differing results,
the relevant authority evidence, its exact scope, and test treatment. When the
rebuilt behavior matches decisive NXVM CPU behavior but differs from PCjs, retain
the NXVM behavior, add a scoped entry here, and continue differential work. Ask
the owner only when NXVM is ambiguous, the rebuilt result does not match NXVM,
or the proposed entry would broaden an existing scope.

## EXC-001: Real-Mode D6 Undefined Opcode

- Fixture: real-mode `D6` at `0000:0000`, `ESP = 0x100`, with IVT vector six
  targeting `0000:0200`.
- Rebuilt result: NXVM-aligned `#UD` delivery pushes the real-mode fault frame,
  changes `ESP` from `0x100` to `0xfa`, and transfers to `0000:0200`.
- PCjs result: advances `EIP` from `0` to `1` without a vector-six transfer or
  stack write.
- Authority evidence: `../nxvm/src/device/vcpuins.c:13605` assigns primary
  opcode `0xD6` to `UndefinedOpcode()`. Ledger P363 requires vector-six
  delivery for D6.
- Scope and test treatment: real-mode primary opcode `D6` only. Retain the
  minimized conflict fixture as expected divergence evidence; it is not a
  passing lockstep case.

## EXC-002: Real-Mode AND AX, Immediate Undefined AF

- Fixture: `05 01 00 0D 02 00 15 01 00 1D 01 00 25 FF 00` in real mode, with
  `EAX = 0xfffe` and `EFLAGS = 0x00000002`; the final instruction is
  `AND AX, 00FFh`.
- Rebuilt result: `AX = 0x00fe`, `EIP = 0x000f`, and `EFLAGS = 0x00000012`.
  AF remains unchanged from earlier arithmetic.
- PCjs result: the same AX and EIP, but `EFLAGS = 0x00000002`; AF is cleared.
- Authority evidence: NXVM `AND_FLAG` at
  `../nxvm/src/device/vcpuins.c:3184` updates only `SF | ZF | PF`; its flag
  helper leaves AF unchanged. The rebuilt logical helper follows this rule.
- Scope and test treatment: real-mode `AND AX, imm16` under this exact
  initialized-AF fixture only. Retain the minimized conflict fixture as
  expected divergence evidence; it is not a passing lockstep case.

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

## EXC-003: 80386 MOV Control Register MOD Field

- Fixture: `0F 20 00` and `0F 22 00` at CPL 0, with `CR0` or `EAX` initialized
  to a distinct 32-bit value.
- Rebuilt result: both forms use ModR/M `reg` as the control-register index and
  `r/m` as the general-register index while ignoring MOD, transferring the
  expected value without a vector-six fault.
- PCjs result: identical. Its 80386 handler documents that early 80386 silicon
  ignores MOD for these two forms and identifies the Compaq DeskPro 386 ROM as
  a real user of MOD `00`.
- Authority evidence: pinned PCjs `x86op0f.js` `opMOVrc`/`opMOVcr` comments
  and handlers; selected DeskPro ROM bytes at `F000:879C`; NXVM is stricter
  here and therefore is not decisive for this documented 80386 compatibility
  behavior.
- Scope and test treatment: only `0F 20` and `0F 22`, CPL 0, with the MOD field
  ignored. Debug and test-register forms retain their existing register-direct
  requirement.

## EXC-004: Volatile RTC Status-C Diagnostic Snapshot

- Fixture: a paused same-media PCjs cold reference immediately before any guest
  `0x71` read, compared with the project-native reset boundary.
- Rebuilt result: RTC `Status C` is zero until its deterministic RTC event path
  raises and the guest reads the latch.
- PCjs result: `Status C` may expose an alarm latch during diagnostic snapshot
  collection because its timer update phase is not part of the lockstep step.
- Authority evidence: PCjs `ChipSet.updateRTCTime()` evaluates alarm matching
  separately from CPU instruction stepping; status C is read-to-clear.
- Scope and test treatment: exclude only `devices.rtc.statusC` from ordinary
  boundary snapshots. Guest `IN 0x71` results remain CPU-state comparisons and
  are not excluded.

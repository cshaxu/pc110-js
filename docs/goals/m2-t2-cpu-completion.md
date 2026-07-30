# M2 T2 CPU Completion Goal

## Authorized Scope

Continue M2 T2 S3 from the current NXVM opcode ledger in numeric family order.
Complete project-native TypeScript 80386 CPU coverage, then complete M2 T2 S6
to prove the rebuilt CPU in the PCjs-assisted integration harness. Do not begin
native M2 T3 hardware, storage, video, PC110, firmware, DOS, guest-service, or
filesystem work.

## Required Method

- Treat NXVM `vcpu.h` and `vcpuins.c` as the decisive CPU coverage and behavior
  authority. Do not translate C source, macros, global state, BIOS, POST, I/O,
  or guest-service code.
- Follow `docs/coverage/m2-t2-nxvm-opcode-ledger.md`. Deliver complete numeric
  opcode families or recorded architectural dependencies, not observed single
  opcodes or ROM-path patches.
- Preserve the frozen legacy CPU only as test and differential evidence. The
  rebuilt CPU must not import it, NXVM, or PCjs at product runtime.
- Keep bridge design limited to documented contracts while S3 coverage is
  incomplete. Start the PCjs-assisted harness only after S3 coverage closure.

## Required Evidence

- Every completed family has focused TypeScript tests, ledger status,
  provenance, tracking, and the required PCjs comparison record.
- The full gate passes for every verified part: format, build, lint, tests, and
  `git diff --check`.
- The rebuilt CPU retains the selected ROM trace and M1 comparison evidence.
- S6 disables the PCjs CPU and reaches the M1 browser workload through the
  rebuilt CPU and temporary PCjs device proxies.

## Completion And Stop

The goal completes only when all NXVM CPU coverage and required architectural
dependencies are closed, S6 passes, all records are committed and pushed, and
the owner is asked for M2 T3 authorization. If the available execution window
ends earlier, stop only at a verified part boundary, update the ledger and
tracking, push the result, and resume from the next incomplete family.

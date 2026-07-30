# M2 T2 CPU Completion Goal

## Authorized Scope

Continue M2 T2 from the current NXVM opcode ledger in numeric family order.
Complete project-native TypeScript 80386 CPU coverage in S3, then close the
remaining S4 memory and S5 I/O/reset/stepping gates before completing final S6
to prove the rebuilt CPU by instruction-level PCjs differential validation. Do not begin
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
- Keep test-only oracle design limited to documented contracts while S3 coverage
  is incomplete. Start the PCjs differential harness only after S3, S4, and S5
  close.

## Required Evidence

- Every completed family has focused TypeScript tests, ledger status,
  provenance, tracking, and the required PCjs comparison record.
- The full gate passes for every verified part: format, build, lint, tests, and
  `git diff --check`.
- The rebuilt CPU retains the selected ROM trace and M1 comparison evidence.
- S6 runs a test-only, isolated PCjs CPU oracle beside the rebuilt CPU, advances
  each implementation by one guest instruction, and compares normalized
  architectural state, memory and I/O effects, exceptions, and fault return
  EIP. PCjs is never a product-runtime dependency.
- The later M2 browser DOS workload is still mandatory. It must run through the
  project-owned CPU, memory, and native PC/AT device implementations; S6 does
  not authorize a PCjs-device proxy runtime or relax that completion gate.

## Completion And Stop

The goal completes only when all NXVM CPU coverage and required S3
architectural dependencies close, S4 and S5 close, S6 passes, all records are
committed and pushed, and the owner is asked for M2 T3 authorization. The M2
milestone still cannot close before its standalone browser DOS workload passes.
If the
available execution window ends earlier, stop only at a verified part boundary,
update the ledger and tracking, push the result, and resume from the next
eligible incomplete unit.

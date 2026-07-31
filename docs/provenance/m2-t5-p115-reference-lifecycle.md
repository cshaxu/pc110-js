# M2 T5 P115 Provenance

- Stable cold lockstep matched 211 boundaries and reached `F000:BB13` with
  equal CPU state but primary PIT channel-one count `17` native versus `18`
  PCjs.
- PCjs diagnostic stepping updates chipset timers before `stepCPU(1)`, then
  adds consumed cycles without a following chipset update before its snapshot.
- Native composition advances its PIT after each completed instruction. The
  PCjs diagnostic after-snapshot now samples its existing timers after cycles
  are added, matching the same virtual boundary.
# M2 T5 P115 Provenance: Reference Lifecycle Observation

The local PCjs diagnostic wrapper exposes computer readiness, CPU readiness,
and CPU running state. The values are read from the already-loaded reference
machine and are not inputs to either emulator.

Controlled replay uses the values to wait for asynchronous initialization to
settle before resetting the shared boundary.

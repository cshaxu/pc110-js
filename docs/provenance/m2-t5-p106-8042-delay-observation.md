# M2 T5 P106 Provenance

- A short same-media ROM lockstep window matched 18 instructions and then first
  differed at 8042 status (`0x18` native, `0x118` PCjs).
- PCjs represents its one-poll controller-response delay with an internal
  `OUTBUFF_DELAY` bit outside the port's eight visible status bits. The native
  controller already represents the same state as `controllerOutputPending`.
- The native diagnostic adapter now projects that existing state to the PCjs
  observation contract and hides OBF until the pending response is published.

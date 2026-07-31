# M2 T5 P106 Verification

- Focused native-adapter coverage verifies a controller self-test reply exposes
  status `0x118`, no visible output buffer, and the retained `0x55` data latch.
- Existing controller tests continue to prove the first status read publishes
  the delayed reply and the second status read exposes OBF.
- A browser replay from the same verified media and paired reset boundary
  matches the first 40 real DeskPro ROM instructions, including the former
  delayed-output mismatch point.

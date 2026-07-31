# M2 T5 S6 P155 Protected Segment-Move Timing Provenance

## Evidence

P154 crossed the selected ROM's memory far jump and localized the next cycle
difference to protected-mode `0018:87AD`, whose bytes are `8E C0`
(`MOV ES,AX`). PCjs charges the ordinary register move two cycles and its
protected segment loader adds 15 cycles while it reads and validates the
descriptor. The selected PCjs execution therefore charges 17 cycles.

## Project-Native Work

The native runner supplies the pre-instruction protection-mode bit to the
cycle estimator. The estimator retains real-mode `MOV Sreg,r/m16` charges of
two register or three memory cycles and adds the generic 15-cycle protected
descriptor-load contribution, producing 17 and 18 cycles respectively.

## Non-Transfer

No PCjs code was copied and no PCjs source was changed. This is a mode and
ModR/M timing rule, not a selector, ROM-address, or profile rule.

# M2 T5 S6 P154 Group Five Far-Jump Timing Provenance

## Evidence

P153's cold diagnostic crossed `MOV EAX,CR0` and localized its next timing
difference to `F000:87A5`, whose bytes begin `2E FF 2E 8A 87`
(`JMP FAR CS:[878Ah]`). PCjs PCx86 v2 Group Five dispatches `FF /5` through
its memory far-jump handler. The selected PCjs execution charges this valid
memory far-jump form 30 cycles.

## Project-Native Work

The TypeScript estimator classifies valid memory `FF /5` as 30 cycles. The
existing project-native Group Four/Five executor retains ownership of pointer
loads, target validation, and code-segment transfer.

## Non-Transfer

No PCjs code was copied and no PCjs source was changed. This is an opcode and
ModR/M timing rule, not a firmware-address or profile rule.

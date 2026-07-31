# M2 T5 S6 P157 STOS Timing Provenance

## Evidence

P156 crossed the DeskPro port `0x61` difference and localized the next timing
difference to `F000:B5B5`, bytes `66 AB` (`STOSD`). PCjs's selected
80286-derived scheduling charges all non-repeated STOS forms three cycles.
The existing project schedule already records its selected REP first and
continuation classes as seven and three cycles.

## Project-Native Work

The native estimator recognizes the complete `AA/AB` STOS byte and
operand-sized family before the general string fallback. It assigns three
cycles when no REP prefix is present and retains the established REP classes.

## Non-Transfer

No PCjs code was copied and no PCjs source was changed. This is an opcode
family rule without ROM-address, profile, or guest-state branches.

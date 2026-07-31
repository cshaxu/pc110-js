# M2 T5 S6 P152 Group Seven Timing Provenance

## Evidence

The cold diagnostic localized its first remaining timing difference to
`F000:8796`, whose bytes are `2E 0F 01 16 78 07` (`LGDT CS:[0778h]`).
PCjs PCx86 v2 dispatches `0F 01` through Group 7 and charges valid memory
forms as follows: `SGDT` 11, `SIDT` 12, `LGDT` 11, `LIDT` 12, `SMSW` 3, and
`LMSW` 6 cycles. The valid register `SMSW` and `LMSW` forms charge 2 and 3
cycles respectively.

## Project-Native Work

The TypeScript estimator classifies all valid Group 7 descriptor-table and
machine-status forms from opcode, ModR/M extension, and memory/register form.
It does not inspect a ROM address, selected firmware bytes, or machine profile.

## Non-Transfer

No PCjs code was copied and no PCjs source was changed. This is a
project-native timing classification derived from documented PCjs observable
handler timing.

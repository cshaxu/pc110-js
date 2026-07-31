# M2 T5 S6 P153 Control-Register Timing Provenance

## Evidence

The P152 cold diagnostic crossed `LGDT` and localized the next cycle difference
to `F000:879C`, whose bytes are `0F 20 00` (`MOV EAX,CR0` using the selected
DeskPro ROM's early-80386 MOD-field compatibility encoding). PCjs PCx86 v2
charges valid `MOV r32,CR0/CR2/CR3` forms six cycles. Its valid
`MOV CRn,r32` forms charge CR0 10, CR2 4, and CR3 5 cycles.

## Project-Native Work

The TypeScript estimator classifies the complete valid `0F 20/22` CR0/CR2/CR3
family from opcode and ModR/M register extension. It intentionally ignores the
MOD field, matching the already implemented early-80386 execution behavior.
The timing decoder now exposes that ModR/M byte for both forms; execution
already decoded it independently.

## Non-Transfer

No PCjs code was copied and no PCjs source was changed. The rule is a native
timing classification and has no ROM-address or profile-specific branch.

# M2 T5 S6 P150 Accumulator Arithmetic Timing Provenance

## Evidence

P149 localized the selected-ROM first cycle difference to `F000:BBC6`, whose
bytes are `24 07` (`AND AL, 07h`). The native estimator fell through to its
two-cycle default. PCjs `X86.opANDAL` uses the accumulator-immediate handler's
three-cycle direct-register path. PCjs uses the same no-effective-address
cycle pattern for the accumulator-immediate arithmetic family.

## Project-Native Work

The TypeScript estimator now classifies the full accumulator arithmetic-
immediate family (`04/05`, `0C/0D`, `14/15`, `1C/1D`, `24/25`, `2C/2D`,
`34/35`, and `3C/3D`) as three cycles. This is an opcode-family rule, not a
ROM-address exception.

## Non-Transfer

No PCjs code was copied. The rule is a project-native timing classification
derived from PCjs observable execution and handler timing structure.

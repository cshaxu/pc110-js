# M2 T5 S6 P165 Cold Oracle Boundary Provenance

## Evidence

The selected upstream DeskPro VGA XML defines low RAM with `test="false"`.
P151 previously localized the resulting PCjs read of `0040:0072` as `0x1234`
and recorded PCjs's own memory-test-bypass behavior. The cold lockstep
configuration deliberately rewrites only this setting to `test="true"`.

## Decision

M1's visible DOS prompt continues to prove the PCjs reference composition,
relative media handling, and floppy image. It is not a cold M2 timing or POST
oracle. Future native-versus-PCjs whole-machine comparisons must use the cold
diagnostic configuration; native browser DOS acceptance must be established
without the marker.

## Boundary

This corrects evidence interpretation only. It changes no PCjs source, native
CPU/device behavior, M1 result, or M2 no-shortcut DOS completion gate.

# M2 T5 S1 P3 Verification: CGA Compatibility

Focused tests cover the full CGA CRTC/mode/color/status group, indexed CRTC
data, retrace state, reset, byte width, and machine composition. The selected
trace advances to 231 instructions at `F000:BB44` and stops at VGA
attribute-controller port `0x3C0`. The full quality gate must pass before this
part is committed.

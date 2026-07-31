# M2 T5 P104 Provenance

- After P102, the natural browser reset boundary first differed at PIT counter
  zero encoding: the native snapshot emitted the raw 16-bit register value
  `0`, while PCjs's diagnostic snapshot emits `65536`.
- PCjs applies this conversion to both reload and current count. The native
  diagnostic adapter now applies the same observable encoding without changing
  its internal 8254 register or timer behavior.

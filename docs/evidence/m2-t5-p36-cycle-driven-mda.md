# M2 T5 P36 Cycle-Driven MDA Evidence

The prior MDA compatibility model permanently set status bit 3 and toggled bit
0 once per executed instruction. The IBM VGA option ROM remained at
`C000:01FB`, repeatedly reading `0x3BA`.

P36 drives MDA status from project-native CPU cycles: bit 0 reports horizontal
or vertical retrace, while bit 3 is limited to the vertical retrace window. It
does not use PCjs's documented VGA diagnostic workaround.

With validated local floppy media, one bounded 5,000,000-instruction Fast run
with a 32-event machine tail reaches `F000:C679`. The last events are native
PIT reads at `0x40` and control writes at `0x43`; no boot or DOS claim follows.

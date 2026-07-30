# M2 T5 P20 ROM Watch Return Evidence

With a validated local floppy and an eight-million-instruction native budget,
the watched outer delay branch `F000:C67C` is hit 1368 times. Its recorded
post-instruction address is `F000:C644`, matching the ROM `LOOP` target.

The delay-return `F000:C67E` is not reached within this shorter budget. This
verifies native post-instruction address observation; the real return caller
requires the already-established longer budget.

# M2 T5 P17 Bounded ROM Trace Evidence

With the validated local floppy, no unbounded event retention, and a
three-million-instruction budget, the native selected-ROM trace completes at
`F000:C679`. Its requested 24-instruction tail remains the PIT benchmark loop.
PIT0 reports reload 65536, count 40813, mode 3, output 1, and a non-null
counter.

The diagnostic itself is no longer the execution limit. The next investigation
must measure the ROM's timer-delta comparison and distinguish CPU cycle charges
from PIT latch/mode semantics before altering either.

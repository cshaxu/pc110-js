# M2 T5 P15 Native Floppy Trace Evidence

With `PC110JS_ROM_TRACE_FLOPPY=1`, the diagnostic trace validates and attaches
the local 1.44MB floppy to native FDC drive 0 before CPU reset. The selected
ROM completes one million native instructions at `F000:C668`, repeating PIT
counter reads and control writes. No FDC command is reached.

The next whole-machine blocker is therefore selected-ROM PIT timing/counter
behavior, not floppy attachment, filesystem behavior, DOS, or a storage hack.

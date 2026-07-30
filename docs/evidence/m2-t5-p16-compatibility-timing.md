# M2 T5 P16 Compatibility Timing Evidence

With `PC110JS_ROM_TRACE_FLOPPY=1` and a one-million-instruction budget, the
native selected-ROM trace completes at `F000:C673`. PIT0 reports reload 65536,
count 9644, mode 3, and a non-null counter. Before this part, the same bounded
trace reported count 27596 at `F000:C668`.

The timer now advances materially faster under generic CPU timing classes, but
the trace has not yet demonstrated an FDC command or a boot. Longer diagnostic
budgets require resumable trace checkpoints before they can be used as
acceptance evidence.

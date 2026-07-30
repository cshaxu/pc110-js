# M2 T5 P18 ROM Watch Evidence

With the validated local floppy and a three-million-instruction native trace,
the ROM hits `F000:C67C` 415 times and reports `ECX=0x11EA` at the last hit.
The delay-return address `F000:C67E` is not reached in this bounded run.

The ROM's outer delay count is therefore decreasing normally from approximately
`0x1389`; it is a long calibration delay, not a PIT threshold or control-flow
stall. A longer native run must allow the ROM to complete that real delay
without reducing it or adding a firmware shortcut.

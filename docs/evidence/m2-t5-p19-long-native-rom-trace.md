# M2 T5 P19 Long Native ROM Trace Evidence

With the validated local floppy and a forty-million-instruction native budget,
the selected ROM completes at `F000:C669`. The delay-return address
`F000:C67E` is hit six times, proving the full outer calibration delay completes
naturally. The later execution is again inside the same real delay routine.

PIT2 is now programmed with reload 1336 in mode 3. No FDC command, boot sector
read, DOS workload, or browser-boot claim is made. The next work remains
whole-machine ROM/device timing coverage, not a delay shortcut.

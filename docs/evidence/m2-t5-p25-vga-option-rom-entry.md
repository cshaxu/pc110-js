# M2 T5 P25 Native VGA Option ROM Entry Evidence

With the selected DeskPro ROM, IBM VGA ROM, and local floppy attached, the
one-million-instruction diagnostic trace completed at `C000:01FB`. It recorded
the native transfers `F000:9B02 -> C000:0003`, `C000:0046 -> F000:F065`, and
returns through `C000:0048` and `C000:014A`. The trace had previously stopped
on sequencer and MDA 16-bit indexed I/O; those transactions now complete.

This is option-ROM execution evidence only. It does not claim a completed VGA
BIOS, floppy boot, or DOS prompt.

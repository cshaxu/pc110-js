# M2 T5 P131 Provenance: Fast Port-Trace Gate

A bounded native ROM benchmark completed 100,000 instructions in about 928 ms
without instruction snapshots. Browser firmware progress remained dominated by
the BIOS PIT polling path, where the application also formatted and retained a
port-tail entry for every port transaction despite Fast Execution not requiring
that observation.

The native checkpoint now accepts an explicit diagnostic port-trace option.
The browser enables it only with `dev-media=1&trace-ports=1`. This preserves
the existing bounded tail for selected diagnostic sessions while removing it
from normal and developer-media Fast Execution. It changes no CPU, device,
virtual-time, I/O, or guest-visible behavior.

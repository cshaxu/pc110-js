# M2 T2 S3 P358: Rebuilt Selected-ROM Trace

The local validation command reads the pinned PCjs DeskPro ROM from the sibling
checkout and runs it through the rebuilt CPU. It does not alter PCjs or copy
firmware into this repository.

The trace confirms reset ROM mapping and direct far-JMP dispatch before the
expected `E6` I/O boundary. PCjs remains the differential authority.

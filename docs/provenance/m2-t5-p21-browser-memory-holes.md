# M2 T5 P21 Browser Memory Holes Provenance

P21 introduced a selected-machine non-faulting physical-hole and I/O profile.
Its original physical-read value was inferred from a native trace rather than a
controlled PCjs comparison. P109 supersedes that physical-read assumption with
the observed PCjs zero value; ignored physical writes and the independent I/O
profile remain project-native.

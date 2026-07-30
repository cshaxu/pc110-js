# M2 T5 P21 Browser Memory Holes Provenance

The selected native ROM trace already uses project-native physical-memory and
I/O-bus profiles that float unpopulated reads and ignore writes. The browser
checkpoint now uses the same selected-machine profiles. No PCjs runtime or
source is imported by the browser product.

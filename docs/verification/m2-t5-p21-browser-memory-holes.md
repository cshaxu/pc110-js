# M2 T5 P21 Verification: Browser Memory Holes

Historical P21 focused tests covered non-faulting physical and I/O accesses.
P109 replaces its unverified physical `0xFF` expectation with the controlled
PCjs zero-read evidence. Ignored physical writes and unpopulated-I/O behavior
remain covered separately.

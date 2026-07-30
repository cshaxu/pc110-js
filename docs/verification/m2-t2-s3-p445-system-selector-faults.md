# M2 T2 S3 P445 Verification: System Selector Fault Classification

Focused rebuilt CPU tests verify that LLDT and LTR select a valid non-present
descriptor, reach the protected `#NP` handler, preserve `selector` as the
error code, and do not change LDTR or TR. The full project gate passed.

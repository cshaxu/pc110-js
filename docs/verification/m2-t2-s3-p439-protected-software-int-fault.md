# M2 T2 S3 P439 Verification: Protected Software-INT Fault Delivery

The focused rebuilt interrupt suite executes a CPL3 `INT` whose gate DPL is too
low. It reaches the ring-zero `#GP` handler through the TSS stack and pushes
IDT error code `0x0182`; no host exception escapes. The full project gate passed.

# M2 T2 S3 P437 Verification: Protected IRET Fault Delivery

The focused interrupt suite executes a CPL3 IRET frame targeting ring zero. It
reaches the rebuilt ring-zero `#GP` handler through the TSS stack, preserves the
faulting instruction EIP, and pushes error code `0x0008`. The full project gate
passed.

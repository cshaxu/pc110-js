# M2 T2 S3 P449 Verification: System Selector Page Faults

Focused rebuilt CPU evidence verifies LLDT preserves a GDT descriptor `#PF`
and records CR2 instead of converting the fault to `#GP`. The full project gate
passed.

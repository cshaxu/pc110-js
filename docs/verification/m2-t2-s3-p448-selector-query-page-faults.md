# M2 T2 S3 P448 Verification: Selector Query Page Faults

Focused rebuilt CPU evidence verifies VERR delivers `#PF` and records CR2 for
an unmapped active-LDT descriptor instead of clearing ZF. The full project gate
passed.

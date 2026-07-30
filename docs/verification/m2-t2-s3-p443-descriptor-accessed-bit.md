# M2 T2 S3 P443 Verification: Descriptor Accessed-Bit Writeback

Focused segment-loader tests verify that successful protected GDT code, data,
and stack loads set their Accessed bits, that an active-LDT data load does the
same, and that a rejected descriptor remains unchanged. The full project gate
passed.

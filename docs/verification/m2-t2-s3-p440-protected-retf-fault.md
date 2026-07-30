# M2 T2 S3 P440 Verification: Protected RETF Fault Delivery

The focused stack-frame suite executes a CPL3 RETF through a null selector. It
reaches the rebuilt ring-zero `#GP(0)` handler through the TSS stack and retains
the original return-frame stack state. The full project gate passed.

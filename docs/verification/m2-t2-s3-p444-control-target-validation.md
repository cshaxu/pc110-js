# M2 T2 S3 P444 Verification: Control-Transfer Target Validation

Focused control-transfer tests verify that a protected FAR JMP beyond its target
code limit reaches the rebuilt `#GP` handler with the source instruction EIP
and original CS. The full project gate passed.

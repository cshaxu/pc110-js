# M2 T2 S3 P333: Rebuilt TEST ModR/M Family

The rebuilt CPU now executes `84/85` TEST register and memory forms, including
operand and address-size overrides plus segment override. TEST updates flags
without writing operands.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.

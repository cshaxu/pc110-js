# M2 T2 S6 P17 Verification: Short Conditional Interval

The generic differential harness executes `70 00` through `7F 00` in real
mode. All sixteen logical instruction boundaries match PCjs EIP, EFLAGS,
register state, memory delta, and I/O journal output.

# M2 T5 S5 P2 Verification: Native COM1 UART

Focused UART and rebuilt-machine tests pass. The selected ROM trace crosses
COM1 IIR `0x3FA` and reaches the distinct COM2 IIR dependency at `0x2FA`.
The full repository quality gate is required before this part is committed.

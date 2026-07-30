# M2 T5 S1 P7 Verification: PC/AT Refresh Status

Focused tests cover bit-4 refresh output and preserve the existing timer-2 and
speaker contract. The selected 200,000-instruction trace moves past the ROM's
port-`0x61` refresh loop to `F000:B5F7`. The full quality gate must pass before
this part is committed.

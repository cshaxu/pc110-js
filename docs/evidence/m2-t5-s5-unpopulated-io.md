# M2 T5 S5 Unpopulated I/O Evidence

- Focused tests retain strict defaults and independently verify `0xFF` reads
  and ignored writes under the selected machine policy.
- The selected 1,000,000-instruction ROM trace proceeds past the absent
  `0x3BC` probe and completes its budget at `F000:C66F`.

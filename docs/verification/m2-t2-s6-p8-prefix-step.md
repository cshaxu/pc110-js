# M2 T2 S6 P8 Verification: Logical Prefix Step

The oracle reads the PCjs CS:IP byte stream, counts recognized instruction
prefixes, then executes one PCjs debugger step per prefix plus one opcode step.
The `66 ED 66 EF` program passed two lockstep comparisons with a declared
32-bit DX port and input value `0x12345678`.

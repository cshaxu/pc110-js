# M2 T5 S6 P151 Cold Diagnostic Reset Provenance

## Evidence

After P150, the first selected-ROM difference was `MOV AX,[0072h]` at
`F000:B559` with `DS = 0040h`. PCjs returned `0x1234` from BDA `0040:0072`;
the project-native machine returned zero. The selected PCjs machine XML sets
`ramLow test="false"`, and PCjs `ram.js` explicitly labels its resulting
write of `0x1234` to `0x472` as a memory-test-bypass hack.

## Project-Native Work

Only the generated PCjs diagnostic XML changes `ramLow test="false"` to
`test="true"`. This establishes a cold, no-shortcut comparison boundary. The
M1 reference configuration and all product runtime modules are unchanged.

## Non-Transfer

The native machine continues to model no synthetic warm-reset flag. No PCjs
source, firmware behavior, or warm-boot shortcut is transferred.

# M2 T3 S7 BIOS POST Checkpoint Evidence

## Claim

The selected DeskPro 386 ROM's first missing I/O operation is a real spare DMA
page-register write at `0x84`, used as a POST checkpoint. It requires durable
byte-register behavior, not an ignored diagnostic-port write.

## Evidence

- Level: Strong.
- Source: pinned read-only PCjs
  `machines/pcx86/modules/v2/chipset.js`, DMA Page Registers commentary and
  selected 5170 port input/output tables for `0x80`, `0x84`, `0x85`, `0x86`,
  `0x88`, `0x8C`, `0x8D`, and `0x8E`.
- Reproduction: `pnpm run trace:rebuilt-rom` reports the two-instruction stop
  at `F000:F907` on `Unmapped I/O write port: 0x84` before P2.

## Accepted Boundary

The spare cells are project-native hardware state. They do not imply a DMA
transfer, storage device, display device, firmware modification, browser
presentation, DOS execution, or PC110 behavior.

## P2 Trace Result

After native spare-register composition, `pnpm run trace:rebuilt-rom` executed
34 instructions and reached `F000:F94F` before stopping on
`Unmapped physical read at 0xE0000`. This proves the source-established `0x84`
path advances through real device state.

## P3 Floating-Bus Result

With explicit selected-machine floating-bus behavior, the trace reaches
`F000:F9B6` after 63 instructions and stops at `Unmapped I/O write port: 0xF1`.
No RAM, ROM, firmware, or port response was synthesized.

## P4 FPU-Control Evidence

- Level: Strong.
- Source: pinned read-only PCjs `chipset.js`, `FPU.PORT_CLEAR` (`0xF0`),
  `FPU.PORT_RESET` (`0xF1`), and their MODEL_5170 output handlers.
- Required behavior: byte-wide zero output signals clear-busy or reset; an
  x87 is invoked only when it exists.
- Accepted boundary: project-native signal state is sufficient for the
  selected trace. FPU instruction execution remains unimplemented.

## P4 Trace Result

The native control pair advances the selected trace to 197 instructions at
`F000:BAFF`, where it stops at `Unmapped I/O write port: 0x4B`. The next part
must classify that owner before extending the machine.

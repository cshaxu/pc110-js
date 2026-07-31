# M2 T5 P44 Provenance

- Authority: pinned DeskPro ROM byte inspection at `F000:DCA6` plus the
  project-native 8042-to-IRQ1 integration tests.
- Evidence: `F000:DCA7` calls `F000:C242`, which compares BDA keyboard queue
  head and tail at offsets `0x1A` and `0x1C`. The following `JZ F000:DCA6`
  repeats while the queue is empty.
- Interpretation: the observed boundary requires real guest keyboard ingress,
  not an FDC, VGA, timer, or firmware workaround.
- Boundary: no ROM byte is copied into the product and no keyboard, BIOS, or
  device behavior changes. The browser change only makes the existing input
  surface focusable and corrects its status label.

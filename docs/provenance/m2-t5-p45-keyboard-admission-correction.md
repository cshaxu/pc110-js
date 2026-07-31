# M2 T5 P45 Provenance

- Authority: P40 browser checkpoint reported controller command byte `0x5D`
  with the keyboard clock disabled.
- Correction: an empty BDA keyboard queue alone does not establish that raw
  browser input can enter the guest. Native controller admission must be
  observed before a keyboard peripheral or browser-input behavior is changed.
- Boundary: no firmware, controller, keyboard, BIOS, or input behavior changes
  in this planning correction.

# M2 T2 S4 Physical Memory Provenance

## Identity

- Subsystem: project-native physical RAM, ROM, and A20 mapping.
- Source contract: M1 DeskPro 386 machine contract at PCjs commit
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## P7 Mapping

P7 adds project-native explicit RAM-region mapping to represent the selected
M1 low RAM, DeskPro RAM window, and extended RAM regions. It does not import
PCjs runtime code, add a device model, or add firmware, DOS, or guest-service
behavior. ROM remains immutable and A20 normalization remains at the physical
bus boundary.

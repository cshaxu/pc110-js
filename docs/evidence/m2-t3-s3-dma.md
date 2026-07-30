# M2 T3 S3 DMA Evidence

## Claim

The selected PC/AT has DMA0 at `0x00-0x0f`, DMA1 on even ports `0xc0-0xde`,
DMA1 channel 4 as the DMA0 cascade, and the selected DMA page-register map.

## Evidence

- Level: Strong.
- Source: pinned read-only PCjs `machines/pcx86/modules/v2/chipset.js`, DMA0,
  DMA1, status, page-register, and port-dispatch definitions.
- Reproduction: inspect those definitions and controller register handlers
  alongside focused project-native register and transfer tests.

## Accepted Boundary

T3 S3 models generic controller state and explicit data movement. It does not
invent a device request source or couple the controller to FDC, BIOS, DOS, or
storage behavior.

## Competing Explanations

PCjs contains model-specific status and ROM-test workarounds. They are excluded
unless a later selected-machine workload establishes an independent need.

## Regression Target

Focused controller, port, page, transfer, and cascade tests will accompany
each executable part.

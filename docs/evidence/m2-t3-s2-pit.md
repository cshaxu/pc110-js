# M2 T3 S2 PIT Evidence

## Claim

The selected PC/AT maps the primary PIT counters to `0x40-0x42` and the control
word to `0x43`; counter 0 signals IRQ0 and counter 2 supplies the speaker clock.

## Evidence

- Level: Strong.
- Source: pinned read-only PCjs `machines/pcx86/modules/v2/chipset.js`, PIT0
  definitions and timer/IRQ0/port dispatch paths.
- Reproduction: inspect PIT0 definitions and the `inTimer`, `outTimer`,
  `updateTimer`, and port-notification paths against focused project tests.

## Accepted Boundary

S2 models deterministic PIT behavior and exposes counter-2 output. It does not
model the `0x61` gate or emit host audio; those require T3 S5 and later browser
presentation work.

## Competing Explanations

No selected PC/AT evidence supports implementing speaker gating inside the PIT
or using a host timer as an IRQ0 substitute.

## Regression Target

Focused counter tests and native PIT-to-PIC-to-CPU integration tests will be
added with each executable part.

# M2 T5 P72 PCjs Change Report: Development Keyboard Control

## Basis

PCjs is the browser and whole-machine behavior authority. This development
control does not change a PC/AT hardware model; it drives the existing
project-native browser input boundary for bounded automated verification.

## Project Change

When `?dev-media=1` is present, `Send A` enqueues the same Set-1 make and
break sequence as a browser `KeyA` event. Native scan-code admission now follows
the 8042 clock gate rather than conflating it with the data-inhibit bit.
Production and ordinary development URLs expose no control.

## Boundary

The control does not synthesize guest-visible state or depend on PCjs runtime
code. It is test instrumentation at the host input boundary only.

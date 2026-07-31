# M2 T5 P76 PCjs Change Report: BDA Keyboard Observation

## Basis

PCjs remains the browser whole-machine reference. The selected ROM directly
establishes the BDA keyboard ring as the relevant completion boundary.

## Project Change

The development status now displays the native BDA keyboard head and tail
pointers. It is read-only diagnostic presentation over existing machine RAM.

## Boundary

No PCjs source is copied or used at runtime. No guest-state, device, input,
firmware, timer, or interrupt behavior changes.

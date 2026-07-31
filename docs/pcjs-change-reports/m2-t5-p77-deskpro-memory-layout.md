# M2 T5 P77 PCjs Change Report: DeskPro Memory Layout

## Basis

PCjs's selected DeskPro 386 machine configuration declares three distinct RAM
regions. The selected ROM also documents relocatable high memory behavior.

## Project Change

The project adds an explicit DeskPro memory-profile factory and uses it for the
native browser checkpoint and reference ROM trace. Generic PC/AT construction
is unchanged.

## Boundary

No PCjs code is copied or used at runtime. The change adds only real writable
RAM apertures; it does not modify CPU, firmware, devices, input, timing, or
guest-visible service behavior.

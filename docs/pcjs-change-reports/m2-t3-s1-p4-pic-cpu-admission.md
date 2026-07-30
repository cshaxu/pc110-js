# M2 T3 S1 P4 PCjs Change Report: PIC CPU Admission

## Summary

- Affected PCjs-derived subsystem: PC/AT PIC to CPU interrupt admission.
- Changed product behavior: project-native machine composition only.

## Basis

- The selected PC/AT model requires a pending PIC request to remain latched
  until the CPU can accept maskable INTR and then receive the acknowledged PIC
  vector.

## Boundary And Verification

- The machine core uses only local PIC and rebuilt CPU interfaces; it imports
  no PCjs code, device, firmware, or browser resource.
- Focused tests cover IF gating, HLT wake-up, and STI inhibition without an
  interrupt source, BIOS, DOS, or device-response shortcut.

## Future Path

- PIT and later devices may raise project-native IRQs through this interface.

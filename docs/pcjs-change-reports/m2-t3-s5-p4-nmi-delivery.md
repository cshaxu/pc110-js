# M2 T3 S5 P4 PCjs Change Report: NMI Delivery

## Summary

- Affected PCjs-derived subsystem: NMI mask and CPU vector-2 delivery relation.
- Changed product behavior: adds project-native non-maskable vector admission
  and delivery gated by the existing RTC address-mask state.

## Basis

- PCjs documents NMI masking through the CMOS address port and invokes the CPU
  NMI exception path independently of maskable interrupt admission.

## Boundary

- No PCjs import, NMI error source, DeskPro error line, 8042 command protocol,
  A20, reset, firmware, storage, media, or guest-service behavior is added.

## Verification

- Focused runner and machine tests verify vector-2 IVT delivery despite IF and
  HLT state, RTC mask rejection, and native interrupt tracing.

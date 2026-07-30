# M2 T3 S4 P5 PCjs Change Report: Browser RTC Checkpoint

## Summary

- Affected PCjs-derived subsystem: RTC/CMOS reset status observation.
- Changed product behavior: adds browser presentation of project-native RTC
  status A-D and the retained NMI-mask boundary.

## Basis

- PCjs documents the selected default status-register meanings and address-port
  NMI-mask relation. The browser presents only the local TypeScript state.

## Boundary

- No PCjs runtime, host time, clock scheduling, NMI delivery, firmware, media,
  storage, display emulation, keyboard emulation, or DOS behavior is added.

## Verification

- Manual local-browser inspection verified reset values before and after Reset,
  with no warning or error in the browser console.

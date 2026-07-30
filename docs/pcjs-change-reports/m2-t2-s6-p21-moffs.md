# M2 T2 S6 P21 PCjs Change Report: Moffs Interval

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential oracle.
- Changed product behavior: none.

## Justification

- A generic moffs program extends memory side-effect validation without a
  special oracle path.

## Verification

- All A0-A3 accumulator moffs forms match PCjs per instruction.

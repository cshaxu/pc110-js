# M2 T5 P114 Verification

- The lockstep comparator test proves a Status-C-only change is ignored while
  ordinary CPU and selected-device fields remain compared.
- Fresh cold replay must pass the former reset boundary and classify any guest
  visible RTC read difference normally.

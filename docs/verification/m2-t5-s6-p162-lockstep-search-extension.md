# M2 T5 S6 P162 Lockstep Search Extension Verification

## Check

- The diagnostic batch remains 1,024 instructions.
- The reset-to-first-difference limit is 131,072 instructions.
- The coordinator still compares each batch boundary and restarts from the
  ordinary deterministic reset only to replay a mismatched final batch.

## Boundary

This authorizes one bounded first-difference search for the confirmed native
browser versus M1 PCjs boot divergence. It retains no long instruction trace,
does not alter CPU or device behavior, and is not a DOS-boot claim.

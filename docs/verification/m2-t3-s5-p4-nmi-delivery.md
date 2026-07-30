# M2 T3 S5 P4 Verification: NMI Delivery

Focused runner and machine tests verify a queued vector-2 NMI ignores IF and
maskable-interrupt inhibition, resumes HLT through the real-mode IVT, and is
rejected while RTC address bit 7 masks NMI. The full quality gate passes. No
hardware error source, 8042, A20, reset, firmware, storage, media, or browser
workload behavior is claimed.

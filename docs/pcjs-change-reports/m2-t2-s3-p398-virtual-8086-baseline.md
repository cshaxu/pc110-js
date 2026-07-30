# M2 T2 S3 P398: Virtual-8086 Baseline

No PCjs source was modified or copied. This project-owned CPU change uses NXVM
as the authorized CPU behavior authority: virtual-8086 mode retains paging but
uses real-style segment bases and 16-bit execution defaults. PCjs remains a
later compatibility comparison source; no PCjs runtime dependency was added.

The implementation is limited to execution, segment, stack, and memory access
basics. It deliberately does not synthesize v86 interrupt, I/O-permission,
POPF, or IRET behavior while the required TSS and protection paths remain
incomplete.

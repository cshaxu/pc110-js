# M2 T2 S3 P395: Rebuilt Fetch Fault Delivery

The rebuilt executor now converts typed instruction-fetch faults before opcode
dispatch and emits an explicit trace fault event. No PCjs source or runtime code
is used. This preserves generic 80386 fetch-fault behavior; descriptor codes,
double-fault escalation, and privilege-changing delivery remain separate work.

# M2 T2 S3 P394: Rebuilt Access Fault Delivery

The rebuilt executor now converts project-native typed page and segment access
errors into architectural fault delivery after instruction decoding. No PCjs
source or runtime import is used. This preserves generic 80386 fault frames;
fetch faults, descriptor error codes, privilege stack switching, and escalation
remain separate event-system work.

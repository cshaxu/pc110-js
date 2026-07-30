# M2 T4 S3 P4 PCjs Change Report: PIO Read

PCjs `hdc.js` establishes the retained AT data-port byte/word order, per-sector
status progression, and interrupt behavior. This part implements an original
TypeScript state machine over native raw sectors. It imports no PCjs source or
runtime and adds no disk auto-attachment, write, filesystem, firmware, or
guest-service behavior.

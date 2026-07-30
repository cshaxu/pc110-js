# M2 T4 S3 P5 PCjs Change Report: PIO Write

PCjs `hdc.js` establishes the retained AT data-port order and per-sector write
progression. This part implements original TypeScript state over native raw
media, with explicit write-protection handling. It imports no PCjs source or
runtime and adds no host-path, filesystem, firmware, or guest-service behavior.

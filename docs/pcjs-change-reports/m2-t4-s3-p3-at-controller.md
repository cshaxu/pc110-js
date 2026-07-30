# M2 T4 S3 P3 PCjs Change Report: Primary AT Controller

PCjs `hdc.js` establishes retained primary port, reset, status, selection, and
non-data command behavior. This part implements original TypeScript controller
state and IRQ14 composition. It imports no PCjs runtime/source and supplies no
PIO sector data, firmware, DOS, filesystem, or guest shortcut.

# M2 T5 P89 PCjs Change Report: 8042 Output Latch Alignment

## Basis

The same-page diagnostic probe showed that PCjs keeps the 8042 output-data
latch readable after a guest data-port read has cleared OBF.

## Change

The project-native controller separates the retained output-data latch from
output-buffer availability and includes it in capture/restore state.

## Boundary

No PCjs source changed. This is controller register behavior only; it adds no
BIOS, DOS, guest-service, input, timing, or hardware workaround.

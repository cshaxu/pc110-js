# M2 T5 S6 P161 Native Browser POST Checkpoint Provenance

## Evidence

The browser started only the project-native `pc-at-386` machine with
development-local, hash-validated media. The page had no PCjs reference frame
or product-runtime dependency. Native status exposed CPU, PIC, PIT, DMA, FDC,
RTC, system-port, 8042, and BDA observations before the user-agent paused it.

## Result

The observed status at pause was `F000:C660`, with FDC `MSR 80`, drive zero
ready, pending IRQ6, and no pending DMA byte. The pinned ROM data at the
corresponding code path contains only PIT control/data port activity. This
classifies the next work as normal POST progression rather than a missing FDC
response.

## Boundary

No emulator behavior, ROM, device response, or PCjs source changed. The
browser tab was closed immediately after the bounded check.

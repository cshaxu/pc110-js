# M2 T5 P70 PCjs Change Report: Keyboard Reset Protocol

## Basis

The selected DeskPro ROM sends `0xFF` to port `0x60`, waits for `0xFA`, then
waits for `0xAA` before `0xAE`. PCjs routes keyboard commands through its 8042
path and models keyboard reset responses while preserving a one-byte controller
output buffer.

## Project Change

The native AT keyboard now emits ACK and BAT for reset. The adapter queues the
second byte until the guest consumes the first output byte.

## Boundary

This is a project-native TypeScript implementation. PCjs source was consulted
as behavioral authority; no PCjs code or runtime dependency was copied.

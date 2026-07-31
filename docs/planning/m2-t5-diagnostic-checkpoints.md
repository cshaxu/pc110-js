# M2 T5 Diagnostic Checkpoints

## Purpose

Diagnostic checkpoints support a bounded Full Debug replay after a Fast run
finds a mismatch or unexpected whole-machine boundary. They are not save-state
product features and do not alter browser runtime behavior.

## Atomic State Boundary

A restorable checkpoint must capture and restore atomically:

- rebuilt CPU architectural and hidden state, including interrupt inhibition;
- physical A20 state and every writable RAM byte, excluding immutable ROM;
- cycle-clock time and PIT, RTC, and FDC-DMA fractional remainders;
- PIC, PIT, RTC, DMA, system port, keyboard controller/output port, FPU
  control, FDC and mounted-media progress;
- native VGA compatibility/register/plane state and optional DeskPro timer;
- serial, parallel, fixed-disk, and other attached native device state;
- pending NMI, ordered external input events, machine configuration, ROM and
  media hashes, project commit, and virtual instruction position.

An observational `snapshot()` without a corresponding restore operation is not
a checkpoint. CPU/RAM-only restoration is insufficient for a machine replay.

## Delivery Order

1. Add private project-native restore contracts with focused round-trip tests
   for CPU state, RAM/A20, scheduler, and each already-composed device.
2. Compose those contracts in an in-memory diagnostic checkpoint that is
   bounded to one active checkpoint and never exposed to browser runtime UI.
3. Verify save, deterministic mutation, restore, and equal short continuation
   for CPU, memory, port effects, virtual cycles, devices, and stop reason.
4. Have the ROM diagnostic runner record Fast identities and checkpoints at an
   explicit bounded interval. On a diagnostic trigger, replay only the short
   interval from the nearest verified checkpoint with Full Debug.

## Non-Goals

This plan does not authorize persistent save files, PCjs/NXVM runtime use,
firmware changes, timer shortcuts, synthetic interrupts, or guest-service
behavior.

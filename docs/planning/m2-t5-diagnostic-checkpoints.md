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

1. Keep Fast execution limited to replay identity, sparse verified checkpoints,
   and an observed boundary. It must not collect full snapshots or become a
   routine whole-machine replay workflow.
2. Use short programs, differential checks, and short ROM checkpoints for
   normal CPU and device work. A mismatch or unexpected boundary is the trigger
   for diagnostic restore work, not a reason to preemptively add every device
   snapshot contract.
3. When a deterministic Full Debug replay is actually required, implement only
   the missing project-native restore contracts needed for that bounded failing
   interval, then verify save, mutation, restore, and equal continuation.
4. Keep any composed checkpoint in memory, bounded to one active diagnostic
   checkpoint, and outside browser product UI. It must still meet the atomic
   state boundary above before it is claimed as a whole-machine replay point.
5. P66 implements the first runner integration: an opt-in Fast `CS:EIP`
   checkpoint takes one atomic capture, then an opt-in Full Debug replay is
   limited to 10,000 instructions and repeated once to prove deterministic
   continuation. Long Fast runs remain free of trace tails and snapshots.

## Non-Goals

This plan does not authorize persistent save files, PCjs/NXVM runtime use,
firmware changes, timer shortcuts, synthetic interrupts, or guest-service
behavior.

# M2 T2 S3 P276: Contextual MOV Segment

## Summary

Route `8C` and `8E` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 segment selectors remain
16-bit for these instructions, while address-size selects the ModR/M memory
form. Loading a segment retains existing mode-aware descriptor validation.

## Change

The context dispatcher now uses one project-native helper for selector stores
and loads. It reuses shared ModR/M decoding and existing segment-load behavior
without copied PCjs code.

## Verification

A controlled protected-mode fixture verifies an unprefixed 32-bit-addressed
selector store and a `67` 16-bit-addressed selector load through a minimal GDT
data descriptor, including EIP. The full project gate passes.

## Boundary

This slice excludes segment overrides, interrupt-inhibition timing after MOV
SS, descriptor-model expansion, devices, firmware, PC110, and M2 T3 work.

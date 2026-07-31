# M2 T5 P71 PCjs Change Report: Keyboard Data Clock Release

## Basis

The selected ROM sends keyboard data before issuing `0xAE`. PCjs clears the
8042 `NO_CLOCK` command-byte bit before routing such data to the keyboard.

## Project Change

The native adapter now releases that clock inhibit before dispatching a direct
keyboard byte. Controller-directed data writes retain their existing behavior.

## Boundary

This is a project-native TypeScript implementation. PCjs is behavioral
authority only; no PCjs source or runtime dependency was copied.

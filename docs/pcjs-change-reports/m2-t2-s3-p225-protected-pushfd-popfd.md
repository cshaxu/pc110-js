# M2 T2 S3 P225: Protected-Mode PUSHFD And POPFD

## Summary

This change adds the bounded 32-bit stack forms of `PUSHFD` and `POPFD` (`66 9C` and `66 9D`)
for the existing CPL-zero protected-mode path. `PUSHFD` excludes VM and RF; `POPFD` retains the
current VM and RF bits while restoring the other supplied flags.

## Basis

PCjs is the behavioral authority for M2. Its `opPUSHF` and `opPOPF` behavior explicitly excludes
VM and RF from the pushed value and prevents POPFD from changing either bit. The implementation
uses the project-owned 32-bit stack and EFLAGS state boundaries rather than copying PCjs source.

## Scope And Risk

The implementation requires the existing protected-mode, CPL-zero, 32-bit-stack path. IOPL-based
permission checks, virtual-8086 behavior, and nonzero-CPL `#GP(0)` delivery remain deferred.
The existing 16-bit PUSHF and POPF forms are unchanged.

## Verification

The focused regression verifies the pushed dword excludes VM/RF, POPFD restores ordinary flags,
VM/RF remain unchanged, and ESP and EIP advance through both instructions. Normal repository
gates run before this part is committed.

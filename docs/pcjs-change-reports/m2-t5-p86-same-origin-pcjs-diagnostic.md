# M2 T5 P86 PCjs Change Report: Same-Origin Diagnostic Surface

## Basis

The native firmware reached a keyboard-related whole-machine boundary where a
short PCjs comparison may be useful, but a separate reference URL was blocked
by the browser control surface.

## Change

No PCjs repository file changed. An opt-in Vite middleware serves the existing
temporary PCjs diagnostic machine and its already instrumented local bundle
from the native development origin.

## Boundary

This is development-only comparison infrastructure. Production builds, default
browser pages, and native emulation contain no PCjs runtime import or path.

# M2 T5 P75 Verification

- Browser status after queued A and F1 attempts retains `CMD 5D`, `KBD 0`, and
  `SCAN 0`; the native controller correctly refuses ordinary scan admission.
- No code change is included. `git diff --check` passes.

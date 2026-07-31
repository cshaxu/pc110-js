# M2 T5 P53 Provenance

- Authority: the owner authorized a temporary local control to unblock
  browser-native media verification.
- Contract: only the Vite development server may expose three fixed endpoints,
  configured exclusively by process environment variables; `?dev-media=1`
  reveals the control.
- Boundary: bytes still pass the existing expected-size and SHA-256 checks.
  Production builds, default browser URLs, persisted configuration, and
  emulation behavior contain no host path, automatic mount, or fallback.

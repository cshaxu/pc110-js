# M2 T5 P96 Verification

- TypeScript build, formatting, and lint validate the development-only browser
  bridge and its typed untrusted-iframe boundary.
- P96 reuses P95 focused coverage proving precondition mismatches do not step
  either endpoint.
- A browser control is now available only with both `dev-media` and
  `pcjs-reference` enabled. Its first use is expected to report an entry
  mismatch until an equivalent reset checkpoint is established; that is an
  intended stop condition, not an approved compatibility exception.

# M2 T5 P95 Verification

- Focused tests prove that equal snapshots pass and that a changed register
  reports the first deterministic field path.
- The npm full gate validates the comparator alongside the existing CPU and
  differential suites.
- This part is a comparison primitive only. It does not claim an equivalent
  reset boundary, browser bridge, device comparison, or whole-machine result.

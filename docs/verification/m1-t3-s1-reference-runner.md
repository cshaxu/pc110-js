# M1 T3 S1 Verification: Reference Runner

## Result

Pass for the project-owned serving boundary.

## Commands

- `pnpm install`
- `pnpm run build`
- `node dist/reference/reference-server.js`
- `Invoke-WebRequest` checks for `/_pc110js/health`, the generated machine XML,
  the pinned PCx86 release, and the local floppy endpoint.

## Observed Facts

- The server accepted the verified sibling checkout and local floppy, then
  reported the pinned PCjs commit and expected SHA-256.
- All four endpoints returned HTTP 200.
- PCjs `disk.js` loads a binary response through `buildDisk(ArrayBuffer)`;
  `fdc.js` passes the generated `autoMount` path to that normal FDC path.
- The host only serves an in-memory read of `../fdd.img`; no write operation is
  present in the runner.

## Browser Note

The bundled in-app browser returned `ERR_BLOCKED_BY_CLIENT` for both
`127.0.0.1` and `localhost`, before making a request. This is a browser-tool
restriction, not a runner response. M1 T3 S2 retains the required interactive
browser boot acceptance on a normal local browser.

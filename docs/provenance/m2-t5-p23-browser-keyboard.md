# M2 T5 P23 Browser Keyboard Provenance

The browser-only Set-1 mapping and queue are original TypeScript. The native
8042 receives only raw bytes through its existing public ingress boundary; it
does not import browser APIs or know DOM keyboard semantics.

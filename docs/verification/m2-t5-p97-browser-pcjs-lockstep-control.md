# M2 T5 P97 Verification

- A local server served the P96 development page, same-origin PCjs wrapper,
  selected machine XML, and regenerated `2.25` bundle with HTTP `200`.
- Browser inspection of the direct wrapper found the opt-in PCjs control at
  version `2`, with snapshot and step functions registered after ordinary
  DeskPro BIOS execution. The wrapper reported its component inventory and
  bounded 8042 transaction tail.
- The in-app automation proxy could not read the nested iframe document from
  the parent page, while the direct same-origin wrapper loaded normally. This
  is a browser-automation surface limitation, not a CPU or device difference.
- No cross-machine comparison is claimed: the two machines still need an
  explicitly equivalent entry checkpoint and selected device snapshots.

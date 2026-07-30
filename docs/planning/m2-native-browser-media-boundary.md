# M2 Native Browser Media Boundary

The native browser runtime requires explicit, validated user-provided firmware
and raw-media inputs before it can execute the selected DeskPro ROM or boot the
known DOS floppy. The current reference server's `../fdd.img` use is M1 PCjs
reference evidence only and is not a product-runtime asset contract.

The M2 browser must not fetch from `../pcjs`, a host filesystem path, or a PCjs
machine configuration at runtime. It must accept a selected firmware image and
raw floppy image through a browser-owned loader, validate their manifest
metadata and hashes, then explicitly map/attach them to the native core.

No ROM or disk bytes are added by this planning record. Firmware distribution
and license provenance must be confirmed before an embedded default asset is
considered. A user-selected local file remains the safe initial product path.

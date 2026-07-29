# Local Asset Contract

M2 consumes protected media through a local manifest. Each asset has a logical
ID, forward-slash relative path, byte length, SHA-256, and required flag.

`local-assets/manifest.example.json` names the known-good DOS floppy without
including its bytes. A local owner places the image at the stated ignored path
or supplies the same verified bytes through a later browser file adapter.

Validation runs before a device accepts asset bytes. Asset validation is shared
between browser and Node hosts and uses Web Crypto SHA-256; it does not encode
machine-specific absolute paths or guest filesystem knowledge.

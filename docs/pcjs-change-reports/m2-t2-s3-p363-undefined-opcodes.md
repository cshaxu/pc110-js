# M2 T2 S3 P363: Rebuilt Undefined Opcodes

This change routes the NXVM-defined D6 and D8-DF undefined encodings through
the project-native vector-6 event path. It changes no PCjs source and imports
no PCjs runtime code. PCjs remains a comparison authority for fault delivery.

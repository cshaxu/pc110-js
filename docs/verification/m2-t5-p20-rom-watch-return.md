# M2 T5 P20 Verification: ROM Watch Return

A bounded native ROM trace reports the post-instruction CS:EIP of a watched
outer delay branch. The same mechanism records a delay return when the longer
native budget reaches it; no firmware shortcut is involved.

# M2 T2 S3 P361: Rebuilt Direct Far Control

The rebuilt CPU now executes direct and memory far CALL/JMP plus same-privilege
RETF through its project-native code-segment loader. No PCjs runtime code is
imported or changed.

Call gates, task transfers, and outer-privilege returns remain separate CPU
protection work.

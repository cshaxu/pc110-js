# M2 T2 S3 P391: Protected Segment Stack Forms

The rebuilt `POP ES`, `POP SS`, and `POP DS` paths now reuse the project-native
protected segment loaders already used by MOV and far-pointer instructions.
No PCjs source changes or runtime imports are involved. The generic PC/AT
behavior remains selector loading through GDT/LDT descriptors; descriptor-fault
delivery and POP-SS interrupt inhibition remain separately tracked.

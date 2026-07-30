# M2 T2 S3 P396: Segment Loader Faults

The rebuilt segment loader now exposes typed #GP, #NP, and #SS selector failures
to the project-native executor. No PCjs source or runtime code is used. This
preserves generic selector-load fault classes while gate, task, and
outer-privilege paths remain separate work.

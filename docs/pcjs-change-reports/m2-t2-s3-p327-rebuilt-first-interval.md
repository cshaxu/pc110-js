# M2 T2 S3 P327: Rebuilt First Opcode Interval

The rebuilt core now executes base `00-3D` ALU patterns, `DAA/DAS/AAA/AAS`,
and real-mode segment-stack forms through project-native decode, addressing,
memory, state, and flags. It covers both ModR/M directions, accumulator
immediates, byte/word/dword sizes, `66`, `67`, and segment overrides.

No active legacy runtime behavior changes. The interval remains partial because
protected-mode selector loading and architectural fault delivery are not rebuilt
yet. Focused tests plus the full project gate provide verification.

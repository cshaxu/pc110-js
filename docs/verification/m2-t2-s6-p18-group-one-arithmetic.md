# M2 T2 S6 P18 Verification: Group One Arithmetic

The generic real-mode program executes `80`, `81`, and `83` immediate register
forms for ADD, ADC, SBB, SUB, and CMP. Every instruction boundary matches PCjs
state, changed RAM delta, and I/O journal. Logical forms remain EXC-002 scoped.

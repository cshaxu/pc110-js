# Evidence Policy

Hardware behavior must be implemented from explicit evidence, not from plausibility.

## Domain Authority

### Standard PC/AT Behavior

PCjs PCx86 v2 is the primary implementation source. Intel, IBM, and component documentation plus focused conformance tests may justify corrections or extensions.

### PC110-Specific Behavior

Evidence authority is:

1. Reproducible observation from real PC110 hardware.
2. Reproducible execution behavior from dumped PC110 firmware.
3. Reliable IBM or component-manufacturer documentation.
4. Corroborated community measurements or schematics.
5. PC110-EMU behavior.
6. pc110js-v2 and pc110js-v1 observations.
7. Other credible emulators or informed hypotheses.

PC110-EMU is not an oracle. Its behavior may contain placeholders, bypasses, guest-service shortcuts, or implementation-specific assumptions.

## Evidence Levels

- `Direct`: a reproducible real-hardware observation or firmware trace at the exact behavior boundary.
- `Strong`: authoritative component documentation, a focused conformance test, or proven PCjs behavior for a standard PC/AT component.
- `Supporting`: PC110-EMU, prior attempts, community notes, or another credible emulator.
- `Lead`: an unverified hypothesis, code comment, pattern match, or unexplained trace correlation.

Production hardware behavior requires at least one Direct or Strong item. Supporting evidence may select the next experiment but is insufficient by itself when it conflicts with Direct or Strong evidence. A Lead must never become runtime behavior without promotion.

## Evidence Record

Every nontrivial hardware behavior record must include:

- claim and scope;
- device, register, bit, instruction, or timing boundary;
- evidence level and source identity;
- reproduction command or observation procedure;
- relevant trace or test marker;
- competing explanations considered;
- accepted behavior and known limitations;
- regression test or reason a test is not yet possible.

Use [the evidence template](../evidence/template.md).

## Investigation Stop Rules

Stop the current investigation when any of these conditions is met:

- the active blocker is classified and a smaller evidence-producing experiment is known;
- the question is nonblocking for the active milestone;
- available evidence cannot distinguish competing implementations;
- work would require copying unlicensed code or committing protected media;
- the proposed change broadens CPU or device scope beyond the active subtask;
- the latest boot baseline cannot be preserved.

Record the deferred question with a prioritized TODO or planning item and its activation condition.

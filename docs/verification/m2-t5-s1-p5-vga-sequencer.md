# M2 T5 S1 P5 Verification: VGA Sequencer

Focused tests cover every sequencer register class, masks, undefined indexes,
byte width, reset, and machine composition. Default trace behavior remains a
1,000-instruction budget; opt-in budget and tail diagnostics reproduce the
later `F000:BBB4` PIT POST loop without retaining a synthetic timer response.
The full quality gate must pass before this part is committed.

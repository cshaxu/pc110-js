# M2 T5 P105 Verification

- The browser compare control reports a media-identity precondition instead of
  advancing either CPU when native verified media has not been mounted.
- After loading development media, the paired normal reset control remains the
  only accepted entry into a ROM instruction comparison window.
- From that matched entry, the first real DeskPro ROM instruction matches the
  PCjs controlled step and consumes 11 PCjs virtual cycles.

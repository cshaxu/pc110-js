# M1 T4 S5 Verification: Browser Proof

## Result

Pass.

## Exact Commands

```text
pnpm install
pnpm reference
```

For noninteractive local capture, an isolated Edge profile opened the generated
machine URL with a 30000 ms virtual-time budget.

## Observed Browser UI

- The VGA display reached `A:\>`.
- `Halt` (pause/resume) and `Reset` were visible.
- Keyboard focus is provided by the VGA display.
- The drive A selector, local floppy entry, Load, Save, Choose File, Mount,
  Ctrl-Alt-Del, Keys, and Full Screen controls were visible.

Temporary screenshots remain local and are not tracked.

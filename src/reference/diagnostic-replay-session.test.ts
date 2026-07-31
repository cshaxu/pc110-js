import { describe, expect, it } from "vitest";
import { KeyboardByteQueue } from "../app/keyboard-scancode-set1.js";
import { PhysicalMemory } from "../memory/physical-memory.js";
import { RebuiltPcAt386Core } from "../machine/rebuilt-pc-at-386-core.js";
import {
  DiagnosticReplaySession,
  type DiagnosticReplayIdentity
} from "./diagnostic-replay-session.js";

const identity: DiagnosticReplayIdentity = {
  projectCommit: "project",
  pcjsCommit: "pcjs",
  systemRomSha256: "system",
  vgaRomSha256: "vga",
  floppySha256: "floppy",
  configuration: "deskpro386"
};

describe("bounded diagnostic replay session", () => {
  it("restores core and queued input only for the exact replay identity", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.reset();
    const queue = new KeyboardByteQueue();
    queue.enqueue([0xe0, 0x48]);
    const session = new DiagnosticReplaySession(core, queue, identity);
    const checkpoint = session.capture(1234);

    queue.clear();
    core.com1.receiveByte(0x5a);
    expect(session.restore(checkpoint)).toBe(1234);
    expect(queue.capture()).toEqual([0xe0, 0x48]);
    expect(core.capture()).toEqual(checkpoint.core);
  });

  it("rejects a checkpoint from a different media or configuration identity", () => {
    const core = new RebuiltPcAt386Core(new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true }));
    const queue = new KeyboardByteQueue();
    const session = new DiagnosticReplaySession(core, queue, identity);
    const checkpoint = session.capture(0);
    const changed = new DiagnosticReplaySession(core, queue, {
      ...identity,
      floppySha256: "other"
    });
    expect(() => changed.restore(checkpoint)).toThrow("identity changed");
  });
});

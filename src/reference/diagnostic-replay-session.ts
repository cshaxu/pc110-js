import { KeyboardByteQueue } from "../app/keyboard-scancode-set1.js";
import {
  RebuiltPcAt386Core,
  type RebuiltPcAt386CoreState
} from "../machine/rebuilt-pc-at-386-core.js";

export interface DiagnosticReplayIdentity {
  readonly projectCommit: string;
  readonly pcjsCommit: string;
  readonly systemRomSha256: string;
  readonly vgaRomSha256: string;
  readonly floppySha256: string | "none";
  readonly configuration: string;
}

export interface DiagnosticReplayCheckpoint {
  readonly identity: DiagnosticReplayIdentity;
  readonly virtualInstructions: number;
  readonly core: RebuiltPcAt386CoreState;
  readonly keyboardBytes: readonly number[];
}

/** Bounded in-memory replay state; this intentionally has no serialization API. */
export class DiagnosticReplaySession {
  public constructor(
    private readonly core: RebuiltPcAt386Core,
    private readonly keyboardQueue: KeyboardByteQueue,
    private readonly identity: DiagnosticReplayIdentity
  ) {}

  public capture(virtualInstructions: number): DiagnosticReplayCheckpoint {
    if (!Number.isSafeInteger(virtualInstructions) || virtualInstructions < 0)
      throw new RangeError("Diagnostic replay instruction position is invalid");
    return {
      identity: { ...this.identity },
      virtualInstructions,
      core: this.core.capture(),
      keyboardBytes: this.keyboardQueue.capture()
    };
  }

  public restore(checkpoint: DiagnosticReplayCheckpoint): number {
    if (!sameIdentity(this.identity, checkpoint.identity))
      throw new Error("Diagnostic replay identity changed since capture");
    if (!Number.isSafeInteger(checkpoint.virtualInstructions) || checkpoint.virtualInstructions < 0)
      throw new RangeError("Diagnostic replay instruction position is invalid");
    this.core.restore(checkpoint.core);
    this.keyboardQueue.restore(checkpoint.keyboardBytes);
    return checkpoint.virtualInstructions;
  }
}

function sameIdentity(left: DiagnosticReplayIdentity, right: DiagnosticReplayIdentity): boolean {
  return (
    left.projectCommit === right.projectCommit &&
    left.pcjsCommit === right.pcjsCommit &&
    left.systemRomSha256 === right.systemRomSha256 &&
    left.vgaRomSha256 === right.vgaRomSha256 &&
    left.floppySha256 === right.floppySha256 &&
    left.configuration === right.configuration
  );
}

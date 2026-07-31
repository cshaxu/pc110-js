export interface AtKeyboardLines {
  readonly dataEnabled: boolean;
  readonly clockEnabled: boolean;
}

/**
 * Minimal project-native AT keyboard power-on boundary.
 *
 * The keyboard emits BAT only after the controller has released both data and
 * clock lines. Controller ports, output buffering, and IRQ1 remain outside
 * this device.
 */
export class AtKeyboard {
  private lines: AtKeyboardLines = { dataEnabled: false, clockEnabled: false };
  private batPending = true;

  public reset(): void {
    this.lines = { dataEnabled: false, clockEnabled: false };
    this.batPending = true;
  }

  public setLines(lines: AtKeyboardLines): readonly number[] {
    this.lines = lines;
    if (!this.batPending || !lines.dataEnabled || !lines.clockEnabled) return [];
    this.batPending = false;
    return [0xaa];
  }

  public snapshot(): Readonly<AtKeyboardLines> & { readonly batPending: boolean } {
    return { ...this.lines, batPending: this.batPending };
  }

  // TODO(High): Add the keyboard command protocol when selected-ROM evidence requires it.
}

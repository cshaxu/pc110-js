export interface AtKeyboardLines {
  readonly dataEnabled: boolean;
  readonly clockEnabled: boolean;
}

export interface AtKeyboardState extends AtKeyboardLines {
  readonly batPending: boolean;
  readonly scanningEnabled: boolean;
  readonly awaitingLedValue: boolean;
}

const ACK = 0xfa;

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
  private scanningEnabled = true;
  private awaitingLedValue = false;

  public reset(): void {
    this.lines = { dataEnabled: false, clockEnabled: false };
    this.batPending = true;
    this.scanningEnabled = true;
    this.awaitingLedValue = false;
  }

  public setLines(lines: AtKeyboardLines): readonly number[] {
    this.lines = lines;
    if (!this.batPending || !lines.dataEnabled || !lines.clockEnabled) return [];
    this.batPending = false;
    return [0xaa];
  }

  /** Handles the selected set-1 keyboard commands used by the DeskPro BIOS. */
  public receiveCommand(value: number): readonly number[] {
    const command = requireByte(value);
    if (this.awaitingLedValue) {
      this.awaitingLedValue = false;
      return [ACK];
    }
    switch (command) {
      case 0xed:
        this.awaitingLedValue = true;
        return [ACK];
      case 0xf4:
        this.scanningEnabled = true;
        return [ACK];
      case 0xf5:
        this.scanningEnabled = false;
        return [ACK];
      case 0xf6:
        this.scanningEnabled = true;
        return [ACK];
      case 0xff:
        this.batPending = false;
        this.scanningEnabled = true;
        this.awaitingLedValue = false;
        return [ACK, 0xaa];
      default:
        return [];
    }
  }

  public canTransmitScanCodes(): boolean {
    return this.scanningEnabled && this.lines.clockEnabled;
  }

  public snapshot(): AtKeyboardState {
    return {
      ...this.lines,
      batPending: this.batPending,
      scanningEnabled: this.scanningEnabled,
      awaitingLedValue: this.awaitingLedValue
    };
  }

  public restore(state: AtKeyboardState): void {
    this.lines = { dataEnabled: state.dataEnabled, clockEnabled: state.clockEnabled };
    this.batPending = state.batPending;
    this.scanningEnabled = state.scanningEnabled;
    this.awaitingLedValue = state.awaitingLedValue;
  }

  // TODO(High): Add resend, scan-set, and typematic protocol after selected-ROM evidence requires them.
}

function requireByte(value: number): number {
  if (!Number.isInteger(value)) throw new RangeError(`Keyboard byte is not an integer: ${value}`);
  return value & 0xff;
}

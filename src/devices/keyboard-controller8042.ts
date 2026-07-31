const COMMAND_INTERRUPT_ENABLE = 0x01;
const COMMAND_SYSTEM_FLAG = 0x04;
const COMMAND_NO_INHIBIT = 0x08;
const COMMAND_NO_CLOCK = 0x10;

const STATUS_OUTPUT_BUFFER_FULL = 0x01;
const STATUS_SYSTEM_FLAG = 0x04;
const STATUS_COMMAND = 0x08;
const STATUS_NO_INHIBIT = 0x10;

const OUTPUT_PORT_DEFAULT = 0x03;
const INPUT_PORT_DEFAULT = 0xa0;

export const KEYBOARD_CONTROLLER_DATA_PORT = 0x60;
export const KEYBOARD_CONTROLLER_STATUS_PORT = 0x64;

export type KeyboardControllerOutputSource = "controller" | "keyboard";

export interface KeyboardController8042Options {
  /** Result returned by the controller-interface test command (0xAB). */
  readonly interfaceTestResult?: number;
}

export interface KeyboardController8042Snapshot {
  readonly commandByte: number;
  readonly inputPort: number;
  readonly outputPort: number;
  readonly outputBuffer: number | undefined;
  readonly outputSource: KeyboardControllerOutputSource | undefined;
  readonly controllerOutputPending: boolean;
  readonly expectingDataFor: number | undefined;
  readonly keyboardEnabled: boolean;
  readonly status: number;
}

export interface KeyboardController8042State extends KeyboardController8042Snapshot {
  readonly lastWriteWasCommand: boolean;
}

export interface KeyboardController8042Result {
  readonly accepted: boolean;
  readonly irq1Requested: boolean;
  readonly outputPortUpdated: boolean;
  readonly resetPulseRequested: boolean;
}

function result(
  accepted: boolean,
  options: Partial<Omit<KeyboardController8042Result, "accepted">> = {}
): KeyboardController8042Result {
  return {
    accepted,
    irq1Requested: options.irq1Requested ?? false,
    outputPortUpdated: options.outputPortUpdated ?? false,
    resetPulseRequested: options.resetPulseRequested ?? false
  };
}

/**
 * Selected PC/AT 8042 controller state. The core accepts raw keyboard bytes
 * only; I/O ports, PIC wiring, output-port effects, and browser input are
 * composed by later device boundaries.
 */
export class KeyboardController8042 {
  private commandByte = COMMAND_NO_CLOCK;
  private inputPort = INPUT_PORT_DEFAULT;
  private outputPort = OUTPUT_PORT_DEFAULT;
  private outputBuffer: number | undefined;
  private outputSource: KeyboardControllerOutputSource | undefined;
  private controllerOutputPending = false;
  private expectingDataFor: number | undefined;
  private lastWriteWasCommand = false;

  private readonly interfaceTestResult: number;

  public constructor(options: KeyboardController8042Options = {}) {
    this.interfaceTestResult = options.interfaceTestResult ?? 0x00;
  }

  public reset(): void {
    this.commandByte = COMMAND_NO_CLOCK;
    this.inputPort = INPUT_PORT_DEFAULT;
    this.outputPort = OUTPUT_PORT_DEFAULT;
    this.outputBuffer = undefined;
    this.outputSource = undefined;
    this.controllerOutputPending = false;
    this.expectingDataFor = undefined;
    this.lastWriteWasCommand = false;
  }

  public readData(): number {
    const value = this.outputBuffer ?? 0;
    this.outputBuffer = undefined;
    this.outputSource = undefined;
    this.controllerOutputPending = false;
    return value;
  }

  public readStatus(): number {
    const status = this.currentStatus();
    this.controllerOutputPending = false;
    return status;
  }

  private currentStatus(): number {
    let status = 0;
    if (this.outputBuffer !== undefined && !this.controllerOutputPending)
      status |= STATUS_OUTPUT_BUFFER_FULL;
    if (this.commandByte & COMMAND_SYSTEM_FLAG) status |= STATUS_SYSTEM_FLAG;
    if (this.lastWriteWasCommand) status |= STATUS_COMMAND;
    if (this.commandByte & COMMAND_NO_INHIBIT) status |= STATUS_NO_INHIBIT;
    return status;
  }

  public writeCommand(value: number): KeyboardController8042Result {
    const command = this.requireByte(value);
    this.lastWriteWasCommand = true;
    this.expectingDataFor = undefined;

    switch (command) {
      case 0x20:
        return this.placeControllerOutput(this.commandByte);
      case 0x60:
      case 0xd1:
        this.expectingDataFor = command;
        return result(true);
      case 0xaa:
        this.commandByte |= COMMAND_NO_CLOCK;
        this.outputPort = OUTPUT_PORT_DEFAULT;
        return this.withOutputPortUpdate(this.placeControllerOutput(0x55));
      case 0xab:
        return this.placeControllerOutput(this.interfaceTestResult);
      case 0xad:
        this.commandByte |= COMMAND_NO_CLOCK;
        return result(true);
      case 0xae:
        this.commandByte &= ~COMMAND_NO_CLOCK;
        return result(true);
      case 0xc0:
        return this.placeControllerOutput(this.inputPort);
      case 0xd0:
        return this.placeControllerOutput(this.outputPort);
      case 0xe0:
        return this.placeControllerOutput(this.keyboardEnabled() ? 0x01 : 0x00);
      default:
        if (command >= 0xf0)
          return result(true, { resetPulseRequested: Boolean((command ^ 0x0f) & 1) });
        return result(false);
    }
  }

  public writeData(value: number): KeyboardController8042Result {
    const data = this.requireByte(value);
    const expectedCommand = this.expectingDataFor;
    this.expectingDataFor = undefined;
    this.lastWriteWasCommand = false;

    if (expectedCommand === 0x60) {
      this.commandByte = data;
      return result(true);
    }
    if (expectedCommand === 0xd1) {
      this.outputPort = data;
      return result(true, { outputPortUpdated: true });
    }
    return result(false);
  }

  public expectsData(): boolean {
    return this.expectingDataFor !== undefined;
  }

  /** Releases the keyboard clock for a byte addressed to the keyboard itself. */
  public releaseKeyboardClockForData(): void {
    this.commandByte &= ~COMMAND_NO_CLOCK;
  }

  public receiveKeyboardByte(value: number): KeyboardController8042Result {
    const data = this.requireByte(value);
    if (!this.keyboardEnabled() || this.outputBuffer !== undefined) return result(false);
    this.outputBuffer = data;
    this.outputSource = "keyboard";
    this.controllerOutputPending = false;
    return result(true, { irq1Requested: Boolean(this.commandByte & COMMAND_INTERRUPT_ENABLE) });
  }

  public snapshot(): KeyboardController8042Snapshot {
    return {
      commandByte: this.commandByte,
      inputPort: this.inputPort,
      outputPort: this.outputPort,
      outputBuffer: this.outputBuffer,
      outputSource: this.outputSource,
      controllerOutputPending: this.controllerOutputPending,
      expectingDataFor: this.expectingDataFor,
      keyboardEnabled: this.keyboardEnabled(),
      status: this.currentStatus()
    };
  }

  public capture(): KeyboardController8042State {
    return { ...this.snapshot(), lastWriteWasCommand: this.lastWriteWasCommand };
  }

  public restore(state: KeyboardController8042State): void {
    this.commandByte = state.commandByte;
    this.inputPort = state.inputPort;
    this.outputPort = state.outputPort;
    this.outputBuffer = state.outputBuffer;
    this.outputSource = state.outputSource;
    this.controllerOutputPending = state.controllerOutputPending;
    this.expectingDataFor = state.expectingDataFor;
    this.lastWriteWasCommand = state.lastWriteWasCommand;
  }

  private keyboardEnabled(): boolean {
    return !(this.commandByte & COMMAND_NO_CLOCK);
  }

  private placeControllerOutput(value: number): KeyboardController8042Result {
    if (this.outputBuffer !== undefined) return result(false);
    this.outputBuffer = value & 0xff;
    this.outputSource = "controller";
    this.controllerOutputPending = true;
    return result(true);
  }

  private withOutputPortUpdate(
    commandResult: KeyboardController8042Result
  ): KeyboardController8042Result {
    return { ...commandResult, outputPortUpdated: commandResult.accepted };
  }

  private requireByte(value: number): number {
    if (!Number.isInteger(value)) throw new RangeError(`8042 byte is not an integer: ${value}`);
    return value & 0xff;
  }
}

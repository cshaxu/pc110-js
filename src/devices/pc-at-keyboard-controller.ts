import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import {
  KEYBOARD_CONTROLLER_DATA_PORT,
  KEYBOARD_CONTROLLER_STATUS_PORT,
  KeyboardController8042,
  type KeyboardController8042Result,
  type KeyboardController8042Snapshot,
  type KeyboardController8042State
} from "./keyboard-controller8042.js";
import { AtKeyboard, type AtKeyboardState } from "./at-keyboard.js";

export interface PcAtKeyboardControllerPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write: (port: number, value: number, width: PortWidth) => void;
}

export interface PcAtKeyboardControllerState {
  readonly controller: KeyboardController8042State;
  readonly keyboard: AtKeyboardState;
}

/**
 * PC/AT-facing 8042 adapter. It owns only ports 0x60/0x64 and routes explicit
 * controller results into the native PIC and S5 output-port contracts.
 */
export class PcAtKeyboardController {
  public readonly controller = new KeyboardController8042();
  public readonly keyboard = new AtKeyboard();

  public constructor(
    private readonly raiseIrq: (irq: number) => void,
    private readonly writeOutputPort: (value: number) => void,
    private readonly resetProcessor: () => void
  ) {}

  public reset(): void {
    this.controller.reset();
    this.keyboard.reset();
  }

  public read(port: number, width: PortWidth): number {
    this.requirePort(port, width);
    return port === KEYBOARD_CONTROLLER_DATA_PORT
      ? this.controller.readData()
      : this.controller.readStatus();
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requirePort(port, width);
    if (port === KEYBOARD_CONTROLLER_DATA_PORT) {
      const controllerData = this.controller.expectsData();
      const operation = this.controller.writeData(value);
      this.apply(operation);
      if (!controllerData) this.deliverKeyboardBytes(this.keyboard.receiveCommand(value));
      this.synchronizeKeyboardLines();
      return;
    }
    const operation = this.controller.writeCommand(value);
    this.apply(operation);
    this.synchronizeKeyboardLines();
  }

  public receiveKeyboardByte(value: number): boolean {
    if (!this.keyboard.canTransmitScanCodes()) return false;
    return this.apply(this.controller.receiveKeyboardByte(value));
  }

  public snapshot(): KeyboardController8042Snapshot {
    return this.controller.snapshot();
  }

  public capture(): PcAtKeyboardControllerState {
    return { controller: this.controller.capture(), keyboard: this.keyboard.snapshot() };
  }

  public restore(state: PcAtKeyboardControllerState): void {
    this.controller.restore(state.controller);
    this.keyboard.restore(state.keyboard);
  }

  public portRanges(): readonly PcAtKeyboardControllerPortRange[] {
    return [
      {
        start: KEYBOARD_CONTROLLER_DATA_PORT,
        end: KEYBOARD_CONTROLLER_DATA_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: KEYBOARD_CONTROLLER_STATUS_PORT,
        end: KEYBOARD_CONTROLLER_STATUS_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private apply(operation: KeyboardController8042Result): boolean {
    if (!operation.accepted) return false;
    if (operation.outputPortUpdated) this.writeOutputPort(this.controller.snapshot().outputPort);
    if (operation.resetPulseRequested) this.resetProcessor();
    if (operation.irq1Requested) this.raiseIrq(1);
    return true;
  }

  private synchronizeKeyboardLines(): void {
    const commandByte = this.controller.snapshot().commandByte;
    const bytes = this.keyboard.setLines({
      dataEnabled: Boolean(commandByte & 0x08),
      clockEnabled: !(commandByte & 0x10)
    });
    this.deliverKeyboardBytes(bytes);
  }

  private deliverKeyboardBytes(bytes: readonly number[]): void {
    for (const byte of bytes) this.apply(this.controller.receiveKeyboardByte(byte));
  }

  private requirePort(port: number, width: PortWidth): void {
    if (port !== KEYBOARD_CONTROLLER_DATA_PORT && port !== KEYBOARD_CONTROLLER_STATUS_PORT)
      throw new RangeError(`PC/AT 8042 port is not mapped: 0x${port.toString(16)}`);
    if (width !== 8)
      throw new RangeError(`PC/AT 8042 supports 8-bit I/O only, received ${width}-bit`);
  }
}

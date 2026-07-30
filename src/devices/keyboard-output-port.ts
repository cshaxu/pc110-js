const OUTPUT_NO_RESET = 0x01;
const OUTPUT_A20 = 0x02;

export interface KeyboardOutputPortUpdate {
  readonly value: number;
  readonly a20Enabled: boolean;
  readonly resetRequested: boolean;
}

/**
 * Narrow 8042 output-port state contract. Command/status/data-buffer behavior
 * remains owned by the T3 S6 keyboard-controller implementation.
 */
export class KeyboardOutputPort {
  private value = OUTPUT_NO_RESET | OUTPUT_A20;

  public reset(): void {
    this.value = OUTPUT_NO_RESET | OUTPUT_A20;
  }

  public write(value: number): KeyboardOutputPortUpdate {
    if (!Number.isInteger(value))
      throw new RangeError(`8042 output-port byte is not an integer: ${value}`);
    this.value = value & 0xff;
    return this.snapshot();
  }

  public snapshot(): KeyboardOutputPortUpdate {
    return {
      value: this.value,
      a20Enabled: Boolean(this.value & OUTPUT_A20),
      resetRequested: !(this.value & OUTPUT_NO_RESET)
    };
  }
}

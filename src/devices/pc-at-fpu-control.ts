import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const PC_AT_FPU_CLEAR_PORT = 0xf0;
export const PC_AT_FPU_RESET_PORT = 0xf1;

export interface PcAtFpuControlSnapshot {
  readonly clearCount: number;
  readonly resetCount: number;
}

export interface PcAtFpuControlPortRange {
  readonly start: number;
  readonly end: number;
  readonly write: (port: number, value: number, width: PortWidth) => void;
}

/**
 * PC/AT coprocessor-control signals. This device models the chipset-owned
 * clear-busy and reset lines without supplying an x87 execution engine.
 */
export class PcAtFpuControl {
  private clearCount = 0;
  private resetCount = 0;

  public reset(): void {
    this.clearCount = 0;
    this.resetCount = 0;
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requirePort(port, width);
    if (value !== 0)
      throw new RangeError(`PC/AT FPU control expects zero output, received ${value}`);
    if (port === PC_AT_FPU_CLEAR_PORT) this.clearCount += 1;
    else this.resetCount += 1;
  }

  public snapshot(): PcAtFpuControlSnapshot {
    return { clearCount: this.clearCount, resetCount: this.resetCount };
  }

  public portRanges(): readonly PcAtFpuControlPortRange[] {
    return [
      {
        start: PC_AT_FPU_CLEAR_PORT,
        end: PC_AT_FPU_RESET_PORT,
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private requirePort(port: number, width: PortWidth): void {
    if (port !== PC_AT_FPU_CLEAR_PORT && port !== PC_AT_FPU_RESET_PORT)
      throw new RangeError(`PC/AT FPU control port is not mapped: 0x${port.toString(16)}`);
    if (width !== 8)
      throw new RangeError(`PC/AT FPU control supports 8-bit I/O only, received ${width}-bit`);
  }
}

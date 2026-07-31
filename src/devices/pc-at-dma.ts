import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import { Dma8237, type Dma8237State, type DmaChannelSnapshot, type DmaGrant } from "./dma8237.js";

export const DMA0_FIRST_PORT = 0x00;
export const DMA0_LAST_PORT = 0x0f;
export const DMA1_FIRST_PORT = 0xc0;
export const DMA1_LAST_PORT = 0xde;

const PAGE_PORTS = new Map<number, { readonly controller: 0 | 1; readonly channel: number }>([
  [0x81, { controller: 0, channel: 2 }],
  [0x82, { controller: 0, channel: 3 }],
  [0x83, { controller: 0, channel: 1 }],
  [0x87, { controller: 0, channel: 0 }],
  [0x89, { controller: 1, channel: 2 }],
  [0x8a, { controller: 1, channel: 3 }],
  [0x8b, { controller: 1, channel: 1 }],
  [0x8f, { controller: 1, channel: 0 }]
]);

const SPARE_PAGE_PORTS = new Map<number, number>([
  [0x84, 0],
  [0x85, 1],
  [0x86, 2],
  [0x88, 3],
  [0x8c, 4],
  [0x8d, 5],
  [0x8e, 6],
  [0x80, 7]
]);

export interface PcAtDmaPortRange {
  readonly start: number;
  readonly end: number;
  readonly read?: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

export interface PcAtDmaState {
  readonly dma0: Dma8237State;
  readonly dma1: Dma8237State;
  readonly sparePages: Uint8Array;
}

export class PcAtDma {
  public readonly dma0 = new Dma8237();
  public readonly dma1 = new Dma8237({ wordAddressed: true });
  private readonly sparePages = new Uint8Array(8);

  public reset(): void {
    this.dma0.reset();
    this.dma1.reset();
    this.sparePages.fill(0);
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    const page = PAGE_PORTS.get(port);
    if (page) return this.controller(page.controller).page(page.channel);
    const sparePage = SPARE_PAGE_PORTS.get(port);
    if (sparePage !== undefined) return this.sparePages[sparePage]!;
    const decoded = this.decodeControllerPort(port);
    if (!decoded) throw new RangeError(`PC/AT DMA port is not readable: 0x${port.toString(16)}`);
    const { controller, offset } = decoded;
    if (offset <= 7) {
      const channel = offset >>> 1;
      return offset & 1 ? controller.readCount(channel) : controller.readAddress(channel);
    }
    if (offset === 8) return controller.readStatus();
    throw new RangeError(`PC/AT DMA port is not readable: 0x${port.toString(16)}`);
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    const page = PAGE_PORTS.get(port);
    if (page) return this.controller(page.controller).setPage(page.channel, value);
    const sparePage = SPARE_PAGE_PORTS.get(port);
    if (sparePage !== undefined) {
      this.sparePages[sparePage] = value & 0xff;
      return;
    }
    const decoded = this.decodeControllerPort(port);
    if (!decoded) throw new RangeError(`PC/AT DMA port is not mapped: 0x${port.toString(16)}`);
    const { controller, offset } = decoded;
    if (offset <= 7) {
      const channel = offset >>> 1;
      if (offset & 1) controller.writeCount(channel, value);
      else controller.writeAddress(channel, value);
      return;
    }
    switch (offset) {
      case 8:
        controller.writeCommand(value);
        return;
      case 9:
        controller.writeRequest(value);
        return;
      case 10:
        controller.writeMask(value);
        return;
      case 11:
        controller.writeMode(value);
        return;
      case 12:
        controller.clearFlipFlop();
        return;
      case 13:
        controller.masterClear();
        return;
      case 14:
        controller.clearMasks();
        return;
      case 15:
        controller.writeAllMasks(value);
        return;
      default:
        throw new RangeError(`PC/AT DMA port is not mapped: 0x${port.toString(16)}`);
    }
  }

  public setHardwareRequest(channel: number, active: boolean): void {
    const decoded = this.decodeGlobalChannel(channel);
    this.controller(decoded.controller).setHardwareRequest(decoded.channel, active);
  }

  public snapshot(channel: number): DmaChannelSnapshot {
    const decoded = this.decodeGlobalChannel(channel);
    return this.controller(decoded.controller).snapshot(decoded.channel);
  }

  public capture(): PcAtDmaState {
    return {
      dma0: this.dma0.capture(),
      dma1: this.dma1.capture(),
      sparePages: this.sparePages.slice()
    };
  }

  public restore(state: PcAtDmaState): void {
    if (state.sparePages.length !== this.sparePages.length)
      throw new RangeError("DMA checkpoint spare-page count is invalid");
    this.dma0.restore(state.dma0);
    this.dma1.restore(state.dma1);
    this.sparePages.set(state.sparePages);
  }

  public maskBits(controller: 0 | 1): number {
    let masks = 0;
    for (let channel = 0; channel < 4; channel += 1) {
      if (this.controller(controller).snapshot(channel).masked) masks |= 1 << channel;
    }
    return masks;
  }

  public sparePage(port: number): number {
    const index = SPARE_PAGE_PORTS.get(port);
    if (index === undefined)
      throw new RangeError(`PC/AT DMA spare page port is not mapped: 0x${port.toString(16)}`);
    return this.sparePages[index]!;
  }

  public grantFromController(index: 0 | 1): DmaGrant | undefined {
    return this.controller(index).grant();
  }

  public grant(): DmaGrant | undefined {
    const lowGrant = this.dma0.peekGrant();
    this.dma1.setHardwareRequest(0, lowGrant !== undefined);
    const highGrant = this.dma1.peekGrant();
    if (!highGrant) return undefined;
    if (highGrant.channel === 0) {
      if (!this.dma1.acknowledgeCascade(0)) return undefined;
      return this.dma0.grant();
    }
    const grant = this.dma1.grant();
    return grant ? { ...grant, channel: grant.channel + 4 } : undefined;
  }

  public portRanges(): readonly PcAtDmaPortRange[] {
    return [
      {
        start: DMA0_FIRST_PORT,
        end: DMA0_LAST_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: DMA1_FIRST_PORT,
        end: DMA1_LAST_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      ...Array.from(PAGE_PORTS.keys(), (port) => ({
        start: port,
        end: port,
        read: (mappedPort: number, width: PortWidth) => this.read(mappedPort, width),
        write: (mappedPort: number, value: number, width: PortWidth) =>
          this.write(mappedPort, value, width)
      })),
      ...Array.from(SPARE_PAGE_PORTS.keys(), (port) => ({
        start: port,
        end: port,
        read: (mappedPort: number, width: PortWidth) => this.read(mappedPort, width),
        write: (mappedPort: number, value: number, width: PortWidth) =>
          this.write(mappedPort, value, width)
      }))
    ];
  }

  private decodeControllerPort(
    port: number
  ): { readonly controller: Dma8237; readonly offset: number } | undefined {
    if (port >= DMA0_FIRST_PORT && port <= DMA0_LAST_PORT)
      return { controller: this.dma0, offset: port };
    if (port < DMA1_FIRST_PORT || port > DMA1_LAST_PORT || port & 1) return undefined;
    return { controller: this.dma1, offset: (port - DMA1_FIRST_PORT) >>> 1 };
  }

  private decodeGlobalChannel(channel: number): {
    readonly controller: 0 | 1;
    readonly channel: number;
  } {
    if (!Number.isInteger(channel) || channel < 0 || channel > 7)
      throw new RangeError(`PC/AT DMA channel is outside 0-7: ${channel}`);
    return channel < 4 ? { controller: 0, channel } : { controller: 1, channel: channel - 4 };
  }

  private controller(index: 0 | 1): Dma8237 {
    return index === 0 ? this.dma0 : this.dma1;
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`PC/AT DMA supports 8-bit I/O only, received ${width}-bit`);
  }
}

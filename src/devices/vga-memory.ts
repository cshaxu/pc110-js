import type { MemoryMappedDevice } from "../memory/physical-memory.js";
import { VgaGraphicsController } from "./vga-graphics-controller.js";
import { VgaSequencer } from "./vga-sequencer.js";

export const VGA_MEMORY_START = 0xa0000;
export const VGA_MEMORY_SIZE = 0x20000;

const PLANE_SIZE = 0x10000;

/** VGA four-plane memory, latch, and graphics-controller access behavior. */
export class VgaMemory implements MemoryMappedDevice {
  private readonly planes = Array.from({ length: 4 }, () => new Uint8Array(PLANE_SIZE));
  private readonly latches = new Uint8Array(4);

  public constructor(
    private readonly sequencer: VgaSequencer,
    private readonly graphicsController: VgaGraphicsController
  ) {}

  public reset(): void {
    for (const plane of this.planes) plane.fill(0);
    this.latches.fill(0);
  }

  public readUint8(offset: number): number {
    const decoded = this.decodeAddress(offset);
    if (!decoded) return 0xff;
    this.loadLatches(decoded.address);
    if (this.graphicsController.readRegister(5) & 0x08) return this.readModeOne();
    return this.latches[this.graphicsController.readRegister(4) & 0x03]!;
  }

  public writeUint8(offset: number, value: number): void {
    const decoded = this.decodeAddress(offset);
    if (!decoded) return;
    const mode = this.graphicsController.readRegister(5) & 0x03;
    const planeMask = decoded.planeMask & this.sequencer.readRegister(2);
    for (let plane = 0; plane < 4; plane += 1) {
      if ((planeMask & (1 << plane)) === 0) continue;
      this.planes[plane]![decoded.address] = this.writePlane(plane, value, mode);
    }
  }

  public readPlane(plane: number, address: number): number {
    if (!Number.isInteger(plane) || plane < 0 || plane >= 4)
      throw new RangeError(`VGA plane is not defined: ${plane}`);
    if (!Number.isInteger(address) || address < 0 || address >= PLANE_SIZE)
      throw new RangeError(`VGA plane address is out of range: ${address}`);
    return this.planes[plane]![address]!;
  }

  public latchSnapshot(): readonly number[] {
    return Array.from(this.latches);
  }

  private decodeAddress(
    offset: number
  ): { readonly address: number; readonly planeMask: number } | undefined {
    if (!Number.isInteger(offset) || offset < 0 || offset >= VGA_MEMORY_SIZE)
      throw new RangeError(`VGA aperture offset is out of range: ${offset}`);
    const graphicsMisc = this.graphicsController.readRegister(6);
    const map = (graphicsMisc >>> 2) & 0x03;
    const windowStart = [0, 0, 0x10000, 0x18000][map]!;
    const windowSize = [0x20000, 0x10000, 0x8000, 0x8000][map]!;
    if (offset < windowStart || offset >= windowStart + windowSize) return undefined;
    let address = offset - windowStart;
    let planeMask = 0x0f;
    const memoryMode = this.sequencer.readRegister(4);
    if (memoryMode & 0x08) {
      planeMask = 1 << (address & 0x03);
      address >>>= 2;
    } else if ((memoryMode & 0x04) === 0 && this.graphicsController.readRegister(5) & 0x10) {
      planeMask = address & 1 ? 0x0a : 0x05;
      address >>>= 1;
    }
    return { address, planeMask };
  }

  private loadLatches(address: number): void {
    for (let plane = 0; plane < 4; plane += 1) this.latches[plane] = this.planes[plane]![address]!;
  }

  private readModeOne(): number {
    const compare = this.graphicsController.readRegister(2);
    const dontCare = this.graphicsController.readRegister(7);
    let result = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      let matches = true;
      for (let plane = 0; plane < 4; plane += 1) {
        if ((dontCare & (1 << plane)) === 0) continue;
        if (((this.latches[plane]! >>> bit) & 1) !== ((compare >>> plane) & 1)) {
          matches = false;
          break;
        }
      }
      if (matches) result |= 1 << bit;
    }
    return result;
  }

  private writePlane(plane: number, value: number, mode: number): number {
    const latch = this.latches[plane]!;
    const bitMask = this.graphicsController.readRegister(8);
    if (mode === 1) return latch;
    if (mode === 3) {
      const mask =
        this.rotateRight(value, this.graphicsController.readRegister(3) & 0x07) & bitMask;
      const setReset = this.graphicsController.readRegister(0) & (1 << plane) ? 0xff : 0x00;
      return (setReset & mask) | (latch & ~mask);
    }
    let source = value & 0xff;
    if (mode === 2) source = value & (1 << plane) ? 0xff : 0x00;
    else source = this.rotateRight(source, this.graphicsController.readRegister(3) & 0x07);
    if (mode === 0 && this.graphicsController.readRegister(1) & (1 << plane))
      source = this.graphicsController.readRegister(0) & (1 << plane) ? 0xff : 0x00;
    const operation = (this.graphicsController.readRegister(3) >>> 3) & 0x03;
    const combined =
      operation === 0
        ? source
        : operation === 1
          ? source & latch
          : operation === 2
            ? source | latch
            : source ^ latch;
    return ((combined & bitMask) | (latch & ~bitMask)) & 0xff;
  }

  private rotateRight(value: number, count: number): number {
    return ((value >>> count) | (value << (8 - count))) & 0xff;
  }
}

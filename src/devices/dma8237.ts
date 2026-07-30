export interface DmaChannelSnapshot {
  readonly baseAddress: number;
  readonly currentAddress: number;
  readonly baseCount: number;
  readonly currentCount: number;
  readonly page: number;
  readonly mode: number;
  readonly masked: boolean;
  readonly requested: boolean;
  readonly terminalCount: boolean;
}

export interface DmaGrant {
  readonly channel: number;
  readonly address: number;
  readonly transferType: "verify" | "write" | "read";
  readonly unitBytes: 1 | 2;
  readonly terminalCount: boolean;
}

export interface Dma8237Options {
  readonly wordAddressed?: boolean;
}

export class Dma8237 {
  private readonly channels = Array.from({ length: 4 }, () => new DmaChannel());
  private readonly wordAddressed: boolean;
  private command = 0;
  private flipFlopHigh = false;
  private priorityBase = 3;

  public constructor(options: Dma8237Options = {}) {
    this.wordAddressed = options.wordAddressed ?? false;
    this.reset();
  }

  public reset(): void {
    this.command = 0;
    this.flipFlopHigh = false;
    this.priorityBase = 3;
    for (const channel of this.channels) channel.reset();
  }

  public writeAddress(channel: number, value: number): void {
    const state = this.channel(channel);
    state.currentAddress = writeWordByte(state.currentAddress, value, this.flipFlopHigh);
    state.baseAddress = state.currentAddress;
    this.flipFlopHigh = !this.flipFlopHigh;
  }

  public readAddress(channel: number): number {
    const value = readWordByte(this.channel(channel).currentAddress, this.flipFlopHigh);
    this.flipFlopHigh = !this.flipFlopHigh;
    return value;
  }

  public writeCount(channel: number, value: number): void {
    const state = this.channel(channel);
    state.currentCount = writeWordByte(state.currentCount, value, this.flipFlopHigh);
    state.baseCount = state.currentCount;
    this.flipFlopHigh = !this.flipFlopHigh;
  }

  public readCount(channel: number): number {
    const value = readWordByte(this.channel(channel).currentCount, this.flipFlopHigh);
    this.flipFlopHigh = !this.flipFlopHigh;
    return value;
  }

  public writeCommand(value: number): void {
    this.command = byte(value);
  }

  public writeRequest(value: number): void {
    const command = byte(value);
    this.channel(command & 3).requested = Boolean(command & 4);
  }

  public writeMask(value: number): void {
    const command = byte(value);
    this.channel(command & 3).masked = Boolean(command & 4);
  }

  public clearMasks(): void {
    for (const channel of this.channels) channel.masked = false;
  }

  public writeAllMasks(value: number): void {
    const masks = byte(value);
    this.channels.forEach((channel, index) => {
      channel.masked = Boolean(masks & (1 << index));
    });
  }

  public writeMode(value: number): void {
    const mode = byte(value);
    this.channel(mode & 3).mode = mode;
  }

  public clearFlipFlop(): void {
    this.flipFlopHigh = false;
  }

  public masterClear(): void {
    this.command = 0;
    this.flipFlopHigh = false;
    this.priorityBase = 3;
    for (const channel of this.channels) {
      channel.masked = true;
      channel.requested = false;
      channel.terminalCount = false;
    }
  }

  public readStatus(): number {
    let status = 0;
    this.channels.forEach((channel, index) => {
      if (channel.terminalCount) status |= 1 << index;
      if (channel.requested) status |= 1 << (index + 4);
      channel.terminalCount = false;
    });
    return status;
  }

  public setPage(channel: number, value: number): void {
    this.channel(channel).page = byte(value);
  }

  public page(channel: number): number {
    return this.channel(channel).page;
  }

  public setHardwareRequest(channel: number, active: boolean): void {
    this.channel(channel).requested = active;
  }

  public grant(): DmaGrant | undefined {
    const grant = this.peekGrant();
    if (!grant) return undefined;
    this.advanceChannel(grant.channel, grant.terminalCount);
    return grant;
  }

  public peekGrant(): DmaGrant | undefined {
    if (this.command & 4) return undefined;
    const channelIndex = this.nextRequestedChannel();
    if (channelIndex === undefined) return undefined;
    const channel = this.channel(channelIndex);
    const address =
      (channel.page << 16) |
      (this.wordAddressed ? channel.currentAddress << 1 : channel.currentAddress);
    const terminalCount = channel.currentCount === 0;
    const transferType = (channel.mode >>> 2) & 3;
    return {
      channel: channelIndex,
      address,
      transferType: transferType === 1 ? "write" : transferType === 2 ? "read" : "verify",
      unitBytes: this.wordAddressed ? 2 : 1,
      terminalCount
    };
  }

  public acknowledgeCascade(channel: number): boolean {
    const grant = this.peekGrant();
    if (!grant || grant.channel !== channel) return false;
    if (this.command & 0x10) this.priorityBase = channel;
    return true;
  }

  public snapshot(channel: number): DmaChannelSnapshot {
    return this.channel(channel).snapshot();
  }

  private nextRequestedChannel(): number | undefined {
    for (let offset = 1; offset <= 4; offset += 1) {
      const index = (this.priorityBase + offset) & 3;
      const channel = this.channels[index]!;
      if (channel.requested && !channel.masked) return index;
    }
    return undefined;
  }

  private advanceChannel(index: number, terminalCount: boolean): void {
    const channel = this.channel(index);
    if (terminalCount) {
      channel.terminalCount = true;
      if (channel.mode & 0x10) {
        channel.currentAddress = channel.baseAddress;
        channel.currentCount = channel.baseCount;
      } else channel.requested = false;
    } else {
      channel.currentAddress = (channel.currentAddress + (channel.mode & 0x20 ? -1 : 1)) & 0xffff;
      channel.currentCount = (channel.currentCount - 1) & 0xffff;
    }
    if (this.command & 0x10) this.priorityBase = index;
  }

  private channel(index: number): DmaChannel {
    if (!Number.isInteger(index) || index < 0 || index > 3)
      throw new RangeError(`DMA channel is outside 0-3: ${index}`);
    return this.channels[index]!;
  }
}

class DmaChannel {
  public baseAddress = 0;
  public currentAddress = 0;
  public baseCount = 0;
  public currentCount = 0;
  public page = 0;
  public mode = 0;
  public masked = true;
  public requested = false;
  public terminalCount = false;

  public reset(): void {
    this.baseAddress = 0;
    this.currentAddress = 0;
    this.baseCount = 0;
    this.currentCount = 0;
    this.page = 0;
    this.mode = 0;
    this.masked = true;
    this.requested = false;
    this.terminalCount = false;
  }

  public snapshot(): DmaChannelSnapshot {
    return {
      baseAddress: this.baseAddress,
      currentAddress: this.currentAddress,
      baseCount: this.baseCount,
      currentCount: this.currentCount,
      page: this.page,
      mode: this.mode,
      masked: this.masked,
      requested: this.requested,
      terminalCount: this.terminalCount
    };
  }
}

function byte(value: number): number {
  if (!Number.isInteger(value)) throw new RangeError(`DMA byte is not an integer: ${value}`);
  return value & 0xff;
}

function writeWordByte(word: number, value: number, high: boolean): number {
  const data = byte(value);
  return high ? (word & 0xff) | (data << 8) : (word & 0xff00) | data;
}

function readWordByte(word: number, high: boolean): number {
  return high ? word >>> 8 : word & 0xff;
}

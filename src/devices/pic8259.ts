export type PicReadRegister = "irr" | "isr";

export interface Pic8259Snapshot {
  readonly vectorBase: number;
  readonly mask: number;
  readonly request: number;
  readonly inService: number;
  readonly lowestPriority: number;
  readonly readRegister: PicReadRegister;
  readonly initialized: boolean;
}

type InitializationPhase = "idle" | "icw2" | "icw3" | "icw4";

export class Pic8259 {
  private vectorBase = 0;
  private mask = 0xff;
  private request = 0;
  private inService = 0;
  private lowestPriority = 7;
  private readRegister: PicReadRegister = "irr";
  private initializationPhase: InitializationPhase = "idle";
  private single = false;
  private icw4Required = false;
  private automaticEoi = false;

  public reset(): void {
    this.vectorBase = 0;
    this.mask = 0xff;
    this.request = 0;
    this.inService = 0;
    this.lowestPriority = 7;
    this.readRegister = "irr";
    this.initializationPhase = "idle";
    this.single = false;
    this.icw4Required = false;
    this.automaticEoi = false;
  }

  public readCommand(): number {
    return this.readRegister === "irr" ? this.request : this.inService;
  }

  public readData(): number {
    return this.mask;
  }

  public writeCommand(value: number): void {
    const command = normalizeByte(value);
    if (command & 0x10) {
      this.beginInitialization(command);
      return;
    }
    if (command & 0x08) {
      const select = command & 0x03;
      if (select === 0x02) this.readRegister = "irr";
      if (select === 0x03) this.readRegister = "isr";
      return;
    }
    this.writeOperationCommand(command);
  }

  public writeData(value: number): void {
    const data = normalizeByte(value);
    switch (this.initializationPhase) {
      case "icw2":
        this.vectorBase = data & 0xf8;
        this.initializationPhase = this.single ? (this.icw4Required ? "icw4" : "idle") : "icw3";
        return;
      case "icw3":
        this.initializationPhase = this.icw4Required ? "icw4" : "idle";
        return;
      case "icw4":
        this.automaticEoi = Boolean(data & 0x02);
        this.initializationPhase = "idle";
        return;
      case "idle":
        this.mask = data;
        return;
    }
  }

  public raise(line: number): void {
    this.request |= bitForLine(line);
  }

  public pendingLine(): number | undefined {
    const request = this.request & ~this.mask;
    const active = this.highestPriorityLine(this.inService);
    for (let offset = 1; offset <= 8; offset += 1) {
      const line = (this.lowestPriority + offset) & 7;
      if (!(request & (1 << line))) continue;
      if (active === undefined || this.priorityOffset(line) < this.priorityOffset(active))
        return line;
    }
    return undefined;
  }

  public acknowledge(): number | undefined {
    const line = this.pendingLine();
    if (line === undefined) return undefined;
    const bit = bitForLine(line);
    this.request &= ~bit;
    if (!this.automaticEoi) this.inService |= bit;
    return this.vectorBase | line;
  }

  public snapshot(): Pic8259Snapshot {
    return {
      vectorBase: this.vectorBase,
      mask: this.mask,
      request: this.request,
      inService: this.inService,
      lowestPriority: this.lowestPriority,
      readRegister: this.readRegister,
      initialized: this.initializationPhase === "idle"
    };
  }

  private beginInitialization(command: number): void {
    this.mask = 0;
    this.request = 0;
    this.inService = 0;
    this.lowestPriority = 7;
    this.readRegister = "irr";
    this.single = Boolean(command & 0x02);
    this.icw4Required = Boolean(command & 0x01);
    this.automaticEoi = false;
    this.initializationPhase = "icw2";
  }

  private writeOperationCommand(command: number): void {
    const operation = command & 0xe0;
    if (operation & 0x20) {
      const line = operation === 0x60 ? command & 7 : this.highestPriorityLine(this.inService);
      if (line !== undefined) this.inService &= ~bitForLine(line);
      return;
    }
    if (operation === 0xc0) this.lowestPriority = command & 7;
  }

  private highestPriorityLine(bits: number): number | undefined {
    for (let offset = 1; offset <= 8; offset += 1) {
      const line = (this.lowestPriority + offset) & 7;
      if (bits & (1 << line)) return line;
    }
    return undefined;
  }

  private priorityOffset(line: number): number {
    return (line - this.lowestPriority + 8) & 7;
  }
}

function bitForLine(line: number): number {
  if (!Number.isInteger(line) || line < 0 || line > 7)
    throw new RangeError(`PIC interrupt line is outside 0-7: ${line}`);
  return 1 << line;
}

function normalizeByte(value: number): number {
  if (!Number.isInteger(value)) throw new RangeError(`PIC byte is not an integer: ${value}`);
  return value & 0xff;
}

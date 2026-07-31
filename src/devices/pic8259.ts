export type PicReadRegister = "irr" | "isr";

export interface Pic8259Snapshot {
  readonly vectorBase: number;
  readonly mask: number | undefined;
  readonly request: number | undefined;
  readonly inService: number | undefined;
  readonly lowestPriority: number;
  readonly readRegister: PicReadRegister;
  readonly initialized: boolean;
}

type InitializationPhase = "idle" | "icw2" | "icw3" | "icw4";

export interface Pic8259State extends Pic8259Snapshot {
  readonly initializationPhase: InitializationPhase;
  readonly single: boolean;
  readonly icw4Required: boolean;
  readonly automaticEoi: boolean;
}

export class Pic8259 {
  private vectorBase = 0;
  /* PCjs leaves these registers absent until the guest begins the ICW sequence. */
  private mask: number | undefined;
  private request: number | undefined;
  private inService: number | undefined;
  private lowestPriority = 7;
  private readRegister: PicReadRegister = "irr";
  private initializationPhase: InitializationPhase = "idle";
  private single = false;
  private icw4Required = false;
  private automaticEoi = false;

  public reset(): void {
    this.vectorBase = 0;
    this.mask = undefined;
    this.request = undefined;
    this.inService = undefined;
    this.lowestPriority = 7;
    this.readRegister = "irr";
    this.initializationPhase = "idle";
    this.single = false;
    this.icw4Required = false;
    this.automaticEoi = false;
  }

  public readCommand(): number {
    return this.readRegister === "irr" ? (this.request ?? 0) : (this.inService ?? 0);
  }

  public readData(): number {
    return this.mask ?? 0;
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
    this.request = (this.request ?? 0) | bitForLine(line);
  }

  public pendingLine(): number | undefined {
    const request = (this.request ?? 0) & ~(this.mask ?? 0);
    const active = this.highestPriorityLine(this.inService ?? 0);
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
    this.request = (this.request ?? 0) & ~bit;
    if (!this.automaticEoi) this.inService = (this.inService ?? 0) | bit;
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

  public capture(): Pic8259State {
    return {
      ...this.snapshot(),
      initializationPhase: this.initializationPhase,
      single: this.single,
      icw4Required: this.icw4Required,
      automaticEoi: this.automaticEoi
    };
  }

  public restore(state: Pic8259State): void {
    this.vectorBase = state.vectorBase;
    this.mask = state.mask;
    this.request = state.request;
    this.inService = state.inService;
    this.lowestPriority = state.lowestPriority;
    this.readRegister = state.readRegister;
    this.initializationPhase = state.initializationPhase;
    this.single = state.single;
    this.icw4Required = state.icw4Required;
    this.automaticEoi = state.automaticEoi;
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
      const line = operation === 0x60 ? command & 7 : this.highestPriorityLine(this.inService ?? 0);
      if (line !== undefined) this.inService = (this.inService ?? 0) & ~bitForLine(line);
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

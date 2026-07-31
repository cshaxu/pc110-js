export const FDC_DOR_ENABLE = 0x04;
export const FDC_DOR_INTERRUPT_ENABLE = 0x08;
const FDC_DATA_RATE_BYTES_PER_SECOND = [62_500, 31_250, 37_500, 0] as const;

const STATUS_BUSY = 0x10;
const STATUS_NON_DMA = 0x20;
const STATUS_READ_DATA = 0x40;
const STATUS_RQM = 0x80;

const COMMAND_MASK = 0x1f;
const COMMAND_SPECIFY = 0x03;
const COMMAND_SENSE_DRIVE = 0x04;
const COMMAND_RECALIBRATE = 0x07;
const COMMAND_SENSE_INTERRUPT = 0x08;
const COMMAND_READ_ID = 0x0a;
const COMMAND_SEEK = 0x0f;
const COMMAND_READ_DATA = 0x06;

const STATUS0_INVALID = 0x80;
const STATUS0_SEEK_END = 0x20;
const STATUS0_TRACK0 = 0x10;
const STATUS3_HEAD = 0x04;
const STATUS3_TRACK0 = 0x10;
const STATUS3_READY = 0x20;

const COMMAND_LENGTH = new Map<number, number>([
  [COMMAND_SPECIFY, 3],
  [COMMAND_SENSE_DRIVE, 2],
  [COMMAND_RECALIBRATE, 2],
  [COMMAND_SENSE_INTERRUPT, 1],
  [COMMAND_READ_ID, 2],
  [COMMAND_SEEK, 3],
  [COMMAND_READ_DATA, 9]
]);

import { FloppyDrive } from "./floppy-drive.js";

export type FdcPhase = "command" | "execution" | "result";

export interface FdcDriveState {
  readonly ready: boolean;
  readonly cylinder: number;
}

export interface Fdc765Snapshot {
  readonly dor: number;
  readonly control: number;
  readonly phase: FdcPhase;
  readonly mainStatus: number;
  readonly commandBytes: readonly number[];
  readonly resultBytes: readonly number[];
  readonly interruptPending: boolean;
  readonly nonDma: boolean;
  readonly selectedDrive: number;
  readonly dmaBytesPending: number;
  readonly drives: readonly FdcDriveState[];
}

export interface Fdc765State extends Fdc765Snapshot {
  readonly interruptResults: readonly InterruptResult[];
  readonly dmaBytes: readonly number[];
  readonly dmaResult: readonly number[] | undefined;
}

export interface Fdc765Result {
  readonly accepted: boolean;
  readonly irqRequested: boolean;
  readonly irqCleared: boolean;
}

interface InterruptResult {
  readonly status0: number;
  readonly cylinder: number;
}

function result(
  accepted: boolean,
  options: Partial<Omit<Fdc765Result, "accepted">> = {}
): Fdc765Result {
  return {
    accepted,
    irqRequested: options.irqRequested ?? false,
    irqCleared: options.irqCleared ?? false
  };
}

/**
 * Selected 765/8272 controller state. The core owns command and result phases
 * only; ports, PIC, DMA, media, and deterministic advancement are composed
 * by separate machine-facing device layers.
 */
export class Fdc765 {
  private dor = 0;
  private control = 0;
  private phase: FdcPhase = "command";
  private commandBytes: number[] = [];
  private resultBytes: number[] = [];
  private interruptPending = false;
  private nonDma = false;
  private selectedDrive = 0;
  private readonly drives = Array.from({ length: 4 }, () => ({ ready: false, cylinder: 0 }));
  private readonly media = Array.from({ length: 4 }, () => undefined as FloppyDrive | undefined);
  private readonly interruptResults: InterruptResult[] = [];
  private dmaBytes: number[] = [];
  private dmaResult: number[] | undefined;

  public reset(): void {
    this.dor = 0;
    this.control = 0;
    this.resetController();
  }

  public writeDor(value: number): Fdc765Result {
    const dor = this.byte(value);
    const wasEnabled = Boolean(this.dor & FDC_DOR_ENABLE);
    const isEnabled = Boolean(dor & FDC_DOR_ENABLE);
    this.dor = dor;
    this.selectedDrive = dor & 0x03;
    if (!isEnabled) {
      this.resetController();
      return result(true);
    }
    if (!wasEnabled) {
      for (let drive = 0; drive < 4; drive += 1)
        this.interruptResults.push({ status0: 0xc0 | drive, cylinder: 0 });
      this.interruptPending = true;
      return result(true, { irqRequested: Boolean(dor & FDC_DOR_INTERRUPT_ENABLE) });
    }
    return result(true);
  }

  public writeControl(value: number): Fdc765Result {
    this.control = this.byte(value) & 0x03;
    return result(true);
  }

  public readInput(): number {
    const drive = this.drives[this.selectedDrive]!;
    return drive.ready ? 0 : 0x80;
  }

  public dmaBytesPerSecond(): number {
    return FDC_DATA_RATE_BYTES_PER_SECOND[this.control]!;
  }

  public readMainStatus(): number {
    let status = STATUS_RQM;
    if (this.phase === "execution") status |= STATUS_BUSY;
    if (this.phase === "result") status |= STATUS_BUSY | STATUS_READ_DATA;
    if (this.nonDma) status |= STATUS_NON_DMA;
    return status;
  }

  public writeData(value: number): Fdc765Result {
    const data = this.byte(value);
    if (!(this.dor & FDC_DOR_ENABLE) || this.phase !== "command") return result(false);
    this.commandBytes.push(data);
    const command = this.commandBytes[0]! & COMMAND_MASK;
    const required = COMMAND_LENGTH.get(command);
    if (required === undefined) {
      this.commandBytes = [];
      this.beginResult([STATUS0_INVALID]);
      return result(true, {
        irqRequested: this.raiseInterrupt({ status0: STATUS0_INVALID, cylinder: 0 })
      });
    }
    if (this.commandBytes.length < required) return result(true);
    return this.execute(command);
  }

  public readData(): number {
    if (this.phase !== "result") return 0;
    const value = this.resultBytes.shift() ?? 0;
    if (this.resultBytes.length === 0) this.phase = "command";
    return value;
  }

  public setDriveReady(drive: number, ready: boolean): void {
    this.drive(drive).ready = ready;
  }

  public attachDrive(index: number, drive: FloppyDrive | undefined): void {
    this.drive(index);
    this.media[index] = drive;
  }

  public readDmaByte(): number | undefined {
    if (this.phase !== "execution") return undefined;
    return this.dmaBytes.shift();
  }

  public completeDma(terminalCount: boolean): Fdc765Result {
    if (this.phase !== "execution") return result(false);
    const complete = terminalCount || this.dmaBytes.length === 0;
    if (!complete) return result(true);
    this.beginResult(this.dmaResult ?? [STATUS0_INVALID]);
    this.dmaBytes = [];
    this.dmaResult = undefined;
    return result(true, {
      irqRequested: this.raiseInterrupt({
        status0: this.resultBytes[0] ?? STATUS0_INVALID,
        cylinder: 0
      })
    });
  }

  public snapshot(): Fdc765Snapshot {
    return {
      dor: this.dor,
      control: this.control,
      phase: this.phase,
      mainStatus: this.readMainStatus(),
      commandBytes: [...this.commandBytes],
      resultBytes: [...this.resultBytes],
      interruptPending: this.interruptPending,
      nonDma: this.nonDma,
      selectedDrive: this.selectedDrive,
      dmaBytesPending: this.dmaBytes.length,
      drives: this.drives.map((drive, index) => ({ ...drive, ready: this.driveReady(index) }))
    };
  }

  public capture(): Fdc765State {
    return {
      ...this.snapshot(),
      drives: this.drives.map((drive) => ({ ...drive })),
      interruptResults: this.interruptResults.map((interrupt) => ({ ...interrupt })),
      dmaBytes: [...this.dmaBytes],
      dmaResult: this.dmaResult === undefined ? undefined : [...this.dmaResult]
    };
  }

  public restore(state: Fdc765State): void {
    if (state.drives.length !== this.drives.length)
      throw new RangeError("FDC checkpoint drive count is invalid");
    this.dor = this.byte(state.dor);
    this.control = this.byte(state.control) & 0x03;
    this.phase = state.phase;
    this.commandBytes = state.commandBytes.map((value) => this.byte(value));
    this.resultBytes = state.resultBytes.map((value) => this.byte(value));
    this.interruptPending = state.interruptPending;
    this.nonDma = state.nonDma;
    this.selectedDrive = this.driveIndex(state.selectedDrive);
    state.drives.forEach((drive, index) => {
      this.drives[index] = { ready: drive.ready, cylinder: this.byte(drive.cylinder) };
    });
    this.interruptResults.length = 0;
    this.interruptResults.push(
      ...state.interruptResults.map((interrupt) => ({
        status0: this.byte(interrupt.status0),
        cylinder: this.byte(interrupt.cylinder)
      }))
    );
    this.dmaBytes = state.dmaBytes.map((value) => this.byte(value));
    this.dmaResult = state.dmaResult?.map((value) => this.byte(value));
  }

  private execute(command: number): Fdc765Result {
    const bytes = this.commandBytes;
    this.commandBytes = [];
    switch (command) {
      case COMMAND_SPECIFY:
        this.nonDma = Boolean(bytes[2]! & 1);
        return result(true);
      case COMMAND_SENSE_DRIVE: {
        const unit = bytes[1]! & 0x03;
        const head = (bytes[1]! >>> 2) & 1;
        this.selectedDrive = unit;
        const drive = this.drive(unit);
        let status3 = unit | (head ? STATUS3_HEAD : 0);
        if (drive.cylinder === 0) status3 |= STATUS3_TRACK0;
        if (this.driveReady(unit)) status3 |= STATUS3_READY;
        this.beginResult([status3]);
        return result(true);
      }
      case COMMAND_RECALIBRATE: {
        const unit = bytes[1]! & 0x03;
        this.selectedDrive = unit;
        this.drive(unit).cylinder = 0;
        const irqRequested = this.raiseInterrupt({
          status0: STATUS0_SEEK_END | STATUS0_TRACK0 | unit,
          cylinder: 0
        });
        return result(true, { irqRequested });
      }
      case COMMAND_SENSE_INTERRUPT: {
        const interrupt = this.interruptResults.shift() ?? {
          status0: STATUS0_INVALID,
          cylinder: 0
        };
        this.beginResult([interrupt.status0, interrupt.cylinder]);
        const irqCleared = this.interruptPending;
        this.interruptPending = this.interruptResults.length > 0;
        return result(true, { irqCleared });
      }
      case COMMAND_SEEK: {
        const unit = bytes[1]! & 0x03;
        const target = bytes[2]!;
        this.selectedDrive = unit;
        this.drive(unit).cylinder = target;
        const irqRequested = this.raiseInterrupt({
          status0: STATUS0_SEEK_END | (target === 0 ? STATUS0_TRACK0 : 0) | unit,
          cylinder: target
        });
        return result(true, { irqRequested });
      }
      case COMMAND_READ_ID:
        return this.readId(bytes);
      case COMMAND_READ_DATA:
        return this.readDataCommand(bytes);
      default:
        return result(false);
    }
  }

  private beginResult(bytes: readonly number[]): void {
    this.phase = "result";
    this.resultBytes = [...bytes];
  }

  private raiseInterrupt(interrupt: InterruptResult): boolean {
    this.interruptResults.push(interrupt);
    this.interruptPending = true;
    return Boolean(this.dor & FDC_DOR_INTERRUPT_ENABLE);
  }

  private resetController(): void {
    this.phase = "command";
    this.commandBytes = [];
    this.resultBytes = [];
    this.interruptPending = false;
    this.nonDma = false;
    this.interruptResults.length = 0;
    this.dmaBytes = [];
    this.dmaResult = undefined;
    for (const drive of this.drives) drive.cylinder = 0;
  }

  private drive(index: number): { ready: boolean; cylinder: number } {
    this.driveIndex(index);
    return this.drives[index]!;
  }

  private driveIndex(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index > 3)
      throw new RangeError(`FDC drive is outside 0-3: ${index}`);
    return index;
  }

  private driveReady(index: number): boolean {
    return this.media[index]?.snapshot().ready ?? this.drive(index).ready;
  }

  private readId(bytes: readonly number[]): Fdc765Result {
    const unit = bytes[1]! & 0x03;
    const head = (bytes[1]! >>> 2) & 1;
    this.selectedDrive = unit;
    const drive = this.drive(unit);
    const media = this.media[unit];
    if (!media || !this.driveReady(unit)) return this.invalidExecution(unit);
    try {
      media.readSector(drive.cylinder, head, 1);
      const sizeCode = this.sizeCode(media.geometry.bytesPerSector);
      this.beginResult([unit, 0, 0, drive.cylinder, head, 1, sizeCode]);
      return result(true, {
        irqRequested: this.raiseInterrupt({ status0: unit, cylinder: drive.cylinder })
      });
    } catch {
      return this.invalidExecution(unit);
    }
  }

  private readDataCommand(bytes: readonly number[]): Fdc765Result {
    const unit = bytes[1]! & 0x03;
    const head = (bytes[1]! >>> 2) & 1;
    const cylinder = bytes[2]!;
    const sector = bytes[4]!;
    const sizeCode = bytes[5]!;
    this.selectedDrive = unit;
    const media = this.media[unit];
    if (
      !media ||
      !this.driveReady(unit) ||
      sizeCode !== this.sizeCode(media.geometry.bytesPerSector)
    )
      return this.invalidExecution(unit);
    try {
      this.dmaBytes = [...media.readSector(cylinder, head, sector)];
      this.dmaResult = [unit, 0, 0, cylinder, head, sector, sizeCode];
      this.phase = "execution";
      return result(true);
    } catch {
      return this.invalidExecution(unit);
    }
  }

  private invalidExecution(unit: number): Fdc765Result {
    this.beginResult([STATUS0_INVALID | unit, 0, 0, 0, 0, 0, 0]);
    return result(true, {
      irqRequested: this.raiseInterrupt({ status0: STATUS0_INVALID | unit, cylinder: 0 })
    });
  }

  private sizeCode(bytesPerSector: number): number {
    let code = 0;
    let size = 128;
    while (size < bytesPerSector && code < 7) {
      size <<= 1;
      code += 1;
    }
    if (size !== bytesPerSector)
      throw new RangeError(`Unsupported FDC sector size: ${bytesPerSector}`);
    return code;
  }

  private byte(value: number): number {
    if (!Number.isInteger(value)) throw new RangeError(`FDC byte is not an integer: ${value}`);
    return value & 0xff;
  }
}

export const RTC_TICKS_PER_SECOND = 32_768;

export const enum RtcCmosRegister {
  Seconds = 0x00,
  SecondsAlarm = 0x01,
  Minutes = 0x02,
  MinutesAlarm = 0x03,
  Hours = 0x04,
  HoursAlarm = 0x05,
  Weekday = 0x06,
  Day = 0x07,
  Month = 0x08,
  Year = 0x09,
  StatusA = 0x0a,
  StatusB = 0x0b,
  StatusC = 0x0c,
  StatusD = 0x0d,
  Equipment = 0x14,
  BaseMemoryLow = 0x15,
  BaseMemoryHigh = 0x16,
  ExtendedMemoryLow = 0x17,
  ExtendedMemoryHigh = 0x18,
  ChecksumLow = 0x2e,
  ChecksumHigh = 0x2f
}

const STATUS_A_RATE_MASK = 0x0f;
const STATUS_B_SET = 0x80;
const STATUS_B_PIE = 0x40;
const STATUS_B_AIE = 0x20;
const STATUS_B_UIE = 0x10;
const STATUS_B_BINARY = 0x04;
const STATUS_B_24_HOUR = 0x02;
const STATUS_C_IRQF = 0x80;
const STATUS_C_PF = 0x40;
const STATUS_C_AF = 0x20;
const STATUS_C_UF = 0x10;

export interface RtcDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly weekday: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

export interface RtcCmosOptions {
  readonly initialDateTime?: RtcDateTime;
}

export interface RtcCmosConfiguration {
  readonly baseMemoryKiB?: number;
  readonly extendedMemoryKiB?: number;
  readonly equipment?: number;
}

export interface RtcCmosSnapshot {
  readonly dateTime: RtcDateTime;
  readonly statusA: number;
  readonly statusB: number;
  readonly statusC: number;
  readonly statusD: number;
}

export interface RtcCmosState extends RtcCmosSnapshot {
  readonly data: Uint8Array;
  readonly elapsedTicks: number;
}

export interface RtcAdvanceResult {
  readonly periodic: boolean;
  readonly updated: boolean;
  readonly alarm: boolean;
  readonly interruptRequested: boolean;
}

/**
 * Deterministic MC146818-compatible RTC/CMOS state. Port, IRQ, NMI, and host
 * scheduling policy are deliberately owned by the PC/AT composition layer.
 */
export class RtcCmos {
  private readonly data = new Uint8Array(128);
  private dateTime: RtcDateTime;
  private elapsedTicks = 0;

  public constructor(options: RtcCmosOptions = {}) {
    this.dateTime = options.initialDateTime ?? {
      year: 1990,
      month: 1,
      day: 1,
      weekday: 1,
      hour: 0,
      minute: 0,
      second: 0
    };
    this.validateDateTime(this.dateTime);
    this.reset();
  }

  public reset(): void {
    this.data.fill(0);
    this.data[RtcCmosRegister.StatusA] = 0x26;
    this.data[RtcCmosRegister.StatusB] = STATUS_B_24_HOUR;
    this.data[RtcCmosRegister.StatusD] = 0x80;
    this.elapsedTicks = 0;
  }

  public read(index: number): number {
    const register = this.normalizeIndex(index);
    if (register <= RtcCmosRegister.Year) return this.readTimeRegister(register);
    if (register === RtcCmosRegister.StatusC) {
      const result = this.data[register]!;
      this.data[register] = 0;
      return result;
    }
    return this.data[register]!;
  }

  public write(index: number, value: number): void {
    const register = this.normalizeIndex(index);
    const data = byte(value);
    if (
      register === RtcCmosRegister.SecondsAlarm ||
      register === RtcCmosRegister.MinutesAlarm ||
      register === RtcCmosRegister.HoursAlarm
    ) {
      this.data[register] = data;
      return;
    }
    if (register <= RtcCmosRegister.Year) return this.writeTimeRegister(register, data);
    if (register === RtcCmosRegister.StatusC || register === RtcCmosRegister.StatusD) return;
    this.data[register] = data;
  }

  public advance(ticks: number): RtcAdvanceResult {
    if (!Number.isInteger(ticks) || ticks < 0)
      throw new RangeError("RTC ticks must be non-negative integers");
    let periodic = false;
    let updated = false;
    let alarm = false;
    for (let tick = 0; tick < ticks; tick += 1) {
      this.elapsedTicks = (this.elapsedTicks + 1) % RTC_TICKS_PER_SECOND;
      const period = this.periodicPeriod();
      if (period !== undefined && this.elapsedTicks % period === 0) {
        periodic = true;
        this.raiseEvent(STATUS_C_PF, STATUS_B_PIE);
      }
      if (this.elapsedTicks === 0 && !(this.data[RtcCmosRegister.StatusB]! & STATUS_B_SET)) {
        this.incrementSecond();
        updated = true;
        this.raiseEvent(STATUS_C_UF, STATUS_B_UIE);
        if (this.matchesAlarm()) {
          alarm = true;
          this.raiseEvent(STATUS_C_AF, STATUS_B_AIE);
        }
      }
    }
    return {
      periodic,
      updated,
      alarm,
      interruptRequested: Boolean(this.data[RtcCmosRegister.StatusC]! & STATUS_C_IRQF)
    };
  }

  public snapshot(): RtcCmosSnapshot {
    return {
      dateTime: { ...this.dateTime },
      statusA: this.data[RtcCmosRegister.StatusA]!,
      statusB: this.data[RtcCmosRegister.StatusB]!,
      statusC: this.data[RtcCmosRegister.StatusC]!,
      statusD: this.data[RtcCmosRegister.StatusD]!
    };
  }

  public capture(): RtcCmosState {
    return { ...this.snapshot(), data: this.data.slice(), elapsedTicks: this.elapsedTicks };
  }

  public restore(state: RtcCmosState): void {
    if (state.data.length !== this.data.length)
      throw new RangeError("RTC checkpoint CMOS size is invalid");
    if (
      !Number.isInteger(state.elapsedTicks) ||
      state.elapsedTicks < 0 ||
      state.elapsedTicks >= RTC_TICKS_PER_SECOND
    )
      throw new RangeError("RTC checkpoint tick phase is invalid");
    this.validateDateTime(state.dateTime);
    this.data.set(state.data);
    this.dateTime = { ...state.dateTime };
    this.elapsedTicks = state.elapsedTicks;
  }

  public updateChecksum(): void {
    let checksum = 0;
    for (let index = 0x10; index <= 0x2d; index += 1) checksum += this.data[index]!;
    this.data[RtcCmosRegister.ChecksumLow] = checksum & 0xff;
    this.data[RtcCmosRegister.ChecksumHigh] = checksum >>> 8;
  }

  public applyConfiguration(configuration: RtcCmosConfiguration): void {
    if (configuration.baseMemoryKiB !== undefined)
      this.writeWord(RtcCmosRegister.BaseMemoryLow, configuration.baseMemoryKiB);
    if (configuration.extendedMemoryKiB !== undefined)
      this.writeWord(RtcCmosRegister.ExtendedMemoryLow, configuration.extendedMemoryKiB);
    if (configuration.equipment !== undefined)
      this.data[RtcCmosRegister.Equipment] = byte(configuration.equipment);
    this.updateChecksum();
  }

  private readTimeRegister(register: number): number {
    if (
      register === RtcCmosRegister.SecondsAlarm ||
      register === RtcCmosRegister.MinutesAlarm ||
      register === RtcCmosRegister.HoursAlarm
    ) {
      return this.data[register]!;
    }
    const raw = this.timeValue(register);
    if (
      register === RtcCmosRegister.Hours &&
      !(this.data[RtcCmosRegister.StatusB]! & STATUS_B_24_HOUR)
    ) {
      const pm = raw >= 12;
      const hour = raw % 12 || 12;
      return this.externalTimeValue(hour) | (pm ? 0x80 : 0);
    }
    return this.externalTimeValue(raw);
  }

  private writeTimeRegister(register: number, value: number): void {
    if (register === RtcCmosRegister.Weekday && value === 0)
      throw new RangeError("RTC weekday is 1-7");
    const hour12 =
      register === RtcCmosRegister.Hours &&
      !(this.data[RtcCmosRegister.StatusB]! & STATUS_B_24_HOUR);
    const decoded = this.internalTimeValue(hour12 ? value & 0x7f : value);
    let replacement = decoded;
    if (hour12) {
      if (decoded < 1 || decoded > 12) throw new RangeError("RTC 12-hour value is outside 1-12");
      replacement = decoded % 12;
      if (value & 0x80) replacement += 12;
    }
    this.dateTime = { ...this.dateTime, [this.timeKey(register)]: replacement };
    this.validateDateTime(this.dateTime);
  }

  private timeValue(register: number): number {
    switch (register) {
      case RtcCmosRegister.Seconds:
        return this.dateTime.second;
      case RtcCmosRegister.Minutes:
        return this.dateTime.minute;
      case RtcCmosRegister.Hours:
        return this.dateTime.hour;
      case RtcCmosRegister.Weekday:
        return this.dateTime.weekday;
      case RtcCmosRegister.Day:
        return this.dateTime.day;
      case RtcCmosRegister.Month:
        return this.dateTime.month;
      case RtcCmosRegister.Year:
        return this.dateTime.year % 100;
      default:
        throw new RangeError(`RTC time register is not mapped: ${register}`);
    }
  }

  private timeKey(register: number): keyof RtcDateTime {
    switch (register) {
      case RtcCmosRegister.Seconds:
        return "second";
      case RtcCmosRegister.Minutes:
        return "minute";
      case RtcCmosRegister.Hours:
        return "hour";
      case RtcCmosRegister.Weekday:
        return "weekday";
      case RtcCmosRegister.Day:
        return "day";
      case RtcCmosRegister.Month:
        return "month";
      case RtcCmosRegister.Year:
        return "year";
      default:
        throw new RangeError(`RTC time register cannot be written: ${register}`);
    }
  }

  private externalTimeValue(value: number): number {
    return this.data[RtcCmosRegister.StatusB]! & STATUS_B_BINARY ? value : toBcd(value);
  }

  private internalTimeValue(value: number): number {
    return this.data[RtcCmosRegister.StatusB]! & STATUS_B_BINARY ? value : fromBcd(value);
  }

  private periodicPeriod(): number | undefined {
    const rate = this.data[RtcCmosRegister.StatusA]! & STATUS_A_RATE_MASK;
    return rate >= 3 ? 1 << (rate - 1) : undefined;
  }

  private raiseEvent(flag: number, enable: number): void {
    this.data[RtcCmosRegister.StatusC] |= flag;
    if (this.data[RtcCmosRegister.StatusB]! & enable)
      this.data[RtcCmosRegister.StatusC] |= STATUS_C_IRQF;
  }

  private matchesAlarm(): boolean {
    return (
      this.alarmMatches(RtcCmosRegister.SecondsAlarm, this.dateTime.second) &&
      this.alarmMatches(RtcCmosRegister.MinutesAlarm, this.dateTime.minute) &&
      this.alarmMatches(RtcCmosRegister.HoursAlarm, this.dateTime.hour)
    );
  }

  private alarmMatches(register: RtcCmosRegister, value: number): boolean {
    const alarm = this.data[register]!;
    if ((alarm & 0xc0) === 0xc0) return true;
    return this.internalTimeValue(alarm & 0x7f) === value;
  }

  private incrementSecond(): void {
    let { year, month, day, weekday, hour, minute, second } = this.dateTime;
    second += 1;
    if (second === 60) {
      second = 0;
      minute += 1;
      if (minute === 60) {
        minute = 0;
        hour += 1;
        if (hour === 24) {
          hour = 0;
          weekday = (weekday % 7) + 1;
          day += 1;
          if (day > daysInMonth(year, month)) {
            day = 1;
            month += 1;
            if (month === 13) {
              month = 1;
              year += 1;
            }
          }
        }
      }
    }
    this.dateTime = { year, month, day, weekday, hour, minute, second };
  }

  private normalizeIndex(index: number): number {
    if (!Number.isInteger(index)) throw new RangeError(`RTC index is not an integer: ${index}`);
    return index & 0x7f;
  }

  private writeWord(index: number, value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff)
      throw new RangeError("RTC CMOS configuration word is outside 0-65535");
    this.data[index] = value & 0xff;
    this.data[index + 1] = value >>> 8;
  }

  private validateDateTime(value: RtcDateTime): void {
    if (!Number.isInteger(value.year) || value.year < 0 || value.year > 9999)
      throw new RangeError("RTC year is outside 0-9999");
    if (!Number.isInteger(value.month) || value.month < 1 || value.month > 12)
      throw new RangeError("RTC month is outside 1-12");
    if (
      !Number.isInteger(value.day) ||
      value.day < 1 ||
      value.day > daysInMonth(value.year, value.month)
    )
      throw new RangeError("RTC day is outside the month");
    if (!Number.isInteger(value.weekday) || value.weekday < 1 || value.weekday > 7)
      throw new RangeError("RTC weekday is outside 1-7");
    if (!Number.isInteger(value.hour) || value.hour < 0 || value.hour > 23)
      throw new RangeError("RTC hour is outside 0-23");
    if (!Number.isInteger(value.minute) || value.minute < 0 || value.minute > 59)
      throw new RangeError("RTC minute is outside 0-59");
    if (!Number.isInteger(value.second) || value.second < 0 || value.second > 59)
      throw new RangeError("RTC second is outside 0-59");
  }
}

function byte(value: number): number {
  if (!Number.isInteger(value)) throw new RangeError(`RTC byte is not an integer: ${value}`);
  return value & 0xff;
}

function toBcd(value: number): number {
  return Math.floor(value / 10) * 16 + (value % 10);
}

function fromBcd(value: number): number {
  const result = (value >>> 4) * 10 + (value & 0x0f);
  if ((value & 0x0f) > 9 || result > 99) throw new RangeError("RTC BCD value is invalid");
  return result;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

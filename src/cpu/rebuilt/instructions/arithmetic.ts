export type ArithmeticWidth = 8 | 16 | 32;

export const EFLAGS_CARRY = 0x00000001;
export const EFLAGS_PARITY = 0x00000004;
export const EFLAGS_AUXILIARY_CARRY = 0x00000010;
export const EFLAGS_ZERO = 0x00000040;
export const EFLAGS_SIGN = 0x00000080;
export const EFLAGS_OVERFLOW = 0x00000800;

const ARITHMETIC_MASK =
  EFLAGS_CARRY |
  EFLAGS_PARITY |
  EFLAGS_AUXILIARY_CARRY |
  EFLAGS_ZERO |
  EFLAGS_SIGN |
  EFLAGS_OVERFLOW;
const LOGICAL_MASK = EFLAGS_CARRY | EFLAGS_PARITY | EFLAGS_ZERO | EFLAGS_SIGN | EFLAGS_OVERFLOW;

export interface ArithmeticResult {
  readonly value: number;
  readonly flags: number;
}

export function add(
  currentFlags: number,
  left: number,
  right: number,
  width: ArithmeticWidth,
  carry = 0
): ArithmeticResult {
  const mask = widthMask(width);
  const sign = signMask(width);
  const source = normalize(left, width);
  const addend = normalize(right, width);
  const sum = source + addend + carry;
  const value = sum & mask;
  let flags = commonResultFlags(currentFlags, value, width, ARITHMETIC_MASK);
  if (sum > mask) flags |= EFLAGS_CARRY;
  if ((source ^ addend ^ value) & 0x10) flags |= EFLAGS_AUXILIARY_CARRY;
  if ((~(source ^ addend) & (source ^ value) & sign) !== 0) flags |= EFLAGS_OVERFLOW;
  return { value: normalize(value, width), flags: flags >>> 0 };
}

export function subtract(
  currentFlags: number,
  left: number,
  right: number,
  width: ArithmeticWidth,
  borrow = 0
): ArithmeticResult {
  const mask = widthMask(width);
  const sign = signMask(width);
  const source = normalize(left, width);
  const subtrahend = normalize(right, width) + borrow;
  const effectiveRight = subtrahend & mask;
  const value = (source - subtrahend) & mask;
  let flags = commonResultFlags(currentFlags, value, width, ARITHMETIC_MASK);
  if (source < subtrahend) flags |= EFLAGS_CARRY;
  if ((source ^ effectiveRight ^ value) & 0x10) flags |= EFLAGS_AUXILIARY_CARRY;
  if (((source ^ effectiveRight) & (source ^ value) & sign) !== 0) flags |= EFLAGS_OVERFLOW;
  return { value: normalize(value, width), flags: flags >>> 0 };
}

export function logical(
  currentFlags: number,
  value: number,
  width: ArithmeticWidth
): ArithmeticResult {
  const normalized = normalize(value, width);
  return {
    value: normalized,
    flags: commonResultFlags(currentFlags, normalized, width, LOGICAL_MASK) >>> 0
  };
}

export function decimalAdjustFlags(
  currentFlags: number,
  value: number,
  carry: boolean,
  auxiliaryCarry: boolean
): number {
  let flags =
    currentFlags &
    ~(EFLAGS_CARRY | EFLAGS_AUXILIARY_CARRY | EFLAGS_PARITY | EFLAGS_ZERO | EFLAGS_SIGN);
  const normalized = value & 0xff;
  if (carry) flags |= EFLAGS_CARRY;
  if (auxiliaryCarry) flags |= EFLAGS_AUXILIARY_CARRY;
  if (normalized === 0) flags |= EFLAGS_ZERO;
  if (normalized & EFLAGS_SIGN) flags |= EFLAGS_SIGN;
  if (evenParity(normalized)) flags |= EFLAGS_PARITY;
  return flags >>> 0;
}

function commonResultFlags(
  currentFlags: number,
  value: number,
  width: ArithmeticWidth,
  mask: number
): number {
  let flags = currentFlags & ~mask;
  if (value === 0) flags |= EFLAGS_ZERO;
  if (value & signMask(width)) flags |= EFLAGS_SIGN;
  if (evenParity(value & 0xff)) flags |= EFLAGS_PARITY;
  return flags;
}

function evenParity(value: number): boolean {
  let bits = value;
  let parity = true;
  while (bits) {
    parity = !parity;
    bits &= bits - 1;
  }
  return parity;
}

function widthMask(width: ArithmeticWidth): number {
  return width === 8 ? 0xff : width === 16 ? 0xffff : 0xffffffff;
}

function signMask(width: ArithmeticWidth): number {
  return width === 8 ? 0x80 : width === 16 ? 0x8000 : 0x80000000;
}

function normalize(value: number, width: ArithmeticWidth): number {
  return width === 32 ? value >>> 0 : value & widthMask(width);
}

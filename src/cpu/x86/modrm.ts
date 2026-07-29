export interface ModRm {
  readonly mod: number;
  readonly reg: number;
  readonly rm: number;
  readonly registerDirect: boolean;
}

export function decodeModRm(value: number): ModRm {
  const normalized = value & 0xff;
  const mod = normalized >>> 6;
  return {
    mod,
    reg: (normalized >>> 3) & 0x07,
    rm: normalized & 0x07,
    registerDirect: mod === 0x03
  };
}

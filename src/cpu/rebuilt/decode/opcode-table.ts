export type PrimaryOpcodeFamily =
  | "first-interval"
  | "register-stack"
  | "frame-immediate"
  | "string-io"
  | "arpl"
  | "short-conditional"
  | "group-one"
  | "test-modrm"
  | "exchange-modrm"
  | "move-modrm"
  | "segment-move"
  | "lea"
  | "pop-modrm"
  | "accumulator-exchange"
  | "sign-extension"
  | "flag-stack"
  | "wait"
  | "flag-transfer"
  | "moffs-move"
  | "string"
  | "accumulator-test"
  | "immediate-move"
  | "stack-frame-control"
  | "interrupt"
  | "undefined"
  | "immediate-modrm-move"
  | "load-far-pointer"
  | "ascii-adjust"
  | "xlat"
  | "loop"
  | "port-io"
  | "near-control"
  | "flag-control"
  | "processor-control"
  | "group-three"
  | "group-four-five"
  | "shift-rotate"
  | "unsupported";

export type ExtendedOpcodeFamily =
  | "undefined"
  | "near-conditional"
  | "set-condition"
  | "system"
  | "extended"
  | "unsupported";

interface OpcodeDispatchEntry<TFamily extends string> {
  readonly family: TFamily;
  readonly opcodes?: readonly number[];
  readonly range?: readonly [number, number];
}

const PRIMARY_DISPATCH_TABLE: readonly OpcodeDispatchEntry<PrimaryOpcodeFamily>[] = [
  { family: "first-interval", range: [0x00, 0x3f] },
  { family: "register-stack", range: [0x40, 0x5f] },
  { family: "frame-immediate", opcodes: [0x60, 0x61, 0x62, 0x68, 0x69, 0x6a, 0x6b] },
  { family: "arpl", opcodes: [0x63] },
  { family: "string-io", range: [0x6c, 0x6f] },
  { family: "short-conditional", range: [0x70, 0x7f] },
  { family: "group-one", opcodes: [0x80, 0x81, 0x83] },
  { family: "undefined", opcodes: [0x82, 0xd6, 0xf1] },
  { family: "test-modrm", opcodes: [0x84, 0x85] },
  { family: "exchange-modrm", opcodes: [0x86, 0x87] },
  { family: "move-modrm", range: [0x88, 0x8b] },
  { family: "segment-move", opcodes: [0x8c, 0x8e] },
  { family: "lea", opcodes: [0x8d] },
  { family: "pop-modrm", opcodes: [0x8f] },
  { family: "accumulator-exchange", range: [0x90, 0x97] },
  { family: "sign-extension", opcodes: [0x98, 0x99] },
  { family: "near-control", opcodes: [0x9a, 0xe8, 0xe9, 0xea, 0xeb] },
  { family: "wait", opcodes: [0x9b] },
  { family: "flag-stack", opcodes: [0x9c, 0x9d] },
  { family: "flag-transfer", opcodes: [0x9e, 0x9f] },
  { family: "moffs-move", range: [0xa0, 0xa3] },
  { family: "string", opcodes: [0xa4, 0xa5, 0xa6, 0xa7, 0xaa, 0xab, 0xac, 0xad, 0xae, 0xaf] },
  { family: "accumulator-test", opcodes: [0xa8, 0xa9] },
  { family: "immediate-move", range: [0xb0, 0xbf] },
  { family: "stack-frame-control", opcodes: [0xc2, 0xc3, 0xc8, 0xc9, 0xca, 0xcb] },
  { family: "load-far-pointer", opcodes: [0xc4, 0xc5] },
  { family: "immediate-modrm-move", opcodes: [0xc6, 0xc7] },
  { family: "interrupt", opcodes: [0xcc, 0xcd, 0xce, 0xcf] },
  { family: "shift-rotate", opcodes: [0xc0, 0xc1, 0xd0, 0xd1, 0xd2, 0xd3] },
  { family: "ascii-adjust", opcodes: [0xd4, 0xd5] },
  { family: "xlat", opcodes: [0xd7] },
  { family: "undefined", range: [0xd8, 0xdf] },
  { family: "loop", opcodes: [0xe0, 0xe1, 0xe2, 0xe3] },
  { family: "port-io", opcodes: [0xe4, 0xe5, 0xe6, 0xe7, 0xec, 0xed, 0xee, 0xef] },
  { family: "processor-control", opcodes: [0xf4, 0xfa, 0xfb] },
  { family: "flag-control", opcodes: [0xf5, 0xf8, 0xf9, 0xfc, 0xfd] },
  { family: "group-three", opcodes: [0xf6, 0xf7] },
  { family: "group-four-five", opcodes: [0xfe, 0xff] }
];

const EXTENDED_DISPATCH_TABLE: readonly OpcodeDispatchEntry<ExtendedOpcodeFamily>[] = [
  { family: "near-conditional", range: [0x80, 0x8f] },
  { family: "set-condition", range: [0x90, 0x9f] },
  { family: "system", opcodes: [0x00, 0x01, 0x02, 0x03, 0x06, 0x20, 0x21, 0x22, 0x23, 0x24, 0x26] },
  {
    family: "extended",
    opcodes: [
      0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xab, 0xac, 0xad, 0xae,
      0xaf, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xba, 0xbb, 0xbc, 0xbd, 0xbe, 0xbf
    ]
  }
];

export function primaryOpcodeFamily(opcode: number): PrimaryOpcodeFamily {
  return lookupOpcodeFamily(PRIMARY_DISPATCH_TABLE, opcode, "unsupported");
}

export function extendedOpcodeFamily(opcode: number): ExtendedOpcodeFamily {
  if (nxvmUndefinedExtendedOpcode(opcode)) return "undefined";
  return lookupOpcodeFamily(EXTENDED_DISPATCH_TABLE, opcode, "unsupported");
}

function lookupOpcodeFamily<TFamily extends string>(
  entries: readonly OpcodeDispatchEntry<TFamily>[],
  opcode: number,
  fallback: TFamily
): TFamily {
  return entries.find((entry) => matches(entry, opcode))?.family ?? fallback;
}

function matches(entry: OpcodeDispatchEntry<string>, opcode: number): boolean {
  return (
    entry.opcodes?.includes(opcode) ??
    (entry.range !== undefined && opcode >= entry.range[0] && opcode <= entry.range[1])
  );
}

function nxvmUndefinedExtendedOpcode(opcode: number): boolean {
  return (
    [
      0x04, 0x05, 0x07, 0x08, 0x09, 0x25, 0xa2, 0xa6, 0xa7, 0xaa, 0xae, 0xb0, 0xb1, 0xb8, 0xb9
    ].includes(opcode) ||
    (opcode >= 0x0a && opcode <= 0x1f) ||
    (opcode >= 0x27 && opcode <= 0x2f) ||
    (opcode >= 0x30 && opcode <= 0x7f) ||
    opcode >= 0xc0
  );
}

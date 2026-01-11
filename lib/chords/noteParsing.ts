export type ParseResult =
  | { ok: true; notes: number[]; normalizedInput: string; warnings: string[] }
  | { ok: false; message: string; warnings: string[] };

const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  "B#": 0,
};

const PC_TO_SHARP: string[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const PC_TO_FLAT: string[] = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export function pcToName(pc: number, preferFlats: boolean): string {
  const n = ((pc % 12) + 12) % 12;
  return preferFlats ? PC_TO_FLAT[n] : PC_TO_SHARP[n];
}

function cleanToken(tok: string): string {
  return tok.replace(/[^\w#b]/g, "");
}

export function parseNotesInput(input: string): ParseResult {
  const raw = input
    .trim()
    // normalize unicode accidentals
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
    // normalize word/hyphen accidentals:
    // "B flat", "B-flat" -> "Bb"
    // "C sharp", "C-sharp" -> "C#"
    .replace(/\b([A-Ga-g])(?:\s|-)*flat\b/gi, "$1b")
    .replace(/\b([A-Ga-g])(?:\s|-)*sharp\b/gi, "$1#")
    // normalize lowercase tokens like "bb" or "f#" -> "Bb", "F#"
    .replace(
      /\b([a-g])([b#])\b/g,
      (_, note, acc) => `${note.toUpperCase()}${acc}`
    );

  if (!raw)
    return {
      ok: false,
      message: "Type some notes (e.g., C E G Bb).",
      warnings: [],
    };

  const tokens = raw
    .split(/[\s,]+/g)
    .map((t) => cleanToken(t))
    .filter(Boolean);

  if (tokens.length === 0)
    return {
      ok: false,
      message: "I couldn't find any notes in that input.",
      warnings: [],
    };

  const pcs: number[] = [];
  const warnings: string[] = [];

  for (const t of tokens) {
    const m = t.match(/^([A-Ga-g])([#b]{0,2})(\d+)?$/);
    if (!m) {
      warnings.push(`Ignored “${t}”`);
      continue;
    }
    const letter = m[1].toUpperCase();
    const acc = m[2] ?? "";
    const key = `${letter}${acc}`;

    const pc = NOTE_TO_PC[key];
    if (pc === undefined) {
      warnings.push(`Unknown note “${t}”`);
      continue;
    }
    pcs.push(pc);
  }

  const unique = Array.from(new Set(pcs));
  if (unique.length < 2)
    return {
      ok: false,
      message: "Please enter at least two distinct notes.",
      warnings,
    };

  return {
    ok: true,
    notes: unique,
    normalizedInput: unique.join(","),
    warnings,
  };
}

export function preferFlatsFromInput(input: string): boolean {
  const flats = (input.match(/b/g) || []).length;
  const sharps = (input.match(/#/g) || []).length;
  return flats > sharps;
}

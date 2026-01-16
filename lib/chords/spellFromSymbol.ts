// lib/chords/spellFromSymbol.ts

type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

// Natural pitch classes for letters (no accidentals)
const LETTER_TO_PC: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Map common chord-tone intervals to diatonic degree steps from root letter:
// 0=unison, 2=2nd, 4=3rd, 5=4th, 7=5th, 9=6th, 10/11=7th, 14=9th, etc.
function intervalToDegreeSteps(semitones: number): number {
  const i = ((semitones % 12) + 12) % 12;

  // triad-ish + 7ths
  if (i === 0) return 0; // 1
  if (i === 1 || i === 2) return 1; // #/b2 or 2
  if (i === 3 || i === 4) return 2; // b/3 or 3
  if (i === 5 || i === 6) return 3; // 4 or #4/b5 (we'll still call it 4/5-ish via accidental)
  if (i === 7 || i === 8) return 4; // 5 or #5
  if (i === 9 || i === 10) return 5; // 6 or b7 (b7 is still degree 7 letter-wise)
  if (i === 11) return 6; // 7 (maj7)

  // fallback
  return 0;
}

function shiftLetter(root: Letter, steps: number): Letter {
  const idx = LETTERS.indexOf(root);
  return LETTERS[(idx + steps) % 7];
}

function normalizeDelta(d: number) {
  // convert to nearest signed distance in [-6..+6]
  let x = ((d % 12) + 12) % 12; // 0..11
  if (x > 6) x -= 12;
  return x;
}

function accidentalFromDelta(delta: number) {
  // keep it simple: bb, b, natural, #, ##
  if (delta === -2) return "bb";
  if (delta === -1) return "b";
  if (delta === 0) return "";
  if (delta === 1) return "#";
  if (delta === 2) return "##";
  // extreme cases: just fall back to sharps/flats-ish
  if (delta < 0) return "b".repeat(Math.min(3, Math.abs(delta)));
  return "#".repeat(Math.min(3, delta));
}

function parseRootSpelling(rootSymbol: string): { letter: Letter; acc: string } | null {
  const m = rootSymbol.trim().match(/^([A-Ga-g])([#b]{0,2})/);
  if (!m) return null;
  const letter = m[1].toUpperCase() as Letter;
  const acc = m[2] ?? "";
  return { letter, acc };
}

function applyAccToPc(letter: Letter, acc: string): number {
  let pc = LETTER_TO_PC[letter];
  for (const ch of acc) {
    if (ch === "#") pc += 1;
    if (ch === "b") pc -= 1;
  }
  return ((pc % 12) + 12) % 12;
}

export function spellChordTonesFromSymbol(
  rootSymbol: string,
  intervalsFromRoot: number[]
): string {
  const rootParsed = parseRootSpelling(rootSymbol);
  if (!rootParsed) return "";

  const rootLetter = rootParsed.letter;
  const rootPc = applyAccToPc(rootLetter, rootParsed.acc);

  // Keep order: tonic upwards, sorted by interval (0, 3/4, 7, 10/11, 14...)
  const ordered = [...new Set(intervalsFromRoot)].sort((a, b) => a - b);

  const out: string[] = [];

  for (const semis of ordered) {
    const degreeSteps = intervalToDegreeSteps(semis);
    const targetLetter = shiftLetter(rootLetter, degreeSteps);

    const desiredPc = (rootPc + semis) % 12;
    const naturalPc = LETTER_TO_PC[targetLetter];

    const delta = normalizeDelta(desiredPc - naturalPc);
    const acc = accidentalFromDelta(delta);

    out.push(`${targetLetter}${acc}`);
  }

  return out.join(" ");
}

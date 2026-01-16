// lib/chords/spellFromSymbol.ts

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
type Letter = (typeof LETTERS)[number];

// Natural pitch classes
const NATURAL_PC: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function parseRootSpelling(root: string): { letter: Letter; acc: string; pc: number } | null {
  const m = root.trim().match(/^([A-Ga-g])([#b]{0,2})$/);
  if (!m) return null;

  const letter = m[1].toUpperCase() as Letter;
  const acc = m[2] ?? "";

  let pc = NATURAL_PC[letter];
  for (const ch of acc) pc += ch === "#" ? 1 : -1;

  return { letter, acc, pc: mod(pc, 12) };
}

// Map semitone intervals to diatonic scale degrees (relative to root letter)
// 1,3,5,7,9,11,13 -> steps: 0,2,4,6,1,3,5 (mod 7)
function intervalToDegreeSteps(i: number): number {
  const x = mod(i, 24); // enough to cover up to 13ths
  if (x === 0) return 0;                    // 1
  if (x === 1 || x === 2) return 1;         // 2 / 9
  if (x === 3 || x === 4) return 2;         // 3
  if (x === 5 || x === 6) return 3;         // 4 / #11
  if (x === 7 || x === 8) return 4;         // 5
  if (x === 9 || x === 10) return 5;        // 6 / 13
  if (x === 11) return 6;                   // 7 (maj7)
  if (x === 13 || x === 14) return 1;       // b9 / 9
  if (x === 15 || x === 16) return 2;       // #9 / 3-ish
  if (x === 17 || x === 18) return 3;       // 11 / #11
  if (x === 20 || x === 21) return 5;       // b13 / 13
  return 0;
}

function accidentalFromDelta(delta: number) {
  // delta should be in range [-2..2] for our use-cases
  if (delta === -2) return "bb";
  if (delta === -1) return "b";
  if (delta === 0) return "";
  if (delta === 1) return "#";
  if (delta === 2) return "##";
  // fall back (rare): pick something readable
  return delta > 0 ? "#".repeat(delta) : "b".repeat(-delta);
}

function spellFromLetterAndPc(letter: Letter, targetPc: number) {
  const natural = NATURAL_PC[letter];
  const diff = mod(targetPc - natural, 12);

  // Choose the closest delta in [-2..2] if possible
  const candidates = [diff, diff - 12]; // e.g. 11 could be -1
  let best = candidates[0];
  for (const c of candidates) {
    if (Math.abs(c) < Math.abs(best)) best = c;
  }

  // clamp-ish to readable accidentals
  if (best > 6) best -= 12;

  // Most chords will land in [-2..2]
  if (best < -2) best = -2;
  if (best > 2) best = 2;

  return `${letter}${accidentalFromDelta(best)}`;
}

export function spellChordTonesFromSymbol(rootSymbol: string, intervalsFromRoot: number[]) {
  const root = parseRootSpelling(rootSymbol);
  if (!root) return "";

  // unique + sorted (no Set spread, so your TS build is happy)
  const ordered = Array.from(new Set(intervalsFromRoot)).sort((a, b) => a - b);

  const rootIndex = LETTERS.indexOf(root.letter);

  const out: string[] = [];
  for (const interval of ordered) {
    const targetPc = mod(root.pc + interval, 12);

    const steps = intervalToDegreeSteps(interval);
    const letter = LETTERS[mod(rootIndex + steps, 7)];

    out.push(spellFromLetterAndPc(letter, targetPc));
  }

  return out.join(" ");
}

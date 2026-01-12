// lib/chords/parseChordSymbol.ts
export type ParsedChordSymbol =
  | {
      ok: true;
      rootPc: number;
      intervalsFromRoot: number[]; // semitones above root
      normalizedSymbol: string;
      warnings: string[];
    }
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

function norm(s: string) {
  return s
    .trim()
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
    .replace(/\s+/g, "");
}

// Very pragmatic v1 parser:
// Supports: maj, min/m, dim, aug, sus2/sus4
// Extensions: 6, 7, maj7, 9, 11, 13
// Alterations: b5/#5, b9/#9, #11, b13
// m7b5 supported
export function parseChordSymbol(input: string): ParsedChordSymbol {
  const s = norm(input);
  if (!s) return { ok: false, message: "Type a chord symbol (e.g., C7, F#m7b5).", warnings: [] };

  // Root: letter + optional accidental
  const m = s.match(/^([A-G])([#b]?)(.*)$/i);
  if (!m) return { ok: false, message: "Couldn’t read the root note.", warnings: [] };

  const letter = m[1].toUpperCase();
  const acc = (m[2] ?? "") as "" | "#" | "b";
  const rest = (m[3] ?? "");

  const rootKey = `${letter}${acc}`;
  const rootPc = NOTE_TO_PC[rootKey];
  if (rootPc === undefined) return { ok: false, message: `Unknown root note “${rootKey}”.`, warnings: [] };

  const warnings: string[] = [];
  let quality = "maj"; // maj | min | dim | aug | sus2 | sus4
  let r = rest;

  // quality tokens
  // Order matters (maj before m)
  if (r.startsWith("maj")) { quality = "maj"; r = r.slice(3); }
  else if (r.startsWith("min")) { quality = "min"; r = r.slice(3); }
  else if (r.startsWith("m")) { quality = "min"; r = r.slice(1); }
  else if (r.startsWith("dim")) { quality = "dim"; r = r.slice(3); }
  else if (r.startsWith("o")) { quality = "dim"; r = r.slice(1); }
  else if (r.startsWith("aug")) { quality = "aug"; r = r.slice(3); }
  else if (r.startsWith("+")) { quality = "aug"; r = r.slice(1); }
  else if (r.startsWith("sus2")) { quality = "sus2"; r = r.slice(4); }
  else if (r.startsWith("sus4")) { quality = "sus4"; r = r.slice(4); }
  else if (r.startsWith("sus")) { quality = "sus4"; r = r.slice(3); }

  // Base triad intervals
  let intervals: number[] = [];
  if (quality === "maj") intervals = [0, 4, 7];
  if (quality === "min") intervals = [0, 3, 7];
  if (quality === "dim") intervals = [0, 3, 6];
  if (quality === "aug") intervals = [0, 4, 8];
  if (quality === "sus2") intervals = [0, 2, 7];
  if (quality === "sus4") intervals = [0, 5, 7];

  // Special-case m7b5 commonly written as "m7b5"
  // If we see "7b5" after minor quality, treat as half-diminished
  if (quality === "min" && r.startsWith("7b5")) {
    intervals = [0, 3, 6, 10];
    r = r.slice(3);
  }

  // Extension
  // maj7 explicit
  if (r.startsWith("maj7")) {
    intervals = add(intervals, 11);
    r = r.slice(4);
  } else {
    const ext = r.match(/^(6|7|9|11|13)/);
    if (ext) {
      const n = parseInt(ext[1], 10);
      if (n === 6) intervals = add(intervals, 9);
      if (n === 7) intervals = add(intervals, 10);
      if (n === 9) intervals = add(add(intervals, 10), 14);   // b7 + 9
      if (n === 11) intervals = add(add(add(intervals, 10), 14), 17);
      if (n === 13) intervals = add(add(add(add(intervals, 10), 14), 17), 21);
      r = r.slice(ext[1].length);
    }
  }

  // Optional parentheses wrapper for alterations
  if (r.startsWith("(") && r.endsWith(")")) r = r.slice(1, -1);

  // Alterations (very simple tokenization)
  // examples: b5 #5 b9 #9 #11 b13
  const altRe = /([b#])(5|9|11|13)/g;
  let altMatch: RegExpExecArray | null;
  while ((altMatch = altRe.exec(r))) {
    const sign = altMatch[1];
    const degree = parseInt(altMatch[2], 10);

    const semitone = degreeToSemitone(degree);
    const adjusted = sign === "b" ? semitone - 1 : semitone + 1;

    // Replace if present, else add
    intervals = replaceOrAdd(intervals, semitone, adjusted);
  }

  // Normalize: unique + sorted
  intervals = Array.from(new Set(intervals)).sort((a, b) => a - b);

  return {
    ok: true,
    rootPc,
    intervalsFromRoot: intervals,
    normalizedSymbol: `${letter}${acc}${quality === "maj" ? "" : quality === "min" ? "m" : quality}`,
    warnings,
  };
}

function add(arr: number[], v: number) {
  return arr.includes(v) ? arr : [...arr, v];
}

function replaceOrAdd(arr: number[], target: number, replacement: number) {
  const hasTarget = arr.includes(target);
  const next = hasTarget ? arr.map((x) => (x === target ? replacement : x)) : [...arr, replacement];
  return next;
}

// Degree to semitone above root, assuming default extensions:
// 5=7, 9=14, 11=17, 13=21
function degreeToSemitone(deg: number) {
  if (deg === 5) return 7;
  if (deg === 9) return 14;
  if (deg === 11) return 17;
  if (deg === 13) return 21;
  return 0;
}

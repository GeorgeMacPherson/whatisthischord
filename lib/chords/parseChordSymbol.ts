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

type Quality = "maj" | "min" | "dim" | "aug" | "sus2" | "sus4";

function norm(input: string) {
  return input
    .trim()
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
    .replace(/\s+/g, "")
    .replace(/Ø/g, "ø"); // normalize capital Ø to ø
}

export function parseChordSymbol(input: string): ParsedChordSymbol {
  const s = norm(input);
  if (!s) {
    return { ok: false, message: "Type a chord symbol (e.g., C7, F#m7b5).", warnings: [] };
  }

  // Root: letter + optional accidental + rest
  const m = s.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) return { ok: false, message: "Couldn’t read the root note.", warnings: [] };

  const letter = m[1].toUpperCase();
  const acc = (m[2] ?? "") as "" | "#" | "b";
  let r = m[3] ?? "";

  const rootKey = `${letter}${acc}`;
  const rootPc = NOTE_TO_PC[rootKey];
  if (rootPc === undefined) {
    return { ok: false, message: `Unknown root note “${rootKey}”.`, warnings: [] };
  }

  const warnings: string[] = [];

  // ---- Quality ----
  let quality: Quality = "maj";
  const hadHalfDimSymbol = r.startsWith("ø");

  // Consume ø if present (we interpret it as half-diminished later)
  if (hadHalfDimSymbol) r = r.slice(1);

  // Make quality parsing case-insensitive
  const rl = r.toLowerCase();

  // Order matters: maj before m
  if (rl.startsWith("maj")) {
    quality = "maj";
    r = r.slice(3);
  } else if (rl.startsWith("min")) {
    quality = "min";
    r = r.slice(3);
  } else if (r.startsWith("m")) {
    quality = "min";
    r = r.slice(1);
  } else if (rl.startsWith("dim")) {
    quality = "dim";
    r = r.slice(3);
  } else if (r.startsWith("o")) {
    quality = "dim";
    r = r.slice(1);
  } else if (rl.startsWith("aug")) {
    quality = "aug";
    r = r.slice(3);
  } else if (r.startsWith("+")) {
    quality = "aug";
    r = r.slice(1);
  } else if (rl.startsWith("sus2")) {
    quality = "sus2";
    r = r.slice(4);
  } else if (rl.startsWith("sus4")) {
    quality = "sus4";
    r = r.slice(4);
  } else if (rl.startsWith("sus")) {
    quality = "sus4";
    r = r.slice(3);
  }

  // ---- Base triad ----
  let intervals = triadIntervals(quality);

  // ---- Half-diminished handling (m7b5 / ø7) ----
  // Accept:
  //  - Cm7b5  (we consumed "m", r starts with "7b5")
  //  - Cmin7b5 (we consumed "min", r starts with "7b5")
  //  - Cø7 (we consumed ø, r starts with "7")
  //  - Cø (treat as half-diminished even without 7)
  const rLower = r.toLowerCase();

  const isHalfDimByToken = quality === "min" && rLower.startsWith("7b5");
  const isHalfDim = hadHalfDimSymbol || isHalfDimByToken;

  if (isHalfDim) {
    // root, m3, b5, b7
    intervals = [0, 3, 6, 10];

    // consume the obvious markers if present
    if (rLower.startsWith("7b5")) r = r.slice(3); // "7b5"
    else if (r.startsWith("7")) r = r.slice(1);

    // swallow redundant "b5" if someone wrote ø7b5
    if (r.toLowerCase().startsWith("b5")) r = r.slice(2);
  }

  // ---- Extension ----
  // maj7 explicit
  if (r.toLowerCase().startsWith("maj7")) {
    intervals = add(intervals, 11);
    r = r.slice(4);
  } else {
    const ext = r.match(/^(6|7|9|11|13)/);
    if (ext) {
      const n = parseInt(ext[1], 10);

      if (n === 6) intervals = add(intervals, 9);
      if (n === 7) intervals = add(intervals, 10);

      // For 9/11/13 assume dominant stack: b7 + 9 + 11 + 13
      if (n === 9) intervals = add(add(intervals, 10), 14);
      if (n === 11) intervals = add(add(add(intervals, 10), 14), 17);
      if (n === 13) intervals = add(add(add(add(intervals, 10), 14), 17), 21);

      r = r.slice(ext[1].length);
    }
  }

  // ---- Alterations ----
  // Optional parentheses wrapper for alterations
  if (r.startsWith("(") && r.endsWith(")")) r = r.slice(1, -1);

  const alts: string[] = [];
  const altRe = /([b#])(5|9|11|13)/gi;
  let altMatch: RegExpExecArray | null;

  while ((altMatch = altRe.exec(r))) {
    const sign = altMatch[1] as "b" | "#";
    const degree = parseInt(altMatch[2], 10);

    const semitone = degreeToSemitone(degree);
    const adjusted = sign === "b" ? semitone - 1 : semitone + 1;

    intervals = replaceOrAdd(intervals, semitone, adjusted);
    alts.push(`${sign}${degree}`);
  }

  // Normalize: unique + sorted
  intervals = Array.from(new Set(intervals)).sort((a, b) => a - b);

  // A more helpful normalizedSymbol (includes extension + alterations)
  const qualityText =
    isHalfDim ? "m7b5" :
    quality === "maj" ? "" :
    quality === "min" ? "m" :
    quality;

  const extText = isHalfDim ? "" : extensionFromIntervals(intervals);
  const altText = alts.length ? `(${uniqPreserve(alts).join("")})` : "";

  return {
    ok: true,
    rootPc,
    intervalsFromRoot: intervals,
    normalizedSymbol: `${letter}${acc}${qualityText}${extText}${altText}`,
    warnings,
  };
}

function triadIntervals(q: Quality): number[] {
  if (q === "maj") return [0, 4, 7];
  if (q === "min") return [0, 3, 7];
  if (q === "dim") return [0, 3, 6];
  if (q === "aug") return [0, 4, 8];
  if (q === "sus2") return [0, 2, 7];
  return [0, 5, 7]; // sus4
}

function add(arr: number[], v: number) {
  return arr.includes(v) ? arr : [...arr, v];
}

function replaceOrAdd(arr: number[], target: number, replacement: number) {
  return arr.includes(target)
    ? arr.map((x) => (x === target ? replacement : x))
    : [...arr, replacement];
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

// Best-effort: infer extension label from intervals
function extensionFromIntervals(intervals: number[]) {
  const has = (n: number) => intervals.includes(n);

  // maj7
  if (has(11)) return "maj7";

  // dominant stack
  if (has(10) && has(21)) return "13";
  if (has(10) && has(17)) return "11";
  if (has(10) && has(14)) return "9";
  if (has(10)) return "7";
  if (has(9)) return "6";

  return "";
}

function uniqPreserve(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    if (!seen.has(it)) {
      seen.add(it);
      out.push(it);
    }
  }
  return out;
}

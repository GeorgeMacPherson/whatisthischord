import { pcToName } from "./noteParsing";

export function normalizePitchClasses(pcs: number[]): number[] {
  const u = Array.from(new Set(pcs.map((n) => ((n % 12) + 12) % 12)));
  u.sort((a, b) => a - b);
  return u;
}

export function notesList(pcs: number[], preferFlats: boolean): string {
  return pcs.map((pc) => pcToName(pc, preferFlats)).join("–");
}

export function chordTonesFromRoot(
  rootPc: number,
  intervalsFromRoot: number[],
  preferFlats: boolean
): string {
  const pcs = intervalsFromRoot.map((i) => (rootPc + i) % 12);
  return pcs.map((pc) => pcToName(pc, preferFlats)).join("–");
}

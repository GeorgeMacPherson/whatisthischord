import {
  ADD_LABELS,
  EXTENSION_LABELS,
  TEMPLATES,
  type Template,
} from "./templates";
import { normalizePitchClasses } from "./format";

export type Candidate = {
  rootPc: number;
  name: string;
  baseTemplateId: string;
  score: number;
  missing: number[];
  extras: number[];
  intervalsFromRoot: number[];
};

function relIntervals(root: number, pcs: number[]): number[] {
  return pcs.map((pc) => (((pc - root) % 12) + 12) % 12);
}

function scoreTemplate(template: Template, relSet: Set<number>) {
  const tmplSet = new Set(template.intervals);
  const missing = template.intervals.filter((i) => !relSet.has(i));
  const extras = Array.from(relSet).filter((i) => !tmplSet.has(i));

  let score = 0;

  for (const i of template.intervals) if (relSet.has(i)) score += 12;

  const important = new Set(template.important ?? []);
  for (const m of missing) score -= important.has(m) ? 18 : 10;

  for (const e of extras) score -= 4;

  if (relSet.has(3) || relSet.has(4)) score += 6;

  return { missing, extras, score };
}

function buildName(rootName: string, template: Template, relSet: Set<number>): string {
  let name = `${rootName}${template.label}`;

  const tmplSet = new Set(template.intervals);
  const has7th = relSet.has(10) || relSet.has(11);

  const decorations: string[] = [];

  // Only consider "extra" tones that are NOT already part of the chosen template
  const extrasOnly = Array.from(relSet).filter((i) => !tmplSet.has(i));

  if (has7th) {
    for (const i of extrasOnly) {
      const lab = EXTENSION_LABELS[i];
      if (!lab) continue;
      decorations.push(lab);
    }
  } else {
    for (const i of extrasOnly) {
      const lab = ADD_LABELS[i];
      if (!lab) continue;
      decorations.push(lab);
    }
  }

  const unique = Array.from(new Set(decorations));
  if (unique.length) name += `(${unique.join(",")})`;

  return name;
}

export function detectChord(
  pcsInput: number[],
  rootNameFn: (pc: number) => string
): Candidate[] {
  const pcs = normalizePitchClasses(pcsInput);
  const roots = [...pcs];
  const candidates: Candidate[] = [];

  for (const root of roots) {
    const rel = relIntervals(root, pcs);
    const relSet = new Set(rel);

    for (const tmpl of TEMPLATES) {
      if (!relSet.has(0)) continue;

      if (tmpl.id === "9" || tmpl.id === "11" || tmpl.id === "13") {
        if (!(relSet.has(10) || relSet.has(11))) continue;
      }

      const { missing, extras, score } = scoreTemplate(tmpl, relSet);

      const maxMissing = tmpl.intervals.length <= 3 ? 1 : 2;
      if (missing.length > maxMissing) continue;

      const name = buildName(rootNameFn(root), tmpl, relSet);

      candidates.push({
        rootPc: root,
        name,
        baseTemplateId: tmpl.id,
        score,
        missing,
        extras,
        intervalsFromRoot: rel.slice().sort((a, b) => a - b),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const unique: Candidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    unique.push(c);
    if (unique.length >= 6) break;
  }

  return unique;
}

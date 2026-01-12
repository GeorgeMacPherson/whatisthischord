"use client";

import { useEffect, useMemo, useState } from "react";
import { detectChord } from "../lib/chords/detectChord";
import {
  parseNotesInput,
  preferFlatsFromInput,
  pcToName,
} from "../lib/chords/noteParsing";
import {
  normalizePitchClasses,
  notesList,
  chordTonesFromRoot,
} from "../lib/chords/format";

type Mode = "notes" | "chord";

function buildShareUrl(params: Record<string, string>) {
  const u = new URL(window.location.href);
  // clear old params we use
  u.searchParams.delete("n");
  u.searchParams.delete("c");
  u.searchParams.delete("mode");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

function parseChordSymbol(input: string): { ok: true; pcs: number[]; message?: string; warnings: string[] } | { ok: false; message: string; warnings: string[] } {
  const raw = input
    .trim()
    .replace(/♭/g, "b")
    .replace(/♯/g, "#");

  if (!raw) return { ok: false, message: "Type a chord symbol (e.g., C7, F#m7b5, Bbmaj7).", warnings: [] };

  // Root: letter + optional #/b
  const m = raw.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) return { ok: false, message: "Could not read the root note.", warnings: [] };

  const root = `${m[1].toUpperCase()}${m[2] ?? ""}`;
  const qual = (m[3] ?? "").trim();

  // Map root to pitch class using your existing parser by feeding it one token.
  const rootParsed = parseNotesInput(root);
  if (!rootParsed.ok) return { ok: false, message: `Unknown root note “${root}”.`, warnings: [] };
  const rootPc = rootParsed.notes[0];

  const warnings: string[] = [];

  // Very small “good enough” quality parser.
  // Triad defaults to major.
  let intervals: number[] = [0, 4, 7];

  const q = qual
    .replace(/\s+/g, "")
    .replace(/^maj/i, "maj")
    .replace(/^min/i, "m");

  const isMinor = /^m(?!aj)/i.test(q); // m, m7, m6...
  const isDim = /^dim/i.test(q) || /o/.test(q);
  const isAug = /^aug/i.test(q) || /\+/.test(q);
  const isSus2 = /^sus2/i.test(q);
  const isSus4 = /^sus4/i.test(q) || /^sus/i.test(q);

  if (isSus2) intervals = [0, 2, 7];
  else if (isSus4) intervals = [0, 5, 7];
  else if (isDim) intervals = [0, 3, 6];
  else if (isAug) intervals = [0, 4, 8];
  else if (isMinor) intervals = [0, 3, 7];
  else intervals = [0, 4, 7];

  // Sevenths / extensions (minimal set)
  const hasMaj7 = /maj7/i.test(q) || /M7/.test(q);
  const has7 = /7/.test(q);

  if (hasMaj7) intervals = [...intervals, 11];
  else if (has7) intervals = [...intervals, 10];

  // Half-diminished m7b5 / ø7
  if (/m7b5/i.test(q) || /ø/.test(q)) {
    intervals = [0, 3, 6, 10];
  }

  // Add b5 / #5 tweaks (very minimal)
  if (/b5/.test(q)) intervals = intervals.map((x) => (x === 7 ? 6 : x));
  if (/#5/.test(q)) intervals = intervals.map((x) => (x === 7 ? 8 : x));

  const pcs = Array.from(new Set(intervals.map((i) => (rootPc + i) % 12)));

  if (pcs.length < 2) {
    return { ok: false, message: "That chord symbol didn’t produce enough notes.", warnings };
  }

  return { ok: true, pcs, warnings };
}

export default function ChordApp() {
  const [mode, setMode] = useState<Mode>("notes");

  const [notesInput, setNotesInput] = useState("C E G Bb");
  const [chordInput, setChordInput] = useState("C7");

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") as Mode | null;
    const n = params.get("n");
    const c = params.get("c");

    if (m === "notes" || m === "chord") setMode(m);
    if (n) setNotesInput(n.replace(/,/g, " "));
    if (c) setChordInput(c);
  }, []);

  const preferFlatsNotes = useMemo(() => preferFlatsFromInput(notesInput), [notesInput]);
  const parsedNotes = useMemo(() => parseNotesInput(notesInput), [notesInput]);

  const candidates = useMemo(() => {
    if (!parsedNotes.ok) return [];
    return detectChord(parsedNotes.notes, (pc) => pcToName(pc, preferFlatsNotes));
  }, [parsedNotes, preferFlatsNotes]);

  const best = candidates[0];

  const normalizedNotes = useMemo(() => {
    if (!parsedNotes.ok) return null;
    const pcs = normalizePitchClasses(parsedNotes.notes);
    return notesList(pcs, preferFlatsNotes);
  }, [parsedNotes, preferFlatsNotes]);

  const chordTonesNotesMode = useMemo(() => {
    if (!parsedNotes.ok || !best) return null;
    return chordTonesFromRoot(best.rootPc, best.intervalsFromRoot, preferFlatsNotes);
  }, [parsedNotes, best, preferFlatsNotes]);

  const preferFlatsChord = useMemo(() => preferFlatsFromInput(chordInput), [chordInput]);
  const parsedChord = useMemo(() => parseChordSymbol(chordInput), [chordInput]);

  const chordNotesFromSymbol = useMemo(() => {
    if (!parsedChord.ok) return null;
    const pcs = normalizePitchClasses(parsedChord.pcs);
    return notesList(pcs, preferFlatsChord);
  }, [parsedChord, preferFlatsChord]);

  async function copyText(label: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // ignore
    }
  }

  async function onShare() {
    const url =
      mode === "notes" && parsedNotes.ok
        ? buildShareUrl({ mode: "notes", n: parsedNotes.normalizedInput })
        : mode === "chord" && parsedChord.ok
        ? buildShareUrl({ mode: "chord", c: chordInput.trim() })
        : "";

    if (!url) return;

    await copyText("Link", url);

    const u = new URL(window.location.href);
    u.searchParams.delete("n");
    u.searchParams.delete("c");
    u.searchParams.set("mode", mode);

    if (mode === "notes" && parsedNotes.ok) u.searchParams.set("n", parsedNotes.normalizedInput);
    if (mode === "chord" && parsedChord.ok) u.searchParams.set("c", chordInput.trim());

    window.history.replaceState({}, "", u.toString());
  }

  const copyMainText =
    mode === "notes" ? (best?.name ?? "") : (chordNotesFromSymbol ?? "");

  return (
    <div className="container">
      <header>
        <h1>What Chord Is This?</h1>
        <div className="subtitle">
          Switch between entering <span className="mono">notes</span> or a{" "}
          <span className="mono">chord symbol</span>.
        </div>
      </header>

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="btn" onClick={() => setMode("notes")} disabled={mode === "notes"}>
            Notes → Chord
          </button>
          <button className="btn" onClick={() => setMode("chord")} disabled={mode === "chord"}>
            Chord → Notes
          </button>
        </div>

        <div className="label">{mode === "notes" ? "Notes" : "Chord symbol"}</div>

        {mode === "notes" ? (
          <input
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="C E G Bb"
            className="input"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        ) : (
          <input
            value={chordInput}
            onChange={(e) => setChordInput(e.target.value)}
            placeholder="C7, F#m7b5, Bbmaj7"
            className="input"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        )}

        <div className="row">
          <button
            className="btn"
            onClick={() => copyText(mode === "notes" ? "Chord" : "Notes", copyMainText)}
            disabled={!copyMainText}
          >
            Copy {mode === "notes" ? "chord" : "notes"}
          </button>

          <button
            className="btn"
            onClick={onShare}
            disabled={mode === "notes" ? !parsedNotes.ok : !parsedChord.ok}
          >
            Copy share link
          </button>

          {copied && <span className="pill">Copied {copied} ✅</span>}
        </div>

        <div style={{ marginTop: 18 }}>
          {mode === "notes" ? (
            !parsedNotes.ok ? (
              <div className="panel">
                <div className="label">Hmm.</div>
                <div style={{ marginTop: 6 }}>
                  {"message" in parsedNotes ? parsedNotes.message : "Invalid input"}
                </div>
                {("warnings" in parsedNotes && parsedNotes.warnings.length > 0) && (
                  <div className="small" style={{ marginTop: 8 }}>
                    {parsedNotes.warnings.join(" · ")}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="label">Normalized notes</div>
                <div style={{ marginTop: 6 }} className="mono">
                  {normalizedNotes}
                </div>

                {best && chordTonesNotesMode && (
                  <>
                    <div className="label" style={{ marginTop: 14 }}>
                      Chord tones (from root)
                    </div>
                    <div style={{ marginTop: 6 }} className="mono">
                      {chordTonesNotesMode}
                    </div>
                  </>
                )}

                {parsedNotes.warnings.length > 0 && (
                  <div className="small" style={{ marginTop: 8 }}>
                    {parsedNotes.warnings.join(" · ")}
                  </div>
                )}

                <div className="panel" style={{ marginTop: 16 }}>
                  <div className="label">Best match</div>
                  <div className="big">{best ? best.name : "No confident match"}</div>
                </div>

                {candidates.length > 1 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="label">Also could be</div>
                    <div className="list">
                      {candidates.slice(1).map((c) => (
                        <div key={c.name} className="item">
                          <div className="itemTitle">{c.name}</div>
                          <div className="small">
                            Score: {c.score} · Intervals:{" "}
                            <span className="mono">{c.intervalsFromRoot.join(", ")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          ) : !parsedChord.ok ? (
            <div className="panel">
              <div className="label">Hmm.</div>
              <div style={{ marginTop: 6 }}>{parsedChord.message}</div>
              {parsedChord.warnings.length > 0 && (
                <div className="small" style={{ marginTop: 8 }}>
                  {parsedChord.warnings.join(" · ")}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="label">Chord tones</div>
              <div style={{ marginTop: 6 }} className="mono">
                {chordNotesFromSymbol}
              </div>
              {parsedChord.warnings.length > 0 && (
                <div className="small" style={{ marginTop: 8 }}>
                  {parsedChord.warnings.join(" · ")}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <footer>
        Tip: try <span className="mono">C7</span>, <span className="mono">F#m7b5</span>,{" "}
        <span className="mono">Bbmaj7</span>, or notes like <span className="mono">C E G Bb</span>.
      </footer>
    </div>
  );
}

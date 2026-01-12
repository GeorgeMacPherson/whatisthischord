"use client";

import { useEffect, useMemo, useState } from "react";
import { detectChord } from "../lib/chords/detectChord";
import { parseNotesInput, preferFlatsFromInput, pcToName } from "../lib/chords/noteParsing";
import { normalizePitchClasses, notesList, chordTonesFromRoot } from "../lib/chords/format";
import { parseChordSymbol } from "../lib/chords/parseChordSymbol";

type Mode = "notes" | "chord";

function buildShareUrl(params: Record<string, string>) {
  const u = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

export default function ChordApp() {
  const [mode, setMode] = useState<Mode>("notes");

  const [notesInput, setNotesInput] = useState("C E G Bb");
  const [chordInput, setChordInput] = useState("C7");
  const [copied, setCopied] = useState<string | null>(null);

  // Read from URL on load: ?mode=notes&n=... OR ?mode=chord&c=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode");
    const n = params.get("n");
    const c = params.get("c");

    if (m === "chord") setMode("chord");
    if (m === "notes") setMode("notes");

    if (n) setNotesInput(n.replace(/,/g, " "));
    if (c) setChordInput(c);
  }, []);

  const activeInput = mode === "notes" ? notesInput : chordInput;
  const preferFlats = useMemo(() => preferFlatsFromInput(activeInput), [activeInput]);

  // NOTES → CHORD
  const parsedNotes = useMemo(() => parseNotesInput(notesInput), [notesInput]);

  const candidates = useMemo(() => {
    if (mode !== "notes") return [];
    if (!parsedNotes.ok) return [];
    return detectChord(parsedNotes.notes, (pc) => pcToName(pc, preferFlats));
  }, [mode, parsedNotes, preferFlats]);

  const best = candidates[0];

  const normalizedNotes = useMemo(() => {
    if (mode !== "notes") return null;
    if (!parsedNotes.ok) return null;
    const pcs = normalizePitchClasses(parsedNotes.notes);
    return notesList(pcs, preferFlats);
  }, [mode, parsedNotes, preferFlats]);

  const chordTonesNotesMode = useMemo(() => {
    if (mode !== "notes") return null;
    if (!parsedNotes.ok || !best) return null;
    return chordTonesFromRoot(best.rootPc, best.intervalsFromRoot, preferFlats);
  }, [mode, parsedNotes, best, preferFlats]);

  // CHORD → NOTES
  const parsedChord = useMemo(() => parseChordSymbol(chordInput), [chordInput]);

  const chordTonesChordMode = useMemo(() => {
    if (mode !== "chord") return null;
    if (!parsedChord.ok) return null;

    // Convert chord tones to note names
    const pcs = parsedChord.intervalsFromRoot.map((i) => (parsedChord.rootPc + i) % 12);
    const unique = Array.from(new Set(pcs));
    return notesList(unique, preferFlats);
  }, [mode, parsedChord, preferFlats]);

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
    const params: Record<string, string> = { mode };

    if (mode === "notes") {
      if (!parsedNotes.ok) return;
      params.n = parsedNotes.normalizedInput;
    } else {
      if (!parsedChord.ok) return;
      params.c = chordInput.trim();
    }

    const url = buildShareUrl(params);
    await copyText("Link", url);

    const u = new URL(window.location.href);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    window.history.replaceState({}, "", u.toString());
  }

  return (
    <div className="container">
      <header>
        <h1>What Chord Is This?</h1>
        <div className="subtitle">
          Switch between entering <span className="mono">notes</span> or a <span className="mono">chord symbol</span>.
        </div>
      </header>

      <div className="card">
        {/* Toggle */}
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="pill" style={{ padding: 0, overflow: "hidden" }}>
            <button
              className="btn"
              style={{ borderRadius: 9999 }}
              onClick={() => setMode("notes")}
              aria-pressed={mode === "notes"}
            >
              Notes → Chord
            </button>
            <button
              className="btn"
              style={{ borderRadius: 9999 }}
              onClick={() => setMode("chord")}
              aria-pressed={mode === "chord"}
            >
              Chord → Notes
            </button>
          </div>
        </div>

        {/* Input */}
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
            onClick={() => copyText(mode === "notes" ? "Chord" : "Notes", mode === "notes" ? best?.name ?? "" : chordTonesChordMode ?? "")}
            disabled={mode === "notes" ? !best : !chordTonesChordMode}
          >
            Copy {mode === "notes" ? "chord" : "notes"}
          </button>

          <button className="btn" onClick={onShare} disabled={mode === "notes" ? !parsedNotes.ok : !parsedChord.ok}>
            Copy share link
          </button>

          {copied && <span className="pill">Copied {copied} ✅</span>}
        </div>

        {/* Output */}
        <div style={{ marginTop: 18 }}>
          {mode === "notes" ? (
            !parsedNotes.ok ? (
              <div className="panel">
                <div className="label">Hmm.</div>
                <div style={{ marginTop: 6 }}>{parsedNotes.message}</div>
                {parsedNotes.warnings.length > 0 && (
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
                            Score: {c.score} · Intervals: <span className="mono">{c.intervalsFromRoot.join(", ")}</span>
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
                {chordTonesChordMode}
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
        Tip: try <span className="mono">C7</span>, <span className="mono">F#m7b5</span>, <span className="mono">Bbmaj7</span>, or notes like{" "}
        <span className="mono">C E G Bb</span>.
      </footer>
    </div>
  );
}

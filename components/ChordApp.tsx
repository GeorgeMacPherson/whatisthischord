"use client";
import { parseChordSymbol } from "../lib/chords/parseChordSymbol";
import { useEffect, useMemo, useState } from "react";
import { detectChord } from "../lib/chords/detectChord";
import Script from "next/script";
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

  // Build pitch-classes from root + intervals
  const pcs = parsedChord.intervalsFromRoot.map((i) => (parsedChord.rootPc + i) % 12);
  const normPcs = normalizePitchClasses(pcs);

  return notesList(normPcs, preferFlatsChord);
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
    <header className="header">
      <div>
        <h1>What Chord Is This?</h1>
        <div className="subtitle">
          Switch between entering <span className="mono">notes</span> or a{" "}
          <span className="mono">chord symbol</span>.
        </div>
      </div>
      <div className="bmc">
  <span className="bmc-text">Found this useful?</span>
  <a
    href="https://www.buymeacoffee.com/Georgemacpherson"
    target="_blank"
    rel="noreferrer"
    className="bmc-btn"
  >
    ☕ Buy me a coffee
  </a>
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
              <div style={{ marginTop: 6 }}>
  {"message" in parsedChord ? parsedChord.message : ""}
</div>
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

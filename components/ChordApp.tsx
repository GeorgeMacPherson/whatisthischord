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

function buildShareUrl(notesCsv: string) {
  const u = new URL(window.location.href);
  u.searchParams.set("n", notesCsv);
  return u.toString();
}

export default function ChordApp() {
  const [input, setInput] = useState("C E G Bb");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("n");
    if (n) setInput(n.replace(/,/g, " "));
  }, []);

  const preferFlats = useMemo(() => preferFlatsFromInput(input), [input]);
  const parsed = useMemo(() => parseNotesInput(input), [input]);

  const candidates = useMemo(() => {
    if (!parsed.ok) return [];
    return detectChord(parsed.notes, (pc) => pcToName(pc, preferFlats));
  }, [parsed, preferFlats]);

  const best = candidates[0];

  const normalizedNotes = useMemo(() => {
    if (!parsed.ok) return null;
    const pcs = normalizePitchClasses(parsed.notes);
    return notesList(pcs, preferFlats);
  }, [parsed, preferFlats]);

  const chordTones = useMemo(() => {
    if (!parsed.ok || !best) return null;
    return chordTonesFromRoot(best.rootPc, best.intervalsFromRoot, preferFlats);
  }, [parsed, best, preferFlats]);

  async function copyText(label: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // Clipboard can be finicky in some embedded previews; ignore quietly.
    }
  }

  async function onShare() {
    if (!parsed.ok) return;

    const url = buildShareUrl(parsed.normalizedInput);
    await copyText("Link", url);

    // Update URL without reload
    const u = new URL(window.location.href);
    u.searchParams.set("n", parsed.normalizedInput);
    window.history.replaceState({}, "", u.toString());
  }

  return (
    <div className="container">
      <header>
        <h1>What Chord Is This?</h1>
        <div className="subtitle">
          Type notes. Get a chord name. Try:{" "}
          <span className="mono">C E G B-flat</span> or{" "}
          <span className="mono">C E G Bb</span>
        </div>
      </header>

      <div className="card">
        <div className="label">Notes</div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="C E G Bb"
          className="input"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <div className="row">
          <button
            className="btn"
            onClick={() => copyText("Chord", best?.name ?? "")}
            disabled={!best}
          >
            Copy chord
          </button>

          <button className="btn" onClick={onShare} disabled={!parsed.ok}>
            Copy share link
          </button>

          {copied && <span className="pill">Copied {copied} ✅</span>}
        </div>

        <div style={{ marginTop: 18 }}>
          {!parsed.ok ? (
            <div className="panel">
              <div className="label">Hmm.</div>
              <div style={{ marginTop: 6 }}>
                {"message" in parsed ? parsed.message : "Invalid input"}
              </div>
            </div>
          ) : (
            <>
              <div className="label">Normalized notes</div>
              <div style={{ marginTop: 6 }} className="mono">
                {normalizedNotes}
              </div>

              {best && chordTones && (
                <>
                  <div className="label" style={{ marginTop: 14 }}>
                    Chord tones (from root)
                  </div>
                  <div style={{ marginTop: 6 }} className="mono">
                    {chordTones}
                  </div>
                </>
              )}

              {parsed.warnings.length > 0 && (
                <div className="small">{parsed.warnings.join(" · ")}</div>
              )}

              <div className="panel" style={{ marginTop: 16 }}>
                <div className="label">Best match</div>
                <div className="big">
                  {best ? best.name : "No confident match"}
                </div>

                {best && (
                  <div className="small">
                    Intervals from root:{" "}
                    <span className="mono">
                      {best.intervalsFromRoot.join(", ")}
                    </span>
                    {best.missing.length > 0 && (
                      <>
                        {" "}
                        · Missing:{" "}
                        <span className="mono">{best.missing.join(", ")}</span>
                      </>
                    )}
                    {best.extras.length > 0 && (
                      <>
                        {" "}
                        · Extra:{" "}
                        <span className="mono">{best.extras.join(", ")}</span>
                      </>
                    )}
                  </div>
                )}
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
                          <span className="mono">
                            {c.intervalsFromRoot.join(", ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <footer>
        Tip: sharps/flats like <span className="mono">F#</span> or{" "}
        <span className="mono">Bb</span>. Octaves are allowed (e.g.,{" "}
        <span className="mono">C4</span>).
      </footer>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { concerns } from "@/lib/fixtures";
import { concernLabel, mentionsCrisis } from "@/lib/concerns";
import { useFlow } from "@/components/flow";
import { Arrow, Back, ErrorText, Header, Loading, Seg } from "@/components/ui";

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib).
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;

function speechCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

function Mic() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function ConcernsPage() {
  const { view, act } = useFlow("/concerns");
  const router = useRouter();
  const saved = view?.session?.concerns;
  const [text, setText] = useState("");
  const [aiIds, setAiIds] = useState<string[]>([]);
  const [source, setSource] = useState<"ai" | "keywords" | "picked">("picked");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, "yes" | "no">>({});
  const [showAll, setShowAll] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const entered = useRef(false);
  const restored = useRef(false);
  const recRef = useRef<Recognition | null>(null);

  const canSpeak = useSyncExternalStore(noop, () => !!speechCtor(), () => false);

  // Log whether records had arrived when the patient reached this screen (once).
  useEffect(() => {
    if (view && !entered.current) {
      entered.current = true;
      void act("enter_concerns");
    }
  }, [view, act]);

  // Coming back to this screen: restore what they entered.
  useEffect(() => {
    if (saved && !restored.current) {
      restored.current = true;
      setText(saved.text);
      setPicked(new Set(saved.ids));
      setAnswers(saved.recordAnswers);
    }
  }, [saved]);

  // Ask the AI layer to turn their words into concern chips (debounced).
  useEffect(() => {
    if (text.trim().length < 8) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setThinking(true);
      try {
        const res = await fetch("/api/concerns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: ctrl.signal,
        });
        const r = (await res.json()) as { ids?: string[]; source?: "ai" | "keywords" };
        if (r.ids) {
          setAiIds(r.ids);
          setSource(r.source ?? "keywords");
        }
      } catch {
        /* aborted or offline: chips stay as they are */
      } finally {
        if (!ctrl.signal.aborted) setThinking(false);
      }
    }, 800);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [text]);

  const liveAiIds = useMemo(() => (text.trim().length < 8 ? [] : aiIds), [text, aiIds]);
  const selected = useMemo(() => {
    const s = new Set(liveAiIds.filter((id) => !removed.has(id)));
    picked.forEach((id) => s.add(id));
    return [...s];
  }, [liveAiIds, removed, picked]);

  if (!view?.lookups) return (<><Header path="/concerns" /><Loading /></>);
  const records = view.lookups.records;
  const conditions = records.status === "ready" ? records.data?.conditions ?? [] : [];
  const recordsReady = records.status === "ready";

  function toggle(id: string) {
    if (selected.includes(id)) {
      setPicked((p) => { const n = new Set(p); n.delete(id); return n; });
      setRemoved((r) => new Set(r).add(id));
    } else {
      setPicked((p) => new Set(p).add(id));
      setRemoved((r) => { const n = new Set(r); n.delete(id); return n; });
    }
  }

  function speak() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setText((t) => (t ? `${t} ${said}` : said).slice(0, 600));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  const missingAnswers = conditions.some((c) => !answers[c.code]);
  const canContinue = (selected.length > 0 || text.trim().length > 0) && !missingAnswers;
  const chipSource = liveAiIds.length && source === "ai" ? "AI summary" : liveAiIds.length ? "From your words" : null;
  const unselected = concerns.filter((c) => !selected.includes(c.id));

  async function submit() {
    setBusy(true);
    const ids = selected;
    const r = await act("submit_concerns", {
      text,
      ids,
      source: liveAiIds.length && ids.some((id) => liveAiIds.includes(id)) ? source : "picked",
      recordAnswers: answers,
    });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Something went wrong.");
    router.push("/snapshot");
  }

  return (
    <>
      <Header path="/concerns" />
      <main className="page w-640">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="eb">What&apos;s going on</span>
          <h1 className="h1">In your own words, what brings you in?</h1>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="lbl">Type or speak. A sentence is enough.</span>
          <textarea className="in" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} placeholder="For example: trouble sleeping and feeling on edge at work for a few months." />
        </label>
        {canSpeak && (
          <button type="button" className={`chip${listening ? " on" : ""}`} style={{ alignSelf: "flex-start", marginTop: -12 }} onClick={speak} aria-pressed={listening}>
            <Mic />
            {listening ? "Listening… tap to stop" : "Speak instead"}
          </button>
        )}

        {mentionsCrisis(text) && (
          <div className="card" role="alert" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>If you&apos;re thinking about harming yourself, please reach out now.</span>
            <span style={{ fontSize: 15 }}>
              Call or text <a href="tel:988">988</a>, or call <a href="tel:911">911</a> if you&apos;re in danger. <button type="button" className="link" style={{ fontSize: 15 }} onClick={() => void act("safety", { answer: "yes" }).then(() => router.push("/crisis"))}>Get support now</button>
            </span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="concern-chips">
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{selected.length || thinking ? "We heard" : recordsReady ? "What fits" : "Or pick what fits"}</span>
            {chipSource && <span className="src">{chipSource}</span>}
            {thinking && <span className="lbl">Listening to your words…</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selected.map((id) => (
              <button key={id} type="button" className="chip on" aria-pressed="true" onClick={() => toggle(id)}>
                {concernLabel(id)}
              </button>
            ))}
            {(showAll || !recordsReady) &&
              unselected.map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed="false" onClick={() => toggle(c.id)}>
                  {c.label}
                </button>
              ))}
            {recordsReady && !showAll && (
              <button type="button" className="chip" onClick={() => setShowAll(true)}>
                + Add
              </button>
            )}
          </div>
        </div>

        {conditions.length > 0 && (
          <div className="card" data-testid="records-card">
            <span className="lbl">From your past records</span>
            {conditions.map((c) => (
              <div className="row" key={c.code}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>
                  {c.display}, diagnosed {c.recordedYear}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="lbl">Still relevant?</span>
                  <Seg
                    label={`${c.display} still relevant?`}
                    value={answers[c.code]}
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                    onChange={(v) => setAnswers({ ...answers, [c.code]: v })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <ErrorText error={error} />
        <div className="actions">
          <button className="btn" type="button" disabled={busy || !canContinue} onClick={submit}>
            Continue <Arrow />
          </button>
          <Back href="/safety" />
        </div>
      </main>
    </>
  );
}

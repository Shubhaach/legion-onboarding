"use client";
import { useEffect, useRef } from "react";
import type { Agreement } from "@/lib/fixtures";

/** Full text of one agreement. It counts as read only when its end scrolls into view. */
export function AgreementPanel({ agreement, read, onRead, onClose }: { agreement: Agreement; read: boolean; onRead: () => void; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const placeholder = agreement.id === "agreement-3";

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (read || !endRef.current || !scrollRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          onRead();
        }
      },
      { root: scrollRef.current, threshold: 1 },
    );
    io.observe(endRef.current);
    return () => io.disconnect();
  }, [read, onRead]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(11,11,12,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agreement-title"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, width: 640, maxWidth: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div className="row" style={{ padding: "18px 22px", borderBottom: "1px solid var(--line-soft)", flexWrap: "nowrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h2 id="agreement-title" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{agreement.title}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {placeholder && <span className="placeholder-badge">Placeholder title · confirm with Legion</span>}
              <span className="placeholder-badge" style={{ background: "var(--chip)", color: "var(--ink-2)" }}>Prototype text, not a real agreement</span>
            </div>
          </div>
          <button ref={closeRef} type="button" className="btn2" onClick={onClose}>Close</button>
        </div>
        <div ref={scrollRef} data-testid="agreement-scroll" tabIndex={0} style={{ overflowY: "auto", padding: "18px 22px 26px", display: "flex", flexDirection: "column", gap: 18, maxHeight: "min(52vh, 460px)" }}>
          {agreement.sections.map((s, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{s.heading}</h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#3a3a40" }}>{s.body}</p>
            </div>
          ))}
          <div ref={endRef} data-testid="agreement-end" className={read ? "read" : "lbl"} style={{ paddingTop: 8 }}>
            {read ? "✓ Marked as read" : "End of document"}
          </div>
        </div>
      </div>
    </div>
  );
}

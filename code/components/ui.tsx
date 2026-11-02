"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { progressFor } from "@/lib/flow";
import { useFlowCtx } from "./flow";

export function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Tick({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header({ path }: { path: string }) {
  const n = progressFor(path);
  const { view, act } = useFlowCtx();
  const router = useRouter();
  const signedIn = !!view?.session;
  return (
    <header
      style={{ display: "flex", alignItems: "center", gap: "12px 24px", flexWrap: "wrap", padding: "18px clamp(16px, 4vw, 40px)", borderBottom: "1px solid #EEEEF0" }}
    >
      <span className="brand" style={{ flex: "1 1 140px" }}>
        Legion Health
      </span>
      {n !== null && (
        <div style={{ flex: "0 1 360px", display: "flex", alignItems: "center", gap: 12, minWidth: 180 }} aria-label={`Step ${n} of 7`} role="group">
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }} aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} style={{ height: 4, borderRadius: 2, background: i < n ? "var(--accent)" : "var(--line)" }} />
            ))}
          </div>
          <span className="lbl" style={{ whiteSpace: "nowrap" }}>
            {n} of 7
          </span>
        </div>
      )}
      <div style={{ flex: "1 1 140px", display: "flex", justifyContent: "flex-end" }}>
        {signedIn && path !== "/start" ? (
          <button
            type="button"
            className="link lbl"
            style={{ color: "var(--ink-2)", fontWeight: 400, fontSize: 13 }}
            onClick={async () => {
              await act("sign_out");
              router.push("/start");
            }}
          >
            Sign out
          </button>
        ) : (
          <a href="tel:988" className="lbl" style={{ textDecoration: "none" }}>
            Need help?
          </a>
        )}
      </div>
    </header>
  );
}

export function Back({ href }: { href: string }) {
  return (
    <Link href={href} className="back">
      ← Back
    </Link>
  );
}

export function Eyebrow({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return <span className={`eb${ok ? " ok" : ""}`}>{children}</span>;
}

export function Loading({ width = "w-640" }: { width?: string }) {
  return (
    <main className={`page ${width}`} aria-busy="true">
      <div className="skeleton" style={{ width: 120 }} />
      <div className="skeleton" style={{ width: "70%", height: 40 }} />
      <div className="skeleton" style={{ width: "50%" }} />
    </main>
  );
}

export function ErrorText({ error }: { error?: string | null }) {
  return error ? (
    <p className="err" role="alert">
      {error}
    </p>
  ) : null;
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

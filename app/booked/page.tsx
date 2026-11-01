"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { providerById, visitInfo } from "@/lib/fixtures";
import { slotLong } from "@/lib/time";
import { useFlow } from "@/components/flow";
import { Header, Loading, Tick } from "@/components/ui";

function CameraCheck() {
  const [state, setState] = useState<"idle" | "on" | "error">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);
  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setState("on");
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setState("error");
    }
  }
  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {state === "on" ? (
        <>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: 280, maxWidth: "100%", borderRadius: 12, background: "#111", aspectRatio: "4/3", objectFit: "cover" }} />
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <span className="ok"><Tick />Camera and mic are working</span>
            <button type="button" className="link" onClick={stop}>Stop test</button>
          </div>
        </>
      ) : (
        <button className="btn" type="button" onClick={start} style={{ alignSelf: "flex-start" }}>Test camera and mic</button>
      )}
      {state === "error" && <span className="err" role="alert">We couldn&apos;t reach your camera or mic. Check your browser&apos;s permissions and try again.</span>}
    </div>
  );
}

export default function BookedPage() {
  const { view } = useFlow("/booked");
  if (!view?.session?.slot) return (<><Header path="/booked" /><Loading width="w-760" /></>);
  const { slot } = view.session;
  const p = providerById(slot!.providerId)!;
  return (
    <>
      <Header path="/booked" />
      <main className="page w-760" style={{ gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="eb ok" style={{ display: "flex", alignItems: "center", gap: 8 }}><Tick />You&apos;re booked</span>
          <h1 className="h1">See you {slotLong(slot!.at)}</h1>
          <p className="sub">We&apos;ll text you before your visit. Joining takes one tap.</p>
        </div>
        <div className="card">
          <div className="row">
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div className="av round">{p.initials}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}, {p.credential}</div>
                <div className="lbl">{visitInfo.minutes}-min video visit · Central time</div>
              </div>
            </div>
            <a className="btn2" href="/api/ics" download="legion-visit.ics">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Add to calendar
            </a>
          </div>
        </div>
        <div className="card">
          <span style={{ fontSize: 16, fontWeight: 600 }}>What happens next</span>
          <div className="step"><span className="dot">1</span><div><div style={{ fontSize: 15, fontWeight: 500 }}>Text reminder the day before</div><div className="lbl">Reply R to reschedule</div></div></div>
          <div className="step"><span className="dot">2</span><div><div style={{ fontSize: 15, fontWeight: 500 }}>Text with your join link an hour before</div><div className="lbl">No app or download needed</div></div></div>
          <div className="step"><span className="dot">3</span><div><div style={{ fontSize: 15, fontWeight: 500 }}>Join your visit</div><div className="lbl">Opens 10 minutes before the start</div></div></div>
        </div>
        <div className="actions" style={{ alignItems: "flex-start" }}>
          <CameraCheck />
          <Link href="/visit" className="link" style={{ marginTop: 16 }}>Go to your visit room →</Link>
        </div>
      </main>
    </>
  );
}

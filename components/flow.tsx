"use client";
// Client state: one view fetched from /api/session, refreshed by actions and by polling
// while lookups are still arriving (or the demo panel is open).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { State } from "@/lib/state";
import { isAllowed } from "@/lib/flow";

export type View = ReturnType<State["view"]>;

interface FlowCtx {
  view: View | null;
  refresh: () => Promise<View | null>;
  act: (type: string, payload?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; view?: View }>;
  setDemoOpen: (open: boolean) => void;
}

const Ctx = createContext<FlowCtx | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/session", { cache: "no-store" });
      const v = (await res.json()) as View;
      setView(v);
      return v;
    } catch {
      return null;
    }
  }, []);

  const act = useCallback(async (type: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...payload }),
    });
    const body = (await res.json()) as View & { ok?: boolean; error?: string };
    if (type === "sign_out") {
      setView(null);
      await refresh();
      return { ok: true };
    }
    if ("session" in body) setView(body);
    return { ok: res.ok && !!body.ok, error: body.error, view: body };
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  const pending = !!view?.lookups && Object.values(view.lookups).some((l) => l.status === "pending");
  useEffect(() => {
    if (!pending && !demoOpen) return;
    const id = setInterval(() => void refresh(), 1000);
    return () => clearInterval(id);
  }, [pending, demoOpen, refresh]);

  return <Ctx.Provider value={{ view, refresh, act, setDemoOpen }}>{children}</Ctx.Provider>;
}

export function useFlowCtx(): FlowCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("FlowProvider missing");
  return c;
}

/** For a screen: returns the view once the patient is allowed here, redirecting otherwise. */
export function useFlow(path: string) {
  const ctx = useFlowCtx();
  const router = useRouter();
  const redirected = useRef(false);
  const { view } = ctx;
  const allowed = !!view && isAllowed(path, view.session);
  useEffect(() => {
    if (view && !allowed && !redirected.current) {
      redirected.current = true;
      router.replace(view.nextPath);
    }
  }, [view, allowed, router]);
  return { ...ctx, view: allowed ? view : null };
}

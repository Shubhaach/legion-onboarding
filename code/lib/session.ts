// Session state lives in two signed cookies (no server memory), so it survives
// Vercel routing requests to different function instances. See ../docs/decisions.md.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { Address } from "./fixtures";

export const SESSION_COOKIE = "lh_session";
export const EVENTS_COOKIE = "lh_events";

export type InsuranceMode = "pulled" | "pending" | "manual" | "card_photo" | "self_pay";

export interface Session {
  v: 1;
  sid: string;
  phone: string;
  dob: string; // YYYY-MM-DD
  consent: boolean;
  scenarioId: string;
  startedAt: number;
  codeVerified: boolean;
  identity?: {
    mode: "pulled" | "edited" | "manual";
    firstName: string;
    lastName: string;
    address: Address;
  };
  insurance?: { mode: InsuranceMode; payer?: string; memberId?: string };
  screenOut?: "state" | "safety";
  safety?: "yes" | "no";
  concerns?: {
    text: string;
    ids: string[];
    source: "ai" | "keywords" | "picked";
    recordAnswers: Record<string, "yes" | "no">;
  };
  snapshot?: {
    meds: { name: string; strength: string; taking: boolean; controlled: boolean; schedule?: string; cls?: string }[];
    added: string[];
    hospital: "none" | "had_one";
    hospitalNote?: string;
    pharmacy: string;
  };
  slot?: { providerId: string; at: number };
  agreementsRead: string[];
  payment?: { last4: string; amount: number };
  signature?: string;
  bookedAt?: number;
  fastForward?: boolean;
  visitJoinedAt?: number;
  visitCompletedAt?: number;
  followUpAt?: number;
  /** Keys of one-time events already logged (e.g. "identity_result"). */
  once: string[];
}

/** [event name, ms since session start, detail] */
export type EventEntry = [string, number, string?];

const secret = () => process.env.SESSION_SECRET || "dev-only-secret-change-me";

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function encode(obj: unknown): string {
  const body = Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function readSession(req: NextRequest): { session: Session | null; events: EventEntry[] } {
  const session = decode<Session>(req.cookies.get(SESSION_COOKIE)?.value);
  const events = (session && decode<{ sid: string; e: EventEntry[] }>(req.cookies.get(EVENTS_COOKIE)?.value)) || null;
  return { session, events: events && session && events.sid === session.sid ? events.e : [] };
}

const MAX_EVENTS = 60;

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export function writeSession(res: NextResponse, session: Session, events: EventEntry[]) {
  res.cookies.set(SESSION_COOKIE, encode(session), cookieOpts);
  res.cookies.set(EVENTS_COOKIE, encode({ sid: session.sid, e: events.slice(-MAX_EVENTS) }), cookieOpts);
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOpts, maxAge: 0 });
  res.cookies.set(EVENTS_COOKIE, "", { ...cookieOpts, maxAge: 0 });
}

export function newSession(input: { phone: string; dob: string; consent: boolean; scenarioId: string }): Session {
  return {
    v: 1,
    sid: randomUUID(),
    ...input,
    startedAt: Date.now(),
    codeVerified: false,
    agreementsRead: [],
    once: [],
  };
}

/** Stable, non-reversible key for one person (phone + date of birth), used by the funnel. */
export function personKey(s: Pick<Session, "phone" | "dob">): string {
  return createHmac("sha256", secret()).update(`${s.phone}|${s.dob}`).digest("hex").slice(0, 16);
}

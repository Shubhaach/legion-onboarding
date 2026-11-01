import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/session";
import { aiConcerns } from "@/lib/concerns-ai";

export async function POST(req: NextRequest) {
  // Only patients in an active onboarding session can call the AI.
  if (!readSession(req).session?.codeVerified) return NextResponse.json({ error: "No session" }, { status: 401 });
  let text = "";
  try {
    const body = (await req.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.slice(0, 600) : "";
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  return NextResponse.json(await aiConcerns(text));
}

import { NextResponse, type NextRequest } from "next/server";
import { providerById, visitInfo } from "@/lib/fixtures";
import { readSession } from "@/lib/session";

const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function GET(req: NextRequest) {
  const { session } = readSession(req);
  const provider = session?.slot && providerById(session.slot.providerId);
  if (!session?.bookedAt || !session.slot || !provider) return NextResponse.json({ error: "No booking" }, { status: 404 });
  const start = session.slot.at;
  const end = start + visitInfo.minutes * 60_000;
  const origin = req.nextUrl.origin;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Legion Health prototype//EN",
    "BEGIN:VEVENT",
    `UID:${session.sid}@legion-prototype`,
    `DTSTAMP:${stamp(session.bookedAt)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:Video visit with ${provider.name}\\, ${provider.credential}`,
    `DESCRIPTION:${visitInfo.type} (${visitInfo.minutes} min). Join: ${origin}/visit`,
    `URL:${origin}/visit`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Your Legion visit starts in 10 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="legion-visit.ics"',
    },
  });
}

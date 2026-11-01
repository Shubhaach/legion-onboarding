import type { NextRequest } from "next/server";
import { State } from "@/lib/state";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return State.from(req).respond();
}

import type { NextRequest } from "next/server";
import { handleAction } from "@/lib/state";

export function POST(req: NextRequest) {
  return handleAction(req);
}

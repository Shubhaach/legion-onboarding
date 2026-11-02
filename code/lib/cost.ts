import type { Coverage } from "./fixtures";
import { selfPayFirstVisit } from "./fixtures";
import type { AdapterResult } from "./adapters/types";
import type { Session } from "./session";

export type Cost =
  | { kind: "copay"; amount: number; payer: string; plan: string }
  | { kind: "self_pay"; amount: number }
  | { kind: "tbd"; max: number }
  | { kind: "checking" };

export function costFor(s: Session | null, coverage: AdapterResult<Coverage> | undefined): Cost {
  const mode = s?.insurance?.mode;
  if (mode === "self_pay") return { kind: "self_pay", amount: selfPayFirstVisit };
  if (mode === "manual" || mode === "card_photo") return { kind: "tbd", max: selfPayFirstVisit };
  if (coverage?.status === "ready" && coverage.data)
    return { kind: "copay", amount: coverage.data.copay, payer: coverage.data.payer, plan: coverage.data.plan };
  if (coverage?.status === "pending") return { kind: "checking" };
  return { kind: "tbd", max: selfPayFirstVisit };
}

export function costShort(c: Cost): string {
  switch (c.kind) {
    case "copay":
      return `$${c.amount} copay`;
    case "self_pay":
      return `$${c.amount} self-pay`;
    case "tbd":
      return `Confirmed before your visit (up to $${c.max})`;
    case "checking":
      return "Checking your plan…";
  }
}

/** Amount authorized on the card at booking (nothing is charged in the prototype). */
export function amountToAuthorize(c: Cost): number {
  if (c.kind === "copay") return c.amount;
  if (c.kind === "self_pay") return c.amount;
  if (c.kind === "tbd") return c.max;
  return 0;
}

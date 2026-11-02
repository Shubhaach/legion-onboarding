// Server-only: loads the session from cookies, runs the lookups, applies patient actions,
// logs events, and returns the view the screens render from.
import { NextResponse, type NextRequest } from "next/server";
import {
  agreements,
  providerById,
  reminders,
  scenarioById,
  scenarioForPhone,
  servedStates,
  type Address,
} from "./fixtures";
import { lookupIdentity } from "./adapters/identity";
import { discoverAndVerify } from "./adapters/coverage";
import { queryRecords } from "./adapters/records";
import { medHistory } from "./adapters/meds";
import type { LookupContext } from "./adapters/types";
import { amountToAuthorize, costFor } from "./cost";
import { nextPath } from "./flow";
import { recordFunnel } from "./funnel";
import {
  clearSession,
  newSession,
  personKey,
  readSession,
  writeSession,
  type EventEntry,
  type Session,
} from "./session";
import { slotInstant, slotLabel } from "./time";

export class State {
  dirty = false;
  constructor(
    public session: Session | null,
    public events: EventEntry[],
    public now = Date.now(),
  ) {}

  static from(req: NextRequest) {
    const { session, events } = readSession(req);
    return new State(session, events);
  }

  log(name: string, detail?: string, at = this.now) {
    const s = this.session;
    if (!s) return;
    this.events.push(detail === undefined ? [name, at - s.startedAt] : [name, at - s.startedAt, detail]);
    recordFunnel(personKey(s), name, detail);
    console.log(JSON.stringify({ evt: name, detail, sid: s.sid.slice(0, 8), scenario: s.scenarioId }));
    this.dirty = true;
  }

  once(key: string, fn: () => void) {
    const s = this.session;
    if (!s || s.once.includes(key)) return;
    s.once.push(key);
    this.dirty = true;
    fn();
  }

  ctx(): LookupContext | null {
    const s = this.session;
    if (!s) return null;
    return {
      scenarioId: s.scenarioId,
      patientId: scenarioById(s.scenarioId)?.patientId ?? null,
      dob: s.dob,
      startedAt: s.startedAt,
      consent: s.consent,
      now: this.now,
    };
  }

  /** Runs every lookup (status derived from elapsed time) and logs each result once. */
  lookups() {
    const ctx = this.ctx();
    if (!ctx) return null;
    const identity = lookupIdentity(ctx);
    const coverage = discoverAndVerify(ctx, identity.status);
    const records = queryRecords(ctx, identity.status);
    const medications = medHistory(ctx, identity.status);
    const s = this.session!;

    if (identity.status !== "pending")
      this.once("identity_result", () => {
        if (identity.status === "ready") this.log("identity_matched", undefined, identity.readyAt);
        else this.log("verified_no_match", identity.note, identity.readyAt ?? this.now);
      });
    if (identity.status === "ready" && coverage.status !== "pending")
      this.once("coverage_result", () =>
        this.log(coverage.status === "ready" ? "coverage_found" : "coverage_not_found", undefined, coverage.readyAt ?? this.now),
      );
    if (medications.status === "ready" && medications.data?.fills.some((f) => f.controlled))
      this.once("controlled_flag", () => {
        const f = medications.data!.fills.find((x) => x.controlled)!;
        this.log("controlled_med_flagged", `${f.class ?? "controlled"} · schedule ${f.schedule ?? "?"}`, medications.readyAt);
      });
    // Pulled address outside the states Legion serves: stop on screen 2.
    if (identity.status === "ready" && identity.data && !s.identity && !servedStates.includes(identity.data.address.state))
      this.once("screen_out_state", () => {
        s.screenOut = "state";
        this.log("screen_out", "state");
      });

    return { identity, coverage, records, medications };
  }

  view() {
    const s = this.session;
    const lookups = this.lookups();
    const scenario = s ? scenarioById(s.scenarioId) : undefined;
    const provider = s?.slot ? providerById(s.slot.providerId) : undefined;
    return {
      session: s,
      lookups,
      scenario: scenario ? { id: scenario.id, label: scenario.label, phone: scenario.phone } : null,
      cost: costFor(s, lookups?.coverage),
      nextPath: nextPath(s),
      events: this.events,
      texts: s?.bookedAt && provider && s.slot ? textsFor(s, provider.name, s.slot.at) : [],
      now: this.now,
    };
  }

  respond(extra?: Record<string, unknown>, status = 200) {
    const body = { ...this.view(), ...extra };
    const res = NextResponse.json(body, { status });
    if (this.session && this.dirty) writeSession(res, this.session, this.events);
    return res;
  }
}

function textsFor(s: Session, provider: string, at: number) {
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(at);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" }).format(at);
  const fill = (t: string) =>
    t
      .replace("{provider}", provider)
      .replace("{day}", day)
      .replace("{time}", time)
      .replace("{calendarLink}", "legion.health/c/•••")
      .replace("{joinLink}", "legion.health/j/•••");
  const sendAt: Record<string, number | undefined> = {
    on_booking: s.bookedAt,
    visit_minus_24h: at - 24 * 3600_000,
    visit_minus_1h: at - 3600_000,
    on_visit_completed: s.visitCompletedAt,
  };
  return reminders
    .filter((r) => r.sendAt !== "on_visit_completed" || s.visitCompletedAt)
    .map((r) => ({ id: r.id, text: fill(r.text), at: sendAt[r.sendAt] ?? null }));
}

// ---------- actions ----------

type Body = Record<string, unknown>;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const digits = (v: unknown) => str(v, 40).replace(/\D/g, "");

class ActionError extends Error {}

function parseAddress(b: Body): Address {
  return { line1: str(b.line1), city: str(b.city, 80), state: str(b.state, 2).toUpperCase(), zip: digits(b.zip).slice(0, 5) };
}

/** Validates the patient's insurance choice without changing state. */
function parseInsurance(b: Body): { insurance: NonNullable<Session["insurance"]>; fallback: string } {
  const mode = str(b.insuranceMode);
  if (mode === "manual") {
    const payer = str(b.payer, 80);
    if (!payer) throw new ActionError("Enter your insurance company, or choose another option.");
    return { insurance: { mode: "manual", payer, memberId: str(b.memberId, 40) }, fallback: "insurance" };
  }
  if (mode === "card_photo") return { insurance: { mode: "card_photo" }, fallback: "insurance_card_photo" };
  if (mode === "self_pay") return { insurance: { mode: "self_pay" }, fallback: "self_pay" };
  throw new ActionError("Choose how you'll pay.");
}

export function applyAction(st: State, b: Body): void {
  const type = str(b.type, 40);
  const s = st.session;

  if (type === "start") {
    const phone = digits(b.phone);
    const dob = str(b.dob, 10);
    if (phone.length !== 10) throw new ActionError("Enter a 10-digit mobile number.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) throw new ActionError("Enter your date of birth.");
    st.session = newSession({ phone, dob, consent: b.consent === true, scenarioId: scenarioForPhone(phone).id });
    st.events = [];
    st.now = st.session.startedAt;
    st.log("onboarding_started");
    if (!st.session.consent) st.log("manual_fallback", "no_consent");
    return;
  }

  if (!s) throw new ActionError("Your session has ended. Please start again.");
  const lookups = st.lookups()!;

  switch (type) {
    case "verify_code": {
      const code = digits(b.code);
      if (code.length !== 6) throw new ActionError("Enter the 6-digit code.");
      if (code === "000000") {
        st.log("code_failed");
        throw new ActionError("That code didn't work. Check the text and try again.");
      }
      s.codeVerified = true;
      st.log("code_verified");
      return;
    }

    case "confirm_identity": {
      const id = lookups.identity;
      if (id.status !== "ready" || !id.data) throw new ActionError("We couldn't find your details. Please fill them in.");
      if (s.screenOut === "state") throw new ActionError("Legion can't see patients outside Texas and Utah yet.");
      const noCoverage = lookups.coverage.status === "not_found" || lookups.coverage.status === "error";
      const chosen = noCoverage ? parseInsurance(b) : null;
      s.identity = { mode: "pulled", firstName: id.data.firstName, lastName: id.data.lastName, address: id.data.address };
      s.insurance = chosen
        ? chosen.insurance
        : {
            mode: lookups.coverage.status === "ready" ? "pulled" : "pending",
            payer: lookups.coverage.data?.payer,
            memberId: lookups.coverage.data?.memberId,
          };
      st.log("prefill_confirmed");
      if (chosen) st.log("manual_fallback", chosen.fallback);
      return;
    }

    case "manual_identity": {
      const reason = str(b.reason, 20); // no_match | edit | self | address
      const firstName = str(b.firstName, 60);
      const lastName = str(b.lastName, 60);
      const address = parseAddress(b);
      if (!firstName || !lastName) throw new ActionError("Enter your first and last name.");
      if (!address.line1 || !address.city || !address.state || address.zip.length !== 5)
        throw new ActionError("Enter your full home address.");
      const served = servedStates.includes(address.state);
      const keepPulled = str(b.insuranceMode) === "pulled" && lookups.coverage.status === "ready";
      const chosen = served && !keepPulled ? parseInsurance(b) : null;
      const edited = reason === "edit" || reason === "address";
      s.identity = { mode: edited ? "edited" : "manual", firstName, lastName, address };
      if (edited) st.log("prefill_edited", reason === "address" ? "address" : "details");
      else st.log("manual_fallback", "identity");
      if (!served) {
        s.screenOut = "state";
        s.insurance = undefined;
        st.log("screen_out", "state");
        return;
      }
      s.screenOut = undefined;
      s.insurance = chosen
        ? chosen.insurance
        : { mode: "pulled", payer: lookups.coverage.data?.payer, memberId: lookups.coverage.data?.memberId };
      if (chosen) st.log("manual_fallback", chosen.fallback);
      return;
    }

    case "safety": {
      const answer = str(b.answer, 3);
      if (answer !== "yes" && answer !== "no") throw new ActionError("Choose Yes or No.");
      s.safety = answer;
      st.log("safety_answered", answer);
      if (answer === "yes") {
        s.screenOut = "safety";
        st.log("screen_out", "safety");
      }
      return;
    }

    case "enter_concerns":
      st.once("records_at_4", () => st.log("records_ready_at_screen_4", String(lookups.records.status === "ready")));
      return;

    case "submit_concerns": {
      const text = str(b.text, 600);
      const ids = Array.isArray(b.ids) ? b.ids.map((x) => str(x, 20)).filter(Boolean).slice(0, 10) : [];
      if (!text && !ids.length) throw new ActionError("Tell us a little about what's going on, or pick what fits.");
      const recordAnswers: Record<string, "yes" | "no"> = {};
      if (b.recordAnswers && typeof b.recordAnswers === "object")
        for (const [k, v] of Object.entries(b.recordAnswers as Body)) if (v === "yes" || v === "no") recordAnswers[str(k, 12)] = v;
      const conds = lookups.records.data?.conditions ?? [];
      if (conds.some((c) => !recordAnswers[c.code])) throw new ActionError("Tell us if each past record item is still relevant.");
      const source = str(b.source, 10);
      s.concerns = {
        text,
        ids: ids.length ? ids : ["other"],
        source: source === "ai" || source === "keywords" ? source : "picked",
        recordAnswers,
      };
      if (lookups.records.status !== "ready") st.log("manual_fallback", "concerns");
      st.log("concerns_submitted", s.concerns.ids.join(","));
      return;
    }

    case "submit_snapshot": {
      const pulled = lookups.medications.data?.fills ?? [];
      const taking = (b.taking ?? {}) as Record<string, unknown>;
      if (pulled.some((f) => typeof taking[f.name] !== "boolean")) throw new ActionError("Tell us if you're still taking each medication.");
      const added = Array.isArray(b.added) ? b.added.map((x) => str(x, 80)).filter(Boolean).slice(0, 10) : [];
      if (!pulled.length && b.anyMeds === true && !added.length) throw new ActionError("Add the medications you take.");
      const hospital = b.hospital === "had_one" ? "had_one" : b.hospital === "none" ? "none" : null;
      if (!hospital) throw new ActionError("Tell us about hospital stays in the past year.");
      const pharmacy = str(b.pharmacy, 120);
      if (!pharmacy) throw new ActionError("Add the pharmacy you use.");
      s.snapshot = {
        meds: pulled.map((f) => ({
          name: f.name,
          strength: f.strength,
          taking: taking[f.name] === true,
          controlled: f.controlled,
          schedule: f.schedule,
          cls: f.class,
        })),
        added,
        hospital,
        hospitalNote: str(b.hospitalNote, 300) || undefined,
        pharmacy,
      };
      if (!pulled.length) st.log("manual_fallback", "medications");
      if (lookups.records.status !== "ready") st.log("manual_fallback", "hospital_stays");
      const pulledPharmacy = lookups.medications.data?.pharmacy;
      if (!pulledPharmacy) st.log("manual_fallback", "pharmacy");
      st.log("snapshot_confirmed");
      return;
    }

    case "choose_slot": {
      const p = providerById(str(b.providerId, 40));
      const dayOffset = Number(b.dayOffset);
      const time = str(b.time, 5);
      const day = p?.slots.find((x) => x.dayOffset === dayOffset);
      if (!p || !day || !day.times.includes(time)) throw new ActionError("That time is no longer available. Pick another.");
      const at = slotInstant(dayOffset, time, st.now);
      s.slot = { providerId: p.id, at };
      st.log("provider_selected", p.id);
      st.log("slot_selected", slotLabel(at));
      return;
    }

    case "agreement_read": {
      const id = str(b.id, 40);
      if (!agreements.some((a) => a.id === id)) throw new ActionError("Unknown agreement.");
      if (!s.agreementsRead.includes(id)) {
        s.agreementsRead.push(id);
        st.log("agreement_read", id);
      }
      return;
    }

    case "book": {
      if (!s.slot) throw new ActionError("Pick a time first.");
      if (agreements.some((a) => !s.agreementsRead.includes(a.id))) throw new ActionError("Open and read every agreement first.");
      const signature = str(b.signature, 120);
      if (signature.length < 3) throw new ActionError("Sign with your full name.");
      if (b.agree !== true) throw new ActionError("Tick the box to agree.");
      const card = (b.card ?? {}) as Body;
      if (digits(card.number) !== "4242424242424242")
        throw new ActionError("Test mode: use card 4242 4242 4242 4242. Nothing is charged.");
      const exp = str(card.exp, 7).replace(/\s/g, "");
      const m = /^(\d{2})\/(\d{2})$/.exec(exp);
      if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) throw new ActionError("Enter the card expiry as MM/YY.");
      if (!/^\d{3,4}$/.test(digits(card.cvc))) throw new ActionError("Enter the 3-digit security code.");
      if (digits(card.zip).length !== 5) throw new ActionError("Enter the card's 5-digit ZIP code.");
      const amount = amountToAuthorize(costFor(s, lookups.coverage));
      s.signature = signature;
      s.payment = { last4: "4242", amount };
      s.bookedAt = st.now;
      st.log("payment_authorized", `$${amount} hold, test card •• 4242, nothing charged`);
      st.log("booked", slotLabel(s.slot.at));
      st.log("reminder_scheduled", "text 24 h before");
      st.log("reminder_scheduled", "text with join link 1 h before");
      return;
    }

    case "fast_forward":
      if (!s.bookedAt) throw new ActionError("Book first.");
      s.fastForward = true;
      st.dirty = true;
      return;

    case "join_visit": {
      if (!s.bookedAt || !s.slot) throw new ActionError("Book first.");
      const open = s.fastForward || st.now >= s.slot.at - 10 * 60_000;
      if (!open) throw new ActionError("Your visit room opens 10 minutes before the start.");
      if (!s.visitJoinedAt) {
        s.visitJoinedAt = st.now;
        st.log("visit_joined");
      }
      return;
    }

    case "end_visit":
      if (!s.visitJoinedAt) throw new ActionError("Join the visit first.");
      if (!s.visitCompletedAt) {
        s.visitCompletedAt = st.now;
        st.log("visit_completed");
      }
      return;

    case "book_followup": {
      const at = Number(b.at);
      if (!s.visitCompletedAt || !Number.isFinite(at)) throw new ActionError("Pick a follow-up time.");
      s.followUpAt = at;
      st.log("followup_booked", slotLabel(at));
      return;
    }

    default:
      throw new ActionError("Unknown action.");
  }
}

export async function handleAction(req: NextRequest) {
  const st = State.from(req);
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return st.respond({ error: "Bad request." }, 400);
  }
  if (body.type === "sign_out") {
    const res = NextResponse.json({ ok: true, nextPath: "/start" });
    clearSession(res);
    return res;
  }
  try {
    applyAction(st, body);
    st.dirty = true;
    return st.respond({ ok: true });
  } catch (e) {
    if (e instanceof ActionError) return st.respond({ error: e.message }, 422);
    throw e;
  }
}

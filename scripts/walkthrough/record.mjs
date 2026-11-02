// Step 3: drive the live prototype with Playwright and record it at 1920x1080.
// Reuses the selectors from tests/e2e/helpers.ts. A visible "agent" cursor dot glides to each target,
// a soft ring highlights it, and typing is human-paced. Each demo step runs its action, then holds until
// its narration has played, then (if the flow moves on) clicks through to the next screen.
// Step start/end times (seconds into that scenario's video) are logged to .build/demo/steps.json.
import { chromium } from "@playwright/test";
import { renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { AUDIO, DEMO, H, LEAD, ROOT, TAIL, W, ensureDir, narration, readJson, writeJson } from "./lib.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- injected cursor (runs in the page; never touches the app's own DOM tree) ----------
const CURSOR_JS = `(() => {
  const ACCENT = "43,71,214";
  const KEY = "__agentCursor";
  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || { x: 960, y: 540 }; } catch { return { x: 960, y: 540 }; } };
  let pos = load();
  const ensure = () => {
    let dot = document.getElementById("__agent-dot");
    if (dot) return dot;
    const root = document.documentElement;
    dot = document.createElement("div");
    dot.id = "__agent-dot";
    Object.assign(dot.style, {
      position: "fixed", left: "0", top: "0", width: "22px", height: "22px", borderRadius: "50%",
      background: "rgba(" + ACCENT + ",.92)", border: "3px solid #fff",
      boxShadow: "0 2px 10px rgba(11,11,12,.35), 0 0 0 6px rgba(" + ACCENT + ",.18)",
      zIndex: "2147483647", pointerEvents: "none", transform: "translate(" + (pos.x - 11) + "px," + (pos.y - 11) + "px)",
      transition: "transform 0ms", willChange: "transform",
    });
    const ring = document.createElement("div");
    ring.id = "__agent-ring";
    Object.assign(ring.style, {
      position: "fixed", left: "0", top: "0", width: "0", height: "0", borderRadius: "12px",
      border: "2px solid rgba(" + ACCENT + ",.85)", boxShadow: "0 0 0 6px rgba(" + ACCENT + ",.14)",
      zIndex: "2147483646", pointerEvents: "none", opacity: "0", transition: "opacity 180ms ease",
    });
    const pulse = document.createElement("div");
    pulse.id = "__agent-pulse";
    Object.assign(pulse.style, {
      position: "fixed", left: "0", top: "0", width: "44px", height: "44px", borderRadius: "50%",
      border: "2px solid rgba(" + ACCENT + ",.7)", zIndex: "2147483646", pointerEvents: "none", opacity: "0",
    });
    root.appendChild(ring); root.appendChild(pulse); root.appendChild(dot);
    return dot;
  };
  window.__agent = {
    pos: () => pos,
    move(x, y, ms) {
      const dot = ensure();
      dot.style.transition = "transform " + ms + "ms cubic-bezier(.45,.05,.25,1)";
      dot.style.transform = "translate(" + (x - 11) + "px," + (y - 11) + "px)";
      pos = { x, y };
      try { sessionStorage.setItem(KEY, JSON.stringify(pos)); } catch {}
    },
    ring(r) {
      ensure();
      const ring = document.getElementById("__agent-ring");
      const p = 6;
      Object.assign(ring.style, { left: (r.x - p) + "px", top: (r.y - p) + "px", width: (r.width + 2 * p) + "px", height: (r.height + 2 * p) + "px", opacity: "1" });
      clearTimeout(window.__agentRingT);
      window.__agentRingT = setTimeout(() => { ring.style.opacity = "0"; }, 1100);
    },
    press() {
      const dot = ensure();
      const pulse = document.getElementById("__agent-pulse");
      pulse.style.transition = "none";
      Object.assign(pulse.style, { transform: "translate(" + (pos.x - 22) + "px," + (pos.y - 22) + "px) scale(.4)", opacity: "1" });
      void pulse.offsetWidth;
      pulse.style.transition = "transform 420ms ease-out, opacity 420ms ease-out";
      Object.assign(pulse.style, { transform: "translate(" + (pos.x - 22) + "px," + (pos.y - 22) + "px) scale(1.3)", opacity: "0" });
      dot.style.transition = "transform 90ms ease";
      dot.style.transform = "translate(" + (pos.x - 11) + "px," + (pos.y - 11) + "px) scale(.8)";
      setTimeout(() => { dot.style.transform = "translate(" + (pos.x - 11) + "px," + (pos.y - 11) + "px)"; }, 110);
    },
  };
  const boot = () => ensure();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();`;

// ---------- agent-style helpers ----------
async function inView(page, loc) {
  const box = await loc.boundingBox();
  if (box && box.y >= 70 && box.y + box.height <= H - 30) return box;
  await loc.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await sleep(750);
  return loc.boundingBox();
}

async function glide(page, loc, { ring = true } = {}) {
  await loc.waitFor({ state: "visible", timeout: 20_000 });
  const box = await inView(page, loc);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const from = await page.evaluate(() => window.__agent.pos());
  const ms = Math.round(Math.min(950, Math.max(320, 260 + Math.hypot(x - from.x, y - from.y) * 0.5)));
  await page.evaluate(([x, y, ms]) => window.__agent.move(x, y, ms), [x, y, ms]);
  await page.mouse.move(x, y, { steps: 6 }); // real hover states follow the dot
  await sleep(ms);
  if (ring) await page.evaluate((b) => window.__agent.ring(b), box);
  return box;
}

async function click(page, loc, pause = 220) {
  await glide(page, loc);
  await sleep(pause);
  await page.evaluate(() => window.__agent.press());
  await loc.click();
  await sleep(250);
}

async function hover(page, loc, ms = 900) {
  await glide(page, loc);
  await sleep(ms);
}

async function type(page, loc, text, delay = 55) {
  await click(page, loc, 120);
  await loc.pressSequentially(text, { delay });
  await sleep(200);
}

async function openDemoPanel(page) {
  const btn = page.getByRole("button", { name: "Demo", exact: true });
  if (await btn.isVisible()) await click(page, btn, 120);
  await page.getByRole("region", { name: "Demo panel" }).waitFor();
}

// ---------- scenario data (synthetic, from fixtures) ----------
const scenarios = readJson(join(ROOT, "data/fixtures/scenarios.json")).scenarios;
const patients = readJson(join(ROOT, "data/fixtures/patients.json"));
const patientList = Array.isArray(patients) ? patients : patients.patients;
function dobFor(scenarioId) {
  const sc = scenarios.find((s) => s.id === scenarioId);
  const p = patientList.find((x) => x.id === sc.patientId);
  const [y, m, d] = p.dob.split("-");
  return `${m}${d}${y}`;
}

/** Off-camera fast path to a screen (used before a scenario's first recorded step). */
async function quickStart(page, phone, dob) {
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("Date of birth").fill(dob);
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.getByLabel(/We texted a 6-digit code/).fill("123456");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/confirm/);
}

const PREP = {
  happy: async () => {},
  no_coverage: async (page, seg) => {
    await quickStart(page, seg.phone, dobFor("no_coverage"));
    await page.getByTestId("coverage-card").getByText("$250").first().waitFor({ timeout: 15_000 });
  },
  records_slow: async (page, seg) => {
    await quickStart(page, seg.phone, dobFor("records_slow"));
    await page.getByTestId("coverage-card").getByText(/\$40 copay/).waitFor({ timeout: 15_000 });
    await page.getByRole("button", { name: "Yes, that's me" }).click();
    await page.waitForURL(/\/safety/);
    await page.getByRole("button", { name: "No", exact: true }).click();
    await page.waitForURL(/\/concerns/);
  },
};

// ---------- the steps: `run` happens under the narration; `exit` moves on after it ----------
const STEPS = {
  "d1-start": {
    run: async (page, seg) => {
      await type(page, page.getByLabel("Mobile number"), seg.phone, 70);
      await type(page, page.getByLabel("Date of birth"), dobFor(seg.scenario), 70);
      const consent = page.getByRole("checkbox");
      await glide(page, consent);
      if (!(await consent.isChecked())) await click(page, consent);
      else await sleep(500);
      await click(page, page.getByRole("button", { name: "Text me a code" }));
      await type(page, page.getByLabel(/We texted a 6-digit code/), "123456", 110);
    },
    exit: async (page) => {
      await click(page, page.getByRole("button", { name: "Continue" }));
      await page.waitForURL(/\/confirm/);
    },
  },
  "d2-confirm": {
    run: async (page) => {
      await page.getByTestId("coverage-card").getByText(/\$30 copay/).waitFor({ timeout: 15_000 });
      await hover(page, page.getByText("Jordan Reyes").first(), 700);
      await hover(page, page.getByTestId("coverage-card"), 1400);
      await hover(page, page.getByTestId("demo-identity"), 600);
      await hover(page, page.getByTestId("demo-coverage"), 900);
      await hover(page, page.getByTestId("demo-records"), 700);
    },
    exit: async (page) => {
      await click(page, page.getByRole("button", { name: "Yes, that's me" }));
      await page.waitForURL(/\/safety/);
    },
  },
  "d3-safety": {
    run: async (page) => {
      await hover(page, page.getByRole("button", { name: "Yes", exact: true }), 1600);
      await hover(page, page.getByRole("button", { name: "No", exact: true }), 400);
    },
    exit: async (page) => {
      await click(page, page.getByRole("button", { name: "No", exact: true }));
      await page.waitForURL(/\/concerns/);
    },
  },
  "d4-concerns": {
    run: async (page) => {
      await type(page, page.getByLabel("Type or speak. A sentence is enough."), "Trouble sleeping and feeling on edge at work for a few months.", 38);
      const chip = page.getByTestId("concern-chips").locator(".chip.on").first();
      await chip.waitFor({ timeout: 15_000 });
      await hover(page, page.getByTestId("concern-chips"), 1200);
      await page.getByTestId("records-card").waitFor({ timeout: 15_000 });
      for (const group of await page.getByRole("radiogroup", { name: /still relevant/ }).all())
        await click(page, group.getByRole("radio", { name: "Yes" }));
    },
    exit: async (page) => {
      await click(page, page.getByRole("button", { name: "Continue" }));
      await page.waitForURL(/\/snapshot/);
    },
  },
  "d5-snapshot": {
    run: async (page) => {
      await hover(page, page.getByText("Sertraline 50 mg").first(), 700);
      for (const group of await page.getByRole("radiogroup", { name: /^Still taking/ }).all())
        await click(page, group.getByRole("radio", { name: "Yes" }));
      await click(page, page.getByRole("radiogroup", { name: "Hospital stays in the past year" }).getByRole("radio", { name: "Correct" }));
    },
    exit: async (page) => {
      await click(page, page.getByRole("button", { name: "Looks right" }));
      await page.waitForURL(/\/provider/);
    },
  },
  "d6-provider": {
    run: async (page) => {
      const open = page.getByTestId("provider-open");
      await hover(page, open.locator(".av").first(), 600);
      const days = open.locator("button.day");
      await click(page, (await days.count()) > 1 ? days.nth(1) : days.first());
      await click(page, open.locator("button.time").first());
    },
    exit: async (page) => {
      await click(page, page.getByRole("button", { name: /^Continue with/ }));
      await page.waitForURL(/\/book/);
    },
  },
  "d7-book": {
    run: async (page) => {
      await hover(page, page.getByRole("button", { name: "Book visit" }), 900);
      // The first agreement is read on camera at a readable pace; the other four go quicker.
      for (let i = 0; i < 5; i++) {
        await click(page, page.locator("button.doc").nth(i), i === 0 ? 120 : 40);
        const scroll = page.getByTestId("agreement-scroll");
        if (i === 0) await glide(page, scroll, { ring: false });
        await scroll.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
        await page.getByTestId("agreement-end").getByText(/Marked as read/).waitFor({ timeout: 10_000 });
        await sleep(i === 0 ? 350 : 120);
        await click(page, page.getByRole("dialog").getByRole("button", { name: "Close" }), 40);
      }
      await hover(page, page.getByTestId("read-count"), 400);
      await type(page, page.getByLabel("Card number"), "4242424242424242", 22);
      await type(page, page.getByLabel("Expiry"), "1230", 30);
      await type(page, page.getByLabel("CVC"), "123", 30);
      await type(page, page.getByLabel("ZIP"), "78704", 30);
      await type(page, page.getByLabel("Sign with your full name"), "Jordan Reyes", 35);
      await click(page, page.getByLabel("I've read and agree to these agreements"));
    },
    exit: async (page) => {
      await click(page, page.getByRole("button", { name: "Book visit" }));
      await page.waitForURL(/\/booked/);
    },
  },
  "d8-visit": {
    run: async (page) => {
      await hover(page, page.getByText("You're booked").first(), 1200);
      await hover(page, page.getByTestId("demo-events"), 900);
      await click(page, page.getByRole("link", { name: "Go to your visit room →" }));
      await page.waitForURL(/\/visit$/);
      await openDemoPanel(page);
      const ff = page.getByRole("button", { name: "Fast-forward to visit time" });
      if (await ff.isVisible()) await click(page, ff);
      const join = page.getByRole("button", { name: "Join visit" });
      await join.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Join visit" && !b.disabled));
      await click(page, join);
      await page.getByTestId("video-stage").waitFor();
      await sleep(2200);
      await click(page, page.getByRole("button", { name: "End visit" }));
      await page.waitForURL(/\/visit-complete/);
      await openDemoPanel(page);
      await hover(page, page.getByText("First visit completed").first(), 1200);
    },
  },
  "d9-nocoverage": {
    run: async (page) => {
      await hover(page, page.getByTestId("coverage-card"), 1500);
      await hover(page, page.getByTestId("demo-coverage"), 800);
      await click(page, page.getByLabel(/I'll pay myself/));
    },
  },
  "d10-recordsslow": {
    run: async (page) => {
      await hover(page, page.getByText("Or pick what fits"), 900);
      await hover(page, page.getByTestId("demo-records"), 900);
      await type(page, page.getByLabel("Type or speak. A sentence is enough."), "Nightmares and flashbacks since the accident.", 40);
      await page.getByTestId("concern-chips").locator(".chip.on").first().waitFor({ timeout: 15_000 });
      await sleep(500);
      await click(page, page.getByRole("button", { name: "Continue" }));
      await page.waitForURL(/\/snapshot/);
      await hover(page, page.getByText("Any hospital stays in the past year?"), 900);
      await click(page, page.getByRole("radiogroup", { name: "Any hospital stays in the past year?" }).getByRole("radio", { name: "No" }));
    },
  },
};

export async function record() {
  const audio = readJson(join(AUDIO, "durations.json")).segments;
  const base = (process.env.WALKTHROUGH_URL ?? narration.liveUrl).replace(/\/$/, "");
  const demo = narration.segments.filter((s) => s.kind === "demo");
  const missing = demo.filter((s) => !STEPS[s.id]).map((s) => s.id);
  if (missing.length) throw new Error(`No recorded action for demo step(s): ${missing.join(", ")}`);

  // Consecutive steps of the same scenario share one browser context (one video).
  const groups = [];
  for (const s of demo) {
    if (s.scenario !== groups.at(-1)?.scenario) groups.push({ scenario: s.scenario, phone: s.phone, steps: [] });
    groups.at(-1).steps.push(s);
  }

  rmSync(DEMO, { recursive: true, force: true });
  ensureDir(DEMO);
  const browser = await chromium.launch();
  const log = [];
  try {
    for (const [gi, g] of groups.entries()) {
      const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: DEMO, size: { width: W, height: H } } });
      await context.addInitScript(CURSOR_JS);
      const page = await context.newPage();
      const t0 = Date.now();
      const t = () => (Date.now() - t0) / 1000;
      await page.goto(`${base}/start`);
      await page.getByLabel("Mobile number").waitFor();
      await openDemoPanel(page);
      await PREP[g.scenario](page, g.steps[0]);
      await sleep(600);
      for (const seg of g.steps) {
        await page.waitForURL((u) => u.pathname === seg.route, { timeout: 30_000 });
        await page.locator("main h1").first().waitFor();
        const start = t();
        console.log(`  [${start.toFixed(2)}s] start ${seg.id} on ${seg.route}`);
        await STEPS[seg.id].run(page, seg);
        const hold = start + LEAD + audio[seg.id] + TAIL - t();
        if (hold > 0) await sleep(hold * 1000);
        const narrationEnd = t();
        if (STEPS[seg.id].exit) await STEPS[seg.id].exit(page, seg);
        await sleep(300);
        const end = t();
        console.log(`  [${end.toFixed(2)}s] end   ${seg.id} (narration ${audio[seg.id].toFixed(1)}s, action+hold ${(narrationEnd - start).toFixed(1)}s)`);
        log.push({ id: seg.id, scenario: g.scenario, video: `scenario-${gi + 1}.webm`, start, end });
      }
      const video = page.video();
      await context.close();
      renameSync(await video.path(), join(DEMO, `scenario-${gi + 1}.webm`));
    }
  } finally {
    await browser.close();
  }
  writeJson(join(DEMO, "steps.json"), log);
  return log;
}

if (import.meta.url === `file://${process.argv[1]}`) await record();

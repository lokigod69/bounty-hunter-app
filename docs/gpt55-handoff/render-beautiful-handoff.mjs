import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDTH = 2600;
const HEIGHT = 1900;

const outHtmlDir = path.join(__dirname, "beautiful-html");
mkdirSync(outHtmlDir, { recursive: true });

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const chromePath = chromeCandidates.find(existsSync);
if (!chromePath) {
  throw new Error("Could not find Chrome or Edge for PNG rendering.");
}

const docs = [
  {
    file: "01_REPOSITORY_INTELLIGENCE_MAP",
    label: "01",
    title: "Repository Intelligence Map",
    subtitle: "Where the active systems live, what runs the app, and what still needs verification.",
    source: "01_REPOSITORY_INTELLIGENCE_MAP.md",
    accent: "#19b6d2",
    accent2: "#4f7cff",
    warm: "#f6b84a",
    verdict: "MVP/Beta repo with active React + Supabase product code and several verification gaps.",
    scene: "Repo as a control room",
    sceneBody: "Frontend, backend, docs, scripts, and mobile wrapper are connected, but the fresh environment story still needs proof.",
    primary: [
      ["Product identity", "Bounty Hunter is a social task and reward app for missions, proof, approvals, credits, and friend/partner flows."],
      ["Primary stack", "React 18, Vite 6, TypeScript, React Router, Tailwind/custom CSS, Supabase Auth/Postgres/RLS/Storage/Realtime/Edge Functions, Vercel."],
      ["Entry points", "index.html -> src/main.tsx -> App.tsx, protected routes, Supabase client, RPC calls, storage uploads, and Edge Functions."],
      ["Needs verification", "Generated DB types, storage policies, Google auth, iOS build, cron deployment, stale docs, and schema drift."]
    ],
    lanes: [
      ["src/", "Active app screens, hooks, domain services, core rules, UI, theme, i18n."],
      ["supabase/", "Migrations, schema snapshots, RLS/RPCs, local config, Edge Functions."],
      ["docs/", "Vision, architecture, runbooks, status, launch audit, generated handoff."],
      ["scripts/ + db/", "Local/prod PowerShell helpers, seed SQL, hardening proposals."],
      ["ios/ + public/", "Capacitor shell, static assets, fonts, sounds, logos."]
    ],
    footer: "Best use: orient a future architecture reviewer before touching implementation."
  },
  {
    file: "02_PROJECT_ABSTRACT_AND_SYSTEM_OVERVIEW",
    label: "02",
    title: "Project Abstract and System Overview",
    subtitle: "The product story, core user journeys, system boundary, glossary, and ambiguity map.",
    source: "02_PROJECT_ABSTRACT_AND_SYSTEM_OVERVIEW.md",
    accent: "#2fbf71",
    accent2: "#3d8bfd",
    warm: "#f26d6d",
    verdict: "A gamified relationship productivity app: missions create accountability, proof creates trust, credits unlock rewards.",
    scene: "User journey at a glance",
    sceneBody: "The experience starts at auth and onboarding, then loops through mission creation, proof, review, credits, rewards, friends, and history.",
    primary: [
      ["Product narrative", "Users create missions or rewards for people they know. Completion is reviewed, credits move, and relationship context shapes the experience."],
      ["Current feature map", "Auth, onboarding, dashboard, issued missions, proof submission, review, rewards store, collected rewards, friends, profile, archive."],
      ["System boundary", "Browser app, Supabase project, storage buckets, Edge Functions, email providers, Vercel hosting, and optional iOS wrapper."],
      ["Ambiguities", "Terminology, onboarding persistence, reward assignment rules, proof support, launch readiness, and recurring-task direction."]
    ],
    lanes: [
      ["1. Sign in", "Google/password/magic link, profile bootstrap, protected routes."],
      ["2. Onboard", "Pick mode, invite or relationship setup, starter missions/rewards."],
      ["3. Work missions", "Create, assign, submit proof, review, approve, reject, archive."],
      ["4. Spend credits", "Create rewards, claim rewards, notify creators, keep redemption history."],
      ["5. Maintain trust", "Friends, partner state, profile, history, launch hardening."]
    ],
    footer: "Best use: understand the app as a product before debating architecture."
  },
  {
    file: "03_ARCHITECTURE_ROUTING_AND_RUNTIME_FLOW",
    label: "03",
    title: "Architecture, Routing, and Runtime Flow",
    subtitle: "How a user action moves through React, hooks, domain services, Supabase, and UI feedback.",
    source: "03_ARCHITECTURE_ROUTING_AND_RUNTIME_FLOW.md",
    accent: "#7d5cff",
    accent2: "#22b8cf",
    warm: "#ff9f43",
    verdict: "The architecture is recognizable, but browser-side direct table writes still blur security and domain boundaries.",
    scene: "Runtime flow model",
    sceneBody: "Routes and components call hooks/domain services, which call Supabase tables, RPCs, storage, realtime, and Edge Functions.",
    primary: [
      ["Routing map", "/login, /onboarding, /, /friends, /archive, /profile/edit, /rewards-store, /my-rewards, /issued, and fallback redirect."],
      ["State model", "AuthContext, UIContext, ThemeContext, route state, custom data hooks, realtime refetches, and domain rule helpers."],
      ["Service layer", "mission, reward, credit, proof, profile, storage, and notification paths are split across hooks, domain files, and Supabase RPCs."],
      ["Error/loading pattern", "Toasts, local component state, loading flags, optimistic-ish refreshes, and silent notification failures in places."]
    ],
    lanes: [
      ["User intent", "Click, form submit, upload, approval, purchase, friend action."],
      ["React surface", "Page -> modal/card/form -> hook -> domain helper."],
      ["Supabase", "RLS table query, RPC, storage upload, auth session, realtime event."],
      ["Server side", "Postgres constraints, SECURITY DEFINER RPCs, Edge Functions, email."],
      ["UI result", "Toast, refetch, route update, balance change, proof/reward visible."]
    ],
    footer: "Best use: trace behavior from UI event to database side effect."
  },
  {
    file: "04_DATA_AUTH_API_AND_EXTERNAL_SERVICES",
    label: "04",
    title: "Data, Auth, API, and External Services",
    subtitle: "The trust boundary map: tables, policies, RPCs, storage, auth, and third-party services.",
    source: "04_DATA_AUTH_API_AND_EXTERNAL_SERVICES.md",
    accent: "#0ea5a4",
    accent2: "#6c5ce7",
    warm: "#ffb020",
    verdict: "Supabase is the system backbone; launch safety depends on tightening RLS, RPC ownership, storage policies, and service secrets.",
    scene: "Data trust boundary",
    sceneBody: "Auth identities reach browser APIs, table policies, SECURITY DEFINER RPCs, storage buckets, realtime subscriptions, and email functions.",
    primary: [
      ["Core entities", "auth.users, profiles, friendships, tasks, user_credits, credit_transactions, rewards_store, collected_rewards, recurring state."],
      ["Authorization model", "Protected routes help UX, but enforceable security must live in RLS, RPC checks, storage policies, and function auth."],
      ["API surface", "Supabase Auth, direct table operations, RPCs for approvals/reward operations, storage uploads, realtime listeners, Edge Functions."],
      ["External services", "Supabase Cloud, Vercel, Resend, Gmail OAuth/Nodemailer, Google OAuth/fonts, optional iOS Capacitor build."]
    ],
    lanes: [
      ["Browser client", "Anon key, user JWT, protected UI, direct Supabase JS calls."],
      ["RLS tables", "profiles, friendships, tasks, credits, rewards, collections, streaks."],
      ["RPC layer", "approve_task, purchase_reward, reward create/update/delete, recurring completion."],
      ["Storage", "avatars, bounty-proofs, reward-images; bucket migrations/policies needed."],
      ["Edge/email", "notify reward creator, task alerts, proof alerts, daily task worker."]
    ],
    footer: "Best use: decide which operations must move out of direct browser writes."
  },
  {
    file: "05_CODE_REVIEW_AND_REFACTOR_PROPOSAL",
    label: "05",
    title: "Code Review and Refactor Proposal",
    subtitle: "A prioritized map of risks, hotspots, duplication, type gaps, tests, performance, and security work.",
    source: "05_CODE_REVIEW_AND_REFACTOR_PROPOSAL.md",
    accent: "#e05a8a",
    accent2: "#4f7cff",
    warm: "#ff9f43",
    verdict: "Refactor around trust boundaries first: domain rules and database authority should agree before UI polish or broad cleanup.",
    scene: "Refactor decision board",
    sceneBody: "The proposal groups problems by priority so GPT-5.5 can choose the right sequence instead of making cosmetic changes first.",
    primary: [
      ["Priority matrix", "Security and data integrity issues outrank UI cleanup, naming cleanup, and performance tuning."],
      ["Boundary problems", "Business rules live in several places: browser hooks, domain files, RLS policies, RPCs, and schema snapshots."],
      ["Complexity hotspots", "Mission and reward flows carry upload, validation, status transition, toast, refetch, and notification logic together."],
      ["Testing gap", "No test runner means refactors need focused unit tests, RLS/RPC integration tests, and minimal flow smoke checks."]
    ],
    lanes: [
      ["Phase 1", "Lock credits, task lifecycle, storage policies, email auth, migration reset."],
      ["Phase 2", "Consolidate domain services, proof handling, reward create/update/delete, error mapping."],
      ["Phase 3", "Add tests around core rules, RPC behavior, uploads, onboarding, purchase concurrency."],
      ["Phase 4", "Clean naming, remove stale paths, improve bundle and realtime behavior."],
      ["Phase 5", "Observability, admin support, analytics, launch operations."]
    ],
    footer: "Best use: choose the next refactor slice by risk, not by file size."
  },
  {
    file: "06_LAUNCH_READINESS_AUDIT",
    label: "06",
    title: "Launch Readiness Audit",
    subtitle: "The release gate: blockers, private beta risks, public launch risks, tests, and minimum fix set.",
    source: "06_LAUNCH_READINESS_AUDIT.md",
    accent: "#ef4444",
    accent2: "#0ea5a4",
    warm: "#f59e0b",
    verdict: "Not launchable. Private beta is reachable only after the minimum security, data, storage, migration, email, and test fixes.",
    scene: "Launch gate",
    sceneBody: "The app can build, but core trust boundaries are not ready for real users until launch blockers are closed and tested.",
    primary: [
      ["Critical blockers", "Direct credit writes, broad task updates, missing storage migrations, proof mismatch, unsafe fresh migrations, email auth gaps, no tests."],
      ["Private beta risks", "Lint failures, local-only onboarding state, reward assignment ambiguity, RLS inconsistency, orphaned files, public profile emails."],
      ["Public launch risks", "No rate limits, noisy realtime refetches, large bundle, unscanned uploads, no analytics/error tracking/admin visibility."],
      ["Minimum fix set", "Move sensitive mutations to server-owned RPCs, lock RLS/storage, prove migrations, authorize functions, add launch-critical regression tests."]
    ],
    lanes: [
      ["Block", "Credit balance can be changed by the user through direct table access."],
      ["Block", "Task lifecycle can be tampered with outside the UI."],
      ["Block", "Fresh Supabase setup cannot be trusted until reset passes."],
      ["Block", "Email functions need event-level authorization and escaping."],
      ["Ship later", "Observability, admin tooling, rate limits, bundle budget, richer QA."]
    ],
    footer: "Best use: treat this as the go/no-go checklist before exposing the app to real users."
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function card([title, body], i) {
  return `
    <article class="card card-${i + 1}">
      <div class="card-num">${String(i + 1).padStart(2, "0")}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function lane([title, body], i) {
  return `
    <div class="lane lane-${i + 1}">
      <div class="lane-marker"></div>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(body)}</span>
      </div>
    </div>
  `;
}

function html(doc) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${WIDTH}, initial-scale=1" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { width: ${WIDTH}px; height: ${HEIGHT}px; margin: 0; overflow: hidden; }
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #19202d;
      background:
        linear-gradient(90deg, rgba(25,32,45,.07) 1px, transparent 1px) 0 0 / 80px 80px,
        linear-gradient(0deg, rgba(25,32,45,.06) 1px, transparent 1px) 0 0 / 80px 80px,
        #f4f1ea;
    }
    .page {
      position: relative;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      padding: 88px 100px 78px;
      background:
        radial-gradient(circle at 18% 20%, color-mix(in srgb, ${doc.accent} 13%, transparent), transparent 28%),
        radial-gradient(circle at 92% 5%, color-mix(in srgb, ${doc.warm} 13%, transparent), transparent 22%),
        linear-gradient(145deg, rgba(255,255,255,.82), rgba(245,246,248,.74));
    }
    .topline {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 80px;
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 18px;
      padding: 14px 22px;
      border: 2px solid color-mix(in srgb, ${doc.accent} 45%, #18202d);
      border-radius: 999px;
      background: rgba(255,255,255,.78);
      color: #314052;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .dot { width: 18px; height: 18px; border-radius: 50%; background: ${doc.accent}; box-shadow: 0 0 0 8px color-mix(in srgb, ${doc.accent} 17%, transparent); }
    .doc-pill {
      width: 475px;
      padding: 18px 22px;
      border-left: 10px solid ${doc.accent};
      background: #18202d;
      color: white;
      border-radius: 16px;
      box-shadow: 0 22px 55px rgba(31,35,45,.18);
      overflow: hidden;
    }
    .doc-pill b {
      display: block;
      font-size: 24px;
      line-height: 1.12;
      overflow-wrap: anywhere;
    }
    .doc-pill span { display: block; margin-top: 8px; color: #c5cfdd; font-size: 20px; line-height: 1.18; }
    h1 {
      width: 1640px;
      margin: 40px 0 20px;
      font-size: 82px;
      line-height: .98;
      letter-spacing: 0;
      color: #111827;
    }
    .subtitle {
      width: 1540px;
      margin: 0 0 42px;
      font-size: 34px;
      line-height: 1.28;
      color: #526174;
      font-weight: 500;
    }
    .verdict {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 26px;
      align-items: center;
      margin-bottom: 46px;
      padding: 28px 34px;
      border: 2px solid rgba(25,32,45,.08);
      border-left: 16px solid ${doc.warm};
      border-radius: 24px;
      background: rgba(255,255,255,.84);
      box-shadow: 0 18px 42px rgba(31,35,45,.09);
    }
    .verdict-label {
      color: #111827;
      font-size: 26px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .verdict-text {
      color: #253142;
      font-size: 34px;
      line-height: 1.23;
      font-weight: 750;
    }
    .main {
      display: grid;
      grid-template-columns: 980px 1fr;
      gap: 54px;
      align-items: stretch;
      height: 900px;
    }
    .scene {
      position: relative;
      min-height: 900px;
      border-radius: 34px;
      background:
        linear-gradient(135deg, rgba(255,255,255,.96), rgba(243,247,250,.92)),
        #fff;
      border: 2px solid rgba(25,32,45,.1);
      box-shadow: 0 30px 90px rgba(23,31,45,.16);
      overflow: hidden;
      padding: 54px;
    }
    .scene::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, color-mix(in srgb, ${doc.accent} 30%, transparent), transparent 36%),
        linear-gradient(0deg, color-mix(in srgb, ${doc.accent2} 16%, transparent), transparent 42%);
      opacity: .62;
      pointer-events: none;
    }
    .scene-content { position: relative; z-index: 1; }
    .scene-label {
      color: #5a687b;
      font-size: 24px;
      font-weight: 850;
      text-transform: uppercase;
    }
    .scene h2 {
      margin: 14px 0 16px;
      color: #111827;
      font-size: 52px;
      line-height: 1.02;
      letter-spacing: 0;
    }
    .scene p {
      margin: 0;
      color: #405166;
      font-size: 29px;
      line-height: 1.28;
      font-weight: 520;
    }
    .artifact {
      position: relative;
      height: 500px;
      margin-top: 70px;
    }
    .sheet {
      position: absolute;
      border-radius: 26px;
      background: #fff;
      border: 2px solid rgba(25,32,45,.13);
      box-shadow: 0 24px 70px rgba(17,24,39,.14);
    }
    .sheet.a { inset: 0 74px 104px 0; transform: rotate(-4deg); }
    .sheet.b { inset: 58px 18px 48px 86px; transform: rotate(3deg); }
    .sheet.c {
      inset: 120px 0 0 36px;
      transform: rotate(-1deg);
      background: linear-gradient(180deg, #172033, #222b40);
      border-color: rgba(255,255,255,.16);
      color: white;
      padding: 42px;
    }
    .sheet-tab {
      width: 150px;
      height: 18px;
      margin-bottom: 28px;
      border-radius: 999px;
      background: ${doc.accent};
    }
    .line { height: 17px; border-radius: 999px; background: rgba(255,255,255,.28); margin: 20px 0; }
    .line.short { width: 58%; }
    .line.mid { width: 78%; }
    .nodes {
      position: absolute;
      left: 58px;
      right: 58px;
      bottom: 54px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      z-index: 2;
    }
    .node {
      min-height: 98px;
      padding: 22px;
      border-radius: 18px;
      background: rgba(255,255,255,.86);
      border: 2px solid rgba(25,32,45,.09);
      box-shadow: 0 14px 28px rgba(17,24,39,.08);
      font-size: 20px;
      line-height: 1.18;
      color: #334155;
      font-weight: 750;
    }
    .node:nth-child(1) { border-top: 8px solid ${doc.accent}; }
    .node:nth-child(2) { border-top: 8px solid ${doc.accent2}; }
    .node:nth-child(3) { border-top: 8px solid ${doc.warm}; }
    .cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 26px;
    }
    .card {
      min-height: 236px;
      padding: 32px 34px;
      border-radius: 26px;
      background: rgba(255,255,255,.88);
      border: 2px solid rgba(25,32,45,.09);
      box-shadow: 0 18px 45px rgba(31,35,45,.09);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 10px;
      background: linear-gradient(90deg, ${doc.accent}, ${doc.accent2}, ${doc.warm});
    }
    .card-num {
      display: inline-flex;
      width: 58px;
      height: 42px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #18202d;
      color: white;
      font-size: 22px;
      font-weight: 850;
    }
    .card h3 {
      margin: 22px 0 12px;
      color: #111827;
      font-size: 34px;
      line-height: 1.08;
    }
    .card p {
      margin: 0;
      color: #516174;
      font-size: 25px;
      line-height: 1.32;
      font-weight: 510;
    }
    .lanes {
      margin-top: 28px;
      padding: 28px;
      border-radius: 30px;
      border: 2px solid rgba(25,32,45,.09);
      background: rgba(24,32,45,.94);
      color: white;
      box-shadow: 0 24px 60px rgba(31,35,45,.16);
    }
    .lane {
      display: grid;
      grid-template-columns: 24px 1fr;
      gap: 22px;
      min-height: 88px;
      align-items: start;
      padding: 18px 8px;
      border-bottom: 1px solid rgba(255,255,255,.11);
    }
    .lane:last-child { border-bottom: none; }
    .lane-marker {
      width: 22px;
      height: 22px;
      margin-top: 8px;
      border-radius: 50%;
      background: ${doc.accent};
      box-shadow: 0 0 0 8px color-mix(in srgb, ${doc.accent} 20%, transparent);
    }
    .lane strong {
      display: block;
      margin-bottom: 7px;
      color: white;
      font-size: 28px;
      line-height: 1.06;
    }
    .lane span {
      display: block;
      color: #c7d2e2;
      font-size: 23px;
      line-height: 1.25;
      font-weight: 500;
    }
    .footer {
      position: absolute;
      left: 100px;
      right: 100px;
      bottom: 62px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #69788b;
      font-size: 23px;
      font-weight: 650;
    }
    .footer .bar {
      flex: 1;
      height: 3px;
      margin: 0 34px;
      background: linear-gradient(90deg, ${doc.accent}, ${doc.accent2}, ${doc.warm});
      border-radius: 999px;
      opacity: .8;
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="topline">
      <div>
        <div class="kicker"><span class="dot"></span> GPT-5.5 Handoff Visual ${escapeHtml(doc.label)}</div>
        <h1>${escapeHtml(doc.title)}</h1>
        <p class="subtitle">${escapeHtml(doc.subtitle)}</p>
      </div>
      <div class="doc-pill">
        <b>${escapeHtml(doc.source)}</b>
        <span>Beautiful briefing PNG generated from the handoff document.</span>
      </div>
    </section>

    <section class="verdict">
      <div class="verdict-label">Core read</div>
      <div class="verdict-text">${escapeHtml(doc.verdict)}</div>
    </section>

    <section class="main">
      <div class="scene">
        <div class="scene-content">
          <div class="scene-label">${escapeHtml(doc.scene)}</div>
          <h2>${escapeHtml(doc.sceneBody.split(":")[0])}</h2>
          <p>${escapeHtml(doc.sceneBody)}</p>
          <div class="artifact" aria-hidden="true">
            <div class="sheet a"></div>
            <div class="sheet b"></div>
            <div class="sheet c">
              <div class="sheet-tab"></div>
              <div class="line mid"></div>
              <div class="line"></div>
              <div class="line short"></div>
              <div class="line mid"></div>
              <div class="line short"></div>
            </div>
          </div>
        </div>
        <div class="nodes">
          <div class="node">Source truth: Markdown handoff</div>
          <div class="node">Focus: decisions, flows, risks</div>
          <div class="node">Output: readable visual board</div>
        </div>
      </div>
      <div>
        <div class="cards">${doc.primary.map(card).join("")}</div>
        <div class="lanes">${doc.lanes.map(lane).join("")}</div>
      </div>
    </section>

    <footer class="footer">
      <span>${escapeHtml(doc.footer)}</span>
      <span class="bar"></span>
      <span>${WIDTH}x${HEIGHT} PNG</span>
    </footer>
  </main>
</body>
</html>`;
}

function pngDimensions(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`${filePath} is not a PNG`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

for (const doc of docs) {
  const htmlPath = path.join(outHtmlDir, `${doc.file}_beautiful.html`);
  const pngPath = path.join(__dirname, `${doc.file}_beautiful.png`);
  writeFileSync(htmlPath, html(doc), "utf8");
  execFileSync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${pngPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: "pipe" });
  const size = pngDimensions(pngPath);
  if (size.width !== WIDTH || size.height !== HEIGHT) {
    throw new Error(`${pngPath} rendered as ${size.width}x${size.height}, expected ${WIDTH}x${HEIGHT}`);
  }
  console.log(`${path.basename(pngPath)} ${size.width}x${size.height}`);
}

# Bounty Hunter – Product Vision & V1 Plan

## 1. What this app is

Bounty Hunter is a small-group “missions and rewards” engine.

It externalizes what already exists in relationships:
- People ask each other to do things.
- Effort, help, and care are unevenly remembered.
- Rewards and promises are informal and often forgotten.

Bounty Hunter turns that into:
- **Missions** (things to do)
- **Proof** (evidence that it was done)
- **Approval** (someone else validates it)
- **Credits** (internal currency)
- **Rewards** (group-defined loot)
- **History** (a visible ledger of contribution)

It is **not** a corporate payroll system and not a public crypto economy. It’s a **local micro-economy** per group: a shared symbolic ledger of effort, promises, and gratitude.

---

## 2. Who it’s for (V1)

V1 is designed for small private groups:

- Friends / guilds
- Families (parents & kids)
- Couples

Corporate / organizations and large communities are **explicitly future** use-cases, not targets for V1.

---

## 3. Theme Modes (Skins) – One Engine, Three Flavors

The **core flow is identical** across modes. Only theme & copy change.

### 3.1 Modes

1. **Guild Mode (Friends / Crews)**
   - Language: missions, bounties, hunters, crew, loot.
   - Tone: playful, sci-fi / bounty-hunter-inspired, no explicit “Star Wars” branding.
   - Use: flatmates, friend groups, gaming guilds, small creative crews.

2. **Family Mode**
   - Language: chores, tasks, stars, family, rewards.
   - Tone: warm, simple, safe.
   - Use: parents + kids, siblings sharing chores.

3. **Couple Mode**
   - Language: requests, moments, tokens, partner, gifts.
   - Tone: intimate, light, not cringe.
   - Use: couples gamifying care, favors, and shared goals.

### 3.2 What changes between modes

- Color palette & minor styling.
- Key nouns in the UI:
  - “Mission” vs “Chore” vs “Request”
  - “Crew” vs “Family” vs “Partner”
  - “Loot” vs “Reward” vs “Gift”
- Empty states and microcopy.

### 3.3 What does NOT change

- Navigation structure.
- Core flows.
- Underlying data model (missions, proofs, credits, rewards).
- Domain rules (status transitions, credit awarding, reward unlocking).

Implementation: a **theme config** (e.g. `themeConfig.ts`) that provides palette + copy for each mode, with a `ThemeContext` wired into the UI.

---

## 4. Core Loop (Engine)

Same loop across all modes:

1. **Issuer creates a mission/bounty**
   - Defines what needs to be done, who it’s for, deadline, and reward (credits or store item value).

2. **Hunter sees mission**
   - Appears in their Mission Inbox as “assigned to you” or “available for you.”

3. **Hunter does the work and submits proof**
   - Photo, video, or text.
   - Proof attached to mission.

4. **Issuer reviews and approves / rejects**
   - Sees mission details + proof together.
   - Approval awards credits.
   - Rejection can include feedback.

5. **Hunter accumulates credits**
   - Credits visible in a header/summary and in history.

6. **Hunter redeems credits in a Reward Store**
   - Group-defined store with custom rewards.
   - Redeeming logs a “collected reward” event.

7. **History & leaderboards**
   - Missions done, proofs submitted, rewards collected.
   - Optional leaderboards per group.

This loop is the non-negotiable core. Everything else is layering.

---

## 5. Key Screens & UX Decisions

### 5.1 Home: Mission Inbox (not “Dashboard”)

**Purpose:** Show what actually matters *right now*.

Sections (conceptual):

1. **Do this now**
   - Missions assigned to the current user.
   - Sorted by urgency (due soon, overdue).
   - Primary CTA: open mission → view details → submit or update proof.

2. **Waiting for approval**
   - Missions where current user has submitted proof.
   - Shows status “pending approval” and who needs to act.

3. **Recently completed**
   - Recently approved missions with credits awarded.
   - Lightweight “trophy feed” feeling.

4. **Quick access**
   - “Go to Reward Store”
   - “Create new mission/bounty” (for issuers)

Open question (for design):  
Where to surface missions you created for others (“outgoing” missions). Options:
- Keep them in a separate “Issued” screen (current behavior).
- Or show a small “Missions you’ve issued” summary box with a link to full view.

The key: **Mission Inbox is about the current user’s immediate next actions**, not full management.

---

### 5.2 Crew / Friends / Family Screen

**Purpose:** Make the social graph and invites obvious.

Sections:

- **Your Crew / Family / Partner**
  - List of connected users with small stats (missions done, last activity, credits earned in this group).

- **Invites**
  - Incoming requests (accept / decline).
  - Outgoing invites (waiting).

Empty state:
- Clear CTA: “Invite your first hunter / family member / partner.”
- Copy and visuals vary per mode, behavior is the same.

---

### 5.3 Reward Store

**Purpose:** This is why the app is worth opening.

Behavior:

- Custom rewards created per group by whoever has permission.
- Each reward:
  - Title (e.g. “Movie Night,” “New Bike,” “Weekend Trip”)
  - Cost in credits
  - Optional description
  - Optional image

Design intention:

- Visually distinct from mission lists:
  - Larger cards
  - Highlighted price in credits (gold / premium accent)
  - Aspirational feel, not utilitarian

Future enhancement (not mandatory for first ship, but planned):

- **Auto-generated images via AI**
  - When a reward is created, the system can generate an image based on its title/description (optional).
  - Example: “Movie night” → cinema-style image.

---

### 5.4 Proof Submission & Review

**Submission:**

- Mission detail view:
  - Shows description, reward, deadline, assignee.
  - Proof section:
    - Upload / capture file.
    - Optional text note.
  - Single commit action: “Submit proof.”

**Review:**

- Issuer sees:
  - Mission details + proof in one view.
  - Simple approval controls:
    - Approve → triggers domain logic to award credits.
    - Reject → with optional feedback.

Goal: keep proof flows **one-screen, low-friction**.

---

### 5.5 Recurring Daily Missions & Streaks (Post-V1 but designed now)

Not necessarily in the first tiny release, but core to the “daily use” vision:

- Mark certain missions as **daily recurring**.
- At end of day:
  - If proof submitted and approved → streak continues.
  - If missed → streak resets.

Possible rules (to be implemented via domain layer later):

- Base reward for daily mission (e.g. 10 credits).
- Streak bonus (e.g. +10% per consecutive day).
- Visual emphasis on streak progress in Mission Inbox.

This feature should be designed so it fits cleanly into existing mission + proof + approval model.

---

## 6. First-Time Experience (FTX)

The first session must get a new user to the core loop quickly.

**FTX goals:**

Within a single onboarding flow, the user should:

1. Choose their **mode** (Guild / Family / Couple).
2. Create **one reward** in the store.
3. Invite **one person**.
4. Create **one mission** for that person (or for themselves, depending on mode).

Rough FTX sequence:

1. **Welcome + Mode Choice**
   - Explain modes in one sentence each.
   - User picks one (can change later in settings).

2. **Create First Reward**
   - Simple guided form:
     - Title, cost, optional description.
     - Optional image / auto-image hook (future).
   - Explain: “This is what missions will earn towards.”

3. **Invite Someone**
   - Email/phone/username, depending on infra.
   - Optional: “Skip, I’ll use it solo for now.”

4. **Create First Mission**
   - Who it’s for (you or invited person).
   - What needs to be done.
   - Deadline (optional).
   - Reward (credits or reference to the store).

After FTX, the user lands in **Mission Inbox** with:
- At least one mission visible.
- The store already containing a reward.

---

## 7. Scope for V1 (What’s in / what’s out)

### In-scope for V1

- Theme modes (Guild / Family / Couple) with shared flow.
- Mission Inbox screen with sections:
  - Do this now
  - Waiting for approval
  - Recently completed
- Crew/Friends/Family screen with invites.
- Reward Store with custom rewards.
- Proof submission (file + text).
- Approval / rejection flows.
- Credits accumulation and basic history.
- Basic first-time experience as described above.

### Nice-to-have but not required for first release

- AI-generated reward images.
- Streak bonuses for recurring daily missions.
- Leaderboards and more advanced stats.
- Notifications (push / email).
- Macro-economy or cross-group features.

### Explicitly future (do not design for now)

- Corporate / enterprise usage.
- Public or tokenized economy.
- Complex legal/tax integrations.

---

## 8. Implementation Roadmap (Product-side, separate from architecture phases)

Technical architecture phases (overlay/system/layout/domain) are already done in `ARCHITECTURE_FRONTEND.md`. This is the **product feature sequence** from here on.

### Milestone P1 – Theme System & Mode Selection

- Implement theme config with 3 modes (Guild, Family, Couple).
- Wire palette + copy into existing screens.
- Add a simple mode selector in settings (and in FTX).

### Milestone P2 – First-Time Experience

- Implement the onboarding flow:
  - Mode selection
  - Create first reward
  - Invite first person
  - Create first mission
- Tie it into existing auth and navigation.

### Milestone P3 – Mission Inbox V1

- Redesign the home screen to match the sections:
  - Do this now
  - Waiting for approval
  - Recently completed
- Ensure flows for opening missions, submitting proof, and checking approvals are smooth.

### Milestone P4 – Reward Store V1.5

- Visual redesign of Reward Store.
- Make rewards visually distinct and aspirational.
- Ensure credits and “distance to reward” are visible from Mission Inbox.

### Milestone P5 – Recurring Daily Missions (Optional for first public release)

- Data model and UI to mark missions as daily.
- Simple streak logic and visuals.

### Milestone P6 – Small-group Testing

- Test with:
  - At least one family.
  - One couple.
  - One small friend group.
- Collect friction points:
  - Confusion in onboarding.
  - Places where users don’t see what to do next.
  - Rewards/credits that feel unclear.

Use that feedback to refine copy, layouts, and FTX before a broader release.

---

## 9. Philosophy (for context, not for implementation)

Bounty Hunter is:

- A way to **fractionalize effort**:
  - “10x washing the dishes = bike.”
- A **social ledger** for promises and proof:
  - Missions formalize asks.
  - Proof and approval formalize follow-through.
- A **metaphysical space**:
  - The app gives visible structure to something that already exists in people’s heads:  
    who did what, who showed up, who owes what.

The code should stay simple. The depth is in how the loop feels and how low the friction is.

Developers should treat the app as:
- A **core engine** (missions, proofs, credits, rewards)
- With **skins and flows** that make it usable and emotionally engaging for real small groups.


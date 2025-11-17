# Bounty Hunter – Design V1 Brief

## 1. Core Concept

**What is this for?**

Bounty Hunter is a lightweight “missions and rewards” system for small groups (friends, guilds, teams) who want to turn real-life tasks into quests with credits and rewards. Instead of nagging people in chat or spreadsheets, you post clear bounties, track progress, review proof, and award credits that can be redeemed for meaningful rewards.

**For who?**

- People who already coordinate favors, chores, or contributions informally (friends, roommates, partners, small communities).
- Small teams or “guilds” who want a playful way to assign work and recognize contributions without building a full corporate task system.

**What problem does it solve?**

- “I keep asking people to do things, but nothing is tracked, and follow‑up is awkward.”
- “People help out, but it’s not visible or rewarded in a consistent way.”
- “We try to gamify chores or tasks, but it falls apart as soon as we stop paying attention.”

Bounty Hunter gives the group a simple shared space where:

- Tasks become “bounties” with clear owners, deadlines, and rewards.
- Proof and approvals are explicit, not lost in chat.
- Credits and rewards make contributions feel meaningful instead of invisible.

---

## 2. User Roles

### Role A: Quest Giver / Issuer

**What they do in the app**

- Create bounties (contracts/missions) with:
  - Title, description, deadline, and proof requirements.
  - Assigned hunter (friend/guild member) or “open” for anyone.
  - Reward details (credits or other reward description).
- Review incoming proofs (file/text) for their bounties.
- Approve or reject submitted work.
- Optionally archive completed missions for history/trophies.

**What success looks like for them**

- They can offload tasks and know who owns what, with clear deadlines.
- They can review and approve proofs quickly without hunting through chats.
- They feel confident that contributions are fairly rewarded and visible to the group.
- Their “missions” actually get done without them micro‑managing.

---

### Role B: Hunter / Task Taker

**What they do in the app**

- See missions that are:
  - Assigned to them.
  - Available for them to take (depending on future iterations).
- Decide what to do next based on:
  - Reward (credits), deadline, and difficulty.
  - Their current credit balance and target rewards.
- Submit proofs (file or text) when work is done.
- Track status of their missions (pending, in progress, in review, completed).
- Use earned credits in the Rewards Store to claim rewards.

**What success looks like for them**

- It’s obvious what to do right now to earn credits.
- They feel a sense of progress and recognition when missions are completed.
- Redeeming credits feels rewarding (not arbitrary numbers on a dashboard).
- They can show their history of completed missions as a “trophy case.”

---

### (Optional) Role C: Admin / Organizer

**What they do in the app**

- Seed the system with the initial set of rewards/bounties in the Rewards Store.
- Define “house rules” for what credits mean and how rewards map to real‑world value.
- Monitor usage patterns and adjust rewards/bounties to keep the loop healthy.

**What success looks like for them**

- The system runs mostly on its own after setup.
- Credits and rewards remain meaningful (no inflation, no exploits).
- The group keeps using the app because it feels fair, fun, and low friction.

---

## 3. Core Loop

The main loop for Bounty Hunter should be understandable in a few bullets:

1. **Issuer creates a bounty** describing what needs to be done, by whom, by when, and for how many credits (or what reward).
2. **Hunter sees the bounty** on their Dashboard as an assigned mission and decides to do it.
3. **Hunter does the work and submits proof** (file upload or text description) when finished.
4. **Issuer reviews the proof** in the Issued view and approves or rejects with a couple of clicks.
5. **On approval, the system awards credits** to the Hunter (via credit rules and RPCs) and marks the mission as completed/archived.
6. **Hunter spends credits in the Rewards Store** on rewards the group actually cares about (IRL treats, favors, privileges, etc.), which shows up in their “collected rewards” history.

Everything else in the app should exist to make this loop:

- Obvious (what to do next).
- Fast (low friction to create, submit, and approve).
- Emotionally satisfying (visual feedback, clear rewards).

---

## 4. Primary Journeys

### Issuer

- **J1: “Create my first bounty”**
  - I log in, see a clear entry point to create a mission.
  - I fill in title, description, assignee, reward, proof requirement, and deadline.
  - I hit “Create” and immediately see the mission in my Issued list and (if assigned) on the Hunter’s Dashboard.

- **J2: “Review and approve proofs quickly”**
  - I go to Issued view and instantly see which missions are in **Review**.
  - I click into a mission, view proof (file/text), and with one or two actions approve or reject.
  - On approval, credits are awarded and I get clear feedback; on rejection, I can optionally give a short reason.

### Hunter

- **J1: “Find something to do for credits”**
  - I open Dashboard and immediately see missions that are **assigned to me** and **need action now**.
  - I can sort by urgency or reward, and pick a mission quickly.
  - I know what proof is required before I start.

- **J2: “Redeem credits and feel rewarded”**
  - I can see my current credits and a clear link to the Rewards Store.
  - In the Rewards Store, I see appealing items with prices and availability.
  - I claim a reward, my credits go down, and the reward is added to my “My Rewards”/history view with satisfying feedback.

---

## 5. UI Priorities per Page

The following are **intentional priorities** for each main page. If a component or visual treatment doesn’t support these, it’s likely bloat.

### Dashboard (Hunter‑centric view of “now”)

- **Primary job**: Show me **what needs my attention now**.
  - For Hunters: missions assigned to me that are pending, in progress, or ready for proof submission.
  - For Issuers (secondary): quick glance at missions I created that are in review (may surface later or via filters).
- **Secondary job**: Show my **progress / credits / streak**.
  - Current credit balance and simple summary stats (e.g., completed missions, active missions).
  - Optional flavor / motivation (daily quote, creed) as long as it doesn’t overpower the “inbox.”

**Implications for UI**

- First screen after login should feel like an **inbox of missions**, not a stats dashboard.
- The top of the page: PageHeader with a clear title + short mission statement, plus credits / key stats (via StatsRow).
- Main body: BaseCard‑based list/grid of “Your missions” with strong status and action affordances.

---

### Issued (Issuer‑centric “control panel”)

- **Primary job**: Let me **quickly see pending bounties and process them**.
  - Clear separation of missions by status: Pending, In Review, Completed/Archived.
  - “In Review” missions should be visually prioritized (they are the bottleneck of the loop).
- **Secondary job**: **Create and tweak bounties quickly**.
  - Fast access to create a new mission (FAB or top‑right button).
  - Lightweight editing/deletion of existing missions where safe.

**Implications for UI**

- Issued view should read like a **review queue** first, and a “list of everything I ever made” second.
- Approve/reject controls should be close to the proof and require minimal clicks.

---

### Rewards Store

- **Primary job**: **Tempt me**. Make me want to earn and spend credits.
  - Visually rich cards with images/emoji, catchy titles, and clear value.
  - Price (credits) and availability are prominent and easy to compare.
- **Secondary job**: **Explain cost & availability clearly**.
  - Show cost in credits, any limits (one per user, limited stock), and who created the reward.

**Implications for UI**

- Feels like a **shop**, not a generic list.
- RewardCard should lean into imagery and price hierarchy:
  - Big visual, bold title, clear credit cost, strong “Claim/Redeem” CTA.
- The page should visually differ from task lists (more playful, more “storefront” energy).

---

### Friends

- **Primary job**: Show who’s in my **“bounty circle”** and what they’ve done.
  - Clear list of friends, incoming/outgoing requests, and their status.
  - Emphasis on relationships that matter for assigning missions (who I can assign to, who assigns to me).

**Implications for UI**

- FriendCard focuses on identity (avatar/initials, display name, email) and current relationship state.
- Tabs or filters for “Friends” vs “Requests” to keep the mental model simple.

---

### Archive / My Rewards

- **Primary job**: Act as a **history / trophy case**.
  - For Archive: list of completed/archived missions with minimal but meaningful metadata (title, completion date, reward).
  - For My Rewards: list of claimed rewards with dates and statuses (e.g., pending fulfillment vs used).

**Implications for UI**

- Feels like a **timeline of achievements**, not just a dead list.
- Cards can be slightly lighter‑weight visually but should still communicate pride/progress.

---

### Global UI Priorities (Header / Layout)

- **Credits visibility**:
  - Show current credits in the header or a persistent HUD element.
  - Credits should feel like a real currency: clear iconography, consistent placement, and subtle animation on changes.

- **Role awareness (soft, not rigid)**:
  - While roles are not hard‑coded, the UI should make it obvious whether I’m currently acting as an Issuer or Hunter:
    - Issued/Missions views feel like “control/publishing.”
    - Dashboard feels like “my missions inbox.”

- **No clutter without purpose**:
  - Any decorative element must support the feeling of being a bounty hunter/guild member.
  - If a component does not help:
    - Show what matters now.
    - Move the core loop forward.
    - Reinforce progress/reward.
  - …then it should be removed or de‑emphasized.

---

This brief is the lens for future design changes. Dashboard, Issued, Rewards Store, Friends, and Archive/My Rewards should all be evaluated against these priorities before new UI work is merged.



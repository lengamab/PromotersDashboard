# 📢 La French Barcelona — Community Comms & Multi-Channel Group Scheduler

> **Agent Instruction Guide**: This document explains how the Multi-Channel Community Comms Hub works, how to check scheduled group communications, and how to programmatically schedule or update messages across WhatsApp, Telegram, Facebook Groups, and Instagram Broadcast Channels.
>
> ⚠️ **CRITICAL RULE FOR ALL AI CODING AGENTS**:
> The user uses the live Cloud Run dashboard to copy formatted messages and open destination groups directly on their phone or desktop.
> Whenever scheduling or querying community comms, **always interact with the live Cloud Run backend API** or maintain synchronization with `backend/comms_schedule.json`.

---

## 🌐 1. Live Production URLs & Endpoints

| Resource | Method | URL | Description |
| :--- | :---: | :--- | :--- |
| **Web Dashboard** | `GET` | `https://promotersdashboard-275699211798.europe-west1.run.app/comms.html` | Visual UI with Message Queue, Calendar Grid, and Groups Directory |
| **Get All Comms & Groups** | `GET` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/data` | Returns `{ success: true, groups: [...], messages: [...] }` |
| **Create / Update Message** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/messages` | Schedules or edits a message with platform-adapted formatting |
| **Delete Message** | `DELETE` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/messages/<id>` | Removes message from schedule |
| **Update Message Status** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/messages/<id>/status` | Sets status (`scheduled`, `sent`, `draft`) |
| **Add / Edit Group** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/groups` | Adds or updates a target group/channel in directory |
| **Delete Group** | `DELETE` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/groups/<id>` | Removes group from directory |
| **Generate Event Plan** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/generate-plan` | Auto-generates and schedules a 5-step cadence for an event |
| **Format Variants API** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/format-variants` | Generates WhatsApp, Telegram, FB, and IG variants from raw text |
| **AI Strategy Audit** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/ai/review-strategy` | Audits entire schedule, cadence, channel mix & returns 1-click fixes |
| **AI Event Review** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/ai/review-event` | Audits specific event lifecycle (T-3 to D-Day), copy & gaps |
| **AI Suggest Polls** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/ai/suggest-polls` | Generates 3 high-engagement WhatsApp/Telegram community polls |
| **AI Chat & Copy Advisor** | `POST` | `https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/ai/chat` | Conversational strategist for copywriting & distribution advice |

---

## 👥 2. Target Channels & Groups Directory

The platform manages multi-channel distribution across 4 distinct communication ecosystems:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   COMMUNITY COMMS DISTRIBUTION CHANNELS                │
├────────────────────────────────────────────────────────────────────────┤
│ 1. WhatsApp Groups   │ Core La French Group, MiCampus, TBS Barcelona   │
│ 2. Telegram Groups   │ ESEI Business School Barcelona                  │
│ 3. Facebook Groups   │ Français à Barcelone & Expats in Barcelona      │
│ 4. Instagram Channel │ @la_french_bcn VIP Broadcast Channel            │
└────────────────────────────────────────────────────────────────────────┘
```

### Pre-Configured Directory IDs:
* `group_whatsapp_lafrench`: Our WhatsApp Group (La French Community)
* `group_whatsapp_micampus`: WhatsApp MiCampus Residence
* `group_whatsapp_tbs`: WhatsApp TBS Barcelona (Toulouse Business School)
* `group_telegram_esei`: Telegram ESEI Business School
* `group_facebook_bcn`: Facebook Groups (French & Expats in Barcelona)
* `group_instagram_channel`: Instagram Broadcast Channel (@la_french_bcn)

---

## 🎨 3. Platform Formatting Rules (Essential for Copy-Paste)

Agents must adhere to these formatting specifications so copy-pasting into each app looks perfect:

### A. WhatsApp
* Bold: `*text*` (Single asterisks)
* Italic: `_text_` (Underscores)
* Poll Format: Number emojis (`1️⃣`, `2️⃣`, `3️⃣`) with clear line breaks.
* Ticketing Link: On its own line, prefixed with `🎟️ *Billetterie & Liste :*`

### B. Telegram
* Bold: `**text**` (Double asterisks) or `<b>text</b>`
* Italic: `__text__` or `<i>text</i>`
* Links: Markdown syntax `[Link Text](https://...)` supported.

### C. Facebook Groups
* **Crucial Rule:** Facebook groups do **NOT** support standard markdown (`*` or `**` will show as raw characters).
* **Headings:** Must use **Mathematical Unicode Bold** (e.g. `𝗟𝗔 𝗙𝗥𝗘𝗡𝗖𝗛 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗔`).
* **Bilingual Requirement:** Must include a French section, a clean visual divider (`━━━━━━━━━━━━━━━━━━━━━━`), and an English section.

### D. Instagram Broadcast Channel
* Clean mobile DM tone. Short sentences, bullet points (`•`), and an action CTA ("Drop a 🔥 in reactions!").

---

## 🔍 4. How to Inspect Live Comms via cURL

To fetch all currently scheduled messages and groups:

```bash
curl -s "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/data" | python3 -m json.tool
```

---

## ⚡ 5. How to Auto-Generate a 5-Step Event Comms Plan

When an event is approaching (e.g., Wednesday Experience, Circus Friday, Tapas & Verne), you can generate a complete 5-message cadence with one API call:

```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/generate-plan" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Wednesday Experience @ Verne",
    "event_date": "2026-11-18",
    "theme": "15€ Tapas + Sangria Open Bar + Club",
    "event_link": "https://site.fourvenues.com/es/la-french-list"
  }'
```

### The 5 Generated Cadence Steps:
1. **T-3 Days (18:30):** Save the Date & Theme Reveal
2. **T-2 Days (14:00):** Free Guestlist Opening & Early Bird Tickets
3. **T-1 Day (19:00):** Pre-Drinks / Table Attendance Poll
4. **D-Day (15:00):** Guestlist Closing Warning ("Free entry before 01:30!")
5. **D-Day (20:30):** Final Call Tonight & Dress Code Reminder

---

## ✍️ 6. How to Schedule a Custom Communication

To schedule an ad-hoc message or poll:

```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TBS & MiCampus Weekend Pre-Drinks Poll",
    "type": "poll",
    "event_name": "Circus Friday",
    "scheduled_time": "2026-11-20T13:00:00",
    "target_group_ids": ["group_whatsapp_micampus", "group_whatsapp_tbs"],
    "status": "scheduled",
    "content_base": "Qui est chaud pour des pre-drinks ensemble avant le club vendredi ?",
    "content_variants": {
      "whatsapp": "*LA FRENCH x TBS & MICAMPUS* 🇫🇷\n\nQui est chaud pour des pre-drinks ensemble avant le club vendredi ? 🍷\n\n1️⃣ Pre-drinks chez moi\n2️⃣ On se retrouve au bar Verne\n3️⃣ Direct au club à 01h",
      "telegram": "**LA FRENCH PRE-DRINKS** 🇫🇷\n\nWho is joining pre-drinks before Friday party? 🍷\n\n1️⃣ Pre-drinks at residence\n2️⃣ Meet at Verne bar\n3️⃣ Club directly at 01:00",
      "facebook": "🇫🇷 𝗟𝗔 𝗙𝗥𝗘𝗡𝗖𝗛 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗔\nPre-drinks étudiants ce vendredi avant le club !\n━━━━━━━━━━━━━━━━━━━━━━\n🇬🇧 𝗟𝗔 𝗙𝗥𝗘𝗡𝗖𝗛 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗔 (ENGLISH)\nStudent pre-drinks this Friday before the club!",
      "instagram": "🚨 *FRIDAY POLL* 🚨\nPre-drinks meet up before Circus Friday! Vote in reactions 🔥"
    }
  }'
```

---

## 👥 7. How to Add a New Group to the Directory

To add a new university group, residence, or Facebook page:

```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/groups" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WhatsApp ESADE Barcelona 2026",
    "platform": "whatsapp",
    "category": "campus",
    "audience": "ESADE Business School undergraduate & master students",
    "language": "bilingual",
    "link": "https://chat.whatsapp.com/sample-esade",
    "rules": "Student friendly, emphasize guestlist cutoff at 01:30",
    "active": true
  }'
```

---

## ✅ 8. How to Mark a Message as Sent

When a message has been distributed to groups:

```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/messages/<MESSAGE_ID>/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "sent"}'
```

---

## 📁 9. Local Codebase Architecture

* Backend Module: `backend/comms_scheduler.py`
* Database: `backend/comms_schedule.json` (also mapped to Cloud Run `/data` persistent storage)
* Frontend Template: `frontend/comms.html`
* Frontend Logic & Formatter: `frontend/comms.js`
* Registration: In `backend/app.py` via `register_comms_scheduler(app)`

---

## 🧠 10. AI Strategist Endpoints (Powered by Gemini 2.5 Flash)

AI agents can programmatically trigger audits, request strategic copy reviews, or generate high-engagement polls:

### A. Run Full Strategy Audit
```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/ai/review-strategy" \
  -H "Content-Type: application/json"
```
**Returns:**
- `overall_score`: Integer (0-100)
- `score_breakdown`: `{ cadence_rhythm, channel_diversity, community_engagement, conversion_power }`
- `executive_summary`: Concise health overview
- `strengths`: Array of strengths
- `critical_gaps`: Array of blind spots or missing messages
- `actionable_recommendations`: Prioritized action steps
- `suggested_messages`: Ready-to-schedule message templates that directly fix the identified gaps

### B. Audit a Specific Event (e.g. Wednesday Tapas or Friday Circus)
```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/ai/review-event" \
  -H "Content-Type: application/json" \
  -d '{"event_name": "Wednesday Experience @ Verne"}'
```
**Returns:**
- `readiness_score`: Event readiness (0-100)
- `cadence_audit`: 5-step checklist (T-3 Teaser, T-2 Guestlist Open, T-1 Apéro Poll, D-Day Cutoff, D-Day Last Call) with statuses (`covered`, `missing`, `improvable`)
- `copy_critique`: Conversion, FOMO, pricing clarity, and ID reminder critiques
- `missing_messages_to_add`: Pre-formatted messages ready to schedule

### C. Generate Community Polls for WhatsApp / Telegram
```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/ai/suggest-polls" \
  -H "Content-Type: application/json"
```

### D. Strategic Copy & Planning Chat
```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/comms/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How can we increase dinner table reservations for Wednesday among French students?",
    "event_context": "Wednesday Experience @ Verne"
  }'
```

---

## ✍️ 11. Authentic Voice & Copywriting Playbook (Derived from Real WhatsApp Chat Exports)

To ensure messages convert and resonate with Barcelona's student, expat, and Erasmus community, adhere to the **La French Barcelona Copywriting Standard**:

### 🎯 Core Principles:
1. **Never use robot labels or stiff flag headers**:
   - ❌ Bad: `🇫🇷 *LA FRENCH BARCELONA* 🇫🇷 \n ✨ *EVENT TITLE* ✨`
   - ✅ Authentic: `🍷🔥 *WEDNESDAY NIGHT JUST GOT BETTER!*` or `🚨 *TICKETS ARE RUNNING LOW!* 🎪🔥`
2. **The Signature Multi-Step Flow**:
   - For 2 or 3 part nights, always break down the journey clearly:
     ```
     🌿 *STEP 1 – UNLIMITED SPANISH TAPAS*
     📍 El Jardinet Verde (Secret indoor garden)
     🕗 20:00–22:30
     Enjoy an ALL-YOU-CAN-EAT Spanish tapas buffet for just *15€* with sangria!

     🥃 *STEP 2 – WARMUP & FREE SHOTS*
     📍 Bar Verne (C/ Aribau 150)
     🕦 23:30
     Free shots & meetup before the club!

     🕺 *STEP 3 – CLUB NIGHT*
     📍 Club Luz de Gas (or Sutton)
     🕛 From midnight
     *100% FREE CLUB ENTRY* on the LA FRENCH LIST!
     ```
3. **The Signature Girls Group Perk**:
   - Always include the VIP table offer for girls groups:
     - EN: `👑 GIRLS GROUPS: Free VIP Table available! Reply VIP to claim yours.`
     - FR: `👑 GROUPES DE FILLES : Table VIP offerte disponible ! Répondez VIP pour réserver la vôtre.`
4. **Clean CTA & Bare Links**:
   - Always place the booking link on its own line immediately under `📲 BOOK NOW:` or `📲 RÉSERVEZ ICI :`.
5. **Interactive Poll Formatting**:
   - Introduce polls naturally: `Dropping a poll below — what’s the move tomorrow night? 👇`
   - Follow with 4 numbered options using clear emoji anchors.
6. **Strict Door Rules**:
   - `🪪 Physical ID strictly required at entrance (no photos on phone)`
   - `👔 Dress code: Club chic & elegant (no sportswear or beachwear)`


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

# 📸 La French Barcelona — Instagram Studio & Post Scheduler

> **Agent Instruction Guide**: This document explains how the Instagram Post Scheduler works, how to check the current live schedule, and how to schedule posts to the production dashboard.
>
> ⚠️ **CRITICAL RULE FOR ALL AI CODING AGENTS**:
> **NEVER** save scheduled posts only to a local file or local development server. 
> The user views and manages scheduled posts on the live Cloud Run production dashboard. All schedule queries and updates **MUST** target the live Cloud Run backend API.

---

## 🌐 1. Live Production URLs

| Resource | URL | Description |
| :--- | :--- | :--- |
| **Web Dashboard** | `https://promotersdashboard-275699211798.europe-west1.run.app/instagram.html` | Visual 24h interactive grid, queue list, preview player, & manual composer |
| **Schedule API** | `https://promotersdashboard-275699211798.europe-west1.run.app/api/schedule` | `GET` (fetch queue) / `POST` (create or update post) |
| **Delete API** | `https://promotersdashboard-275699211798.europe-west1.run.app/api/schedule/<id>` | `DELETE` (remove post from queue) |
| **Upload API** | `https://promotersdashboard-275699211798.europe-west1.run.app/api/upload-media` | `POST` multipart/form-data for media upload |
| **Publish Now** | `https://promotersdashboard-275699211798.europe-west1.run.app/api/publish-now` | `POST` immediate Meta Graph API execution |

---

## 🔍 2. How to Check Existing Scheduled Posts

Whenever a user asks about what is scheduled, content timeline, or status:

```bash
curl -s "https://promotersdashboard-275699211798.europe-west1.run.app/api/schedule" | python3 -m json.tool
```

### Response Example:
```json
{
  "posts": [
    {
      "id": "post_20261109_115654_2aa3",
      "title": "Monday Night Lineup Stories (KU + Opium + Shôko)",
      "scheduled_time": "2026-11-09T16:00",
      "post_type": "story_parts",
      "primary_media": "https://litter.catbox.moe/g13c16.mp4",
      "story_part1": "https://litter.catbox.moe/g13c16.mp4",
      "story_part2": "https://litter.catbox.moe/tkfp5v.mp4",
      "cover_media": "https://litter.catbox.moe/g43ya2.png",
      "caption": "🔥 TONIGHT IN BARCELONA — LUNES! Guestlist link in bio 🥂",
      "user_tags": ["@kubarcelona", "@opiumbarcelona", "@shokobarcelona"],
      "status": "scheduled"
    }
  ]
}
```

Post statuses can be:
- `scheduled` (🟡 waiting for its scheduled time)
- `publishing` (⚙️ currently being uploaded/processed by Meta)
- `published` (🟢 successfully posted to `@la_french_bcn`)
- `failed` (🔴 error logged in `p.logs`)

---

## ✍️ 3. How to Add a Post to the Scheduler

### Method A: Using the Automated Python Script (Recommended)

Run `_admin/scripts/schedule_live_post.py` located in the `LaFrench` repo. It automatically:
1. Detects any local file paths (e.g. `daily_flyers/YYYY-MM-DD/...`)
2. Uploads them to permanent public CDN so Meta and the browser preview player can load them without 404s
3. Sends the post payload directly to the live Cloud Run backend API
4. Syncs the local copy in `Fourvenues API/backend/instagram_schedule.json`

```bash
python3 _admin/scripts/schedule_live_post.py path/to/post_payload.json
```

Or from Python code:
```python
from _admin.scripts.schedule_live_post import schedule_post

post = {
    "title": "Monday Clubs of the Day Reel (KU + Opium + Shôko)",
    "scheduled_time": "2026-11-09T16:30",
    "post_type": "reel",
    "primary_media": "daily_flyers/2026-11-09/clubs_of_the_day_1080x1920.mp4",
    "cover_media": "daily_flyers/2026-11-09/clubs_of_the_day_preview.png",
    "caption": "🔥 TONIGHT IN BARCELONA — LUNES! ...",
    "user_tags": ["@kubarcelona", "@opiumbarcelona", "@shokobarcelona"],
    "status": "scheduled"
}

schedule_post(post)
```

---

### Method B: Direct HTTP `curl`

If media is already hosted on a public HTTPS URL:

```bash
curl -X POST "https://promotersdashboard-275699211798.europe-west1.run.app/api/schedule" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Monday Night Lineup Stories",
    "scheduled_time": "2026-11-09T16:00",
    "post_type": "story_parts",
    "primary_media": "https://litter.catbox.moe/g13c16.mp4",
    "story_part1": "https://litter.catbox.moe/g13c16.mp4",
    "story_part2": "https://litter.catbox.moe/tkfp5v.mp4",
    "cover_media": "https://litter.catbox.moe/g43ya2.png",
    "caption": "🔥 TONIGHT IN BARCELONA — LUNES! Guestlist link in bio 🥂",
    "user_tags": ["@kubarcelona", "@opiumbarcelona", "@shokobarcelona"],
    "status": "scheduled"
  }'
```

---

## 🎨 4. Supported Post Types (`post_type`)

| `post_type` | Description | Required Media Fields |
| :--- | :--- | :--- |
| `story_parts` | **2-Part Stories**: Part 1 (animated sliding cards) + Part 2 (lineup list) | `story_part1`, `story_part2`, `cover_media` |
| `reel` | **Reel Video**: 9:16 1080x1920 vertical video | `primary_media`, optional `cover_media` |
| `story_single` | **Single Story**: 15s video or still flyer | `primary_media` |
| `photo` | **Feed Photo**: Single square or 4:5 image flyer | `primary_media` |
| `both` | **Reel + 2 Stories**: Publishes reel to feed and parts to story simultaneously | `primary_media`, `story_part1`, `story_part2`, `cover_media` |

---

## ⏰ 5. Standard Content Schedule & Strategy

| Time (BCN Time) | Format | Content | Primary Venue Tags |
| :--- | :--- | :--- | :--- |
| **16:00 (4:00 PM)** | `story_parts` | Daily Club Lineup (Part 1 sliding flyers + Part 2 timetable) | Tonight's open venues |
| **16:30 (4:30 PM)** | `reel` | Clubs of the Day Master Reel (Peggy Gou Nanana audio) | Tonight's open venues |
| **18:00 (6:00 PM)** | `reel` or `photo` | Special Events / Dinner-Show / Weekly Recap (🔥 Prime Hour) | Target audience |

### Standard Club Tagging Handles:
- KU Barcelona: `@kubarcelona`
- Opium Barcelona: `@opiumbarcelona`
- Shôko Barcelona: `@shokobarcelona`
- Downtown Barcelona: `@downtownbarcelona`
- Twenties: `@twentiesbarcelona`
- City Hall: `@cityhallbarcelona`
- Bling Bling: `@blingblingbcn`

---

## ☁️ 6. Media Hosting Rules

Cloud Run containers have **ephemeral filesystems**. Therefore:
1. Files uploaded exclusively to `/tmp` or `/app/uploads` inside one container instance will not be visible on other container instances unless tracked in git.
2. **Best Practice**:
   - Always upload videos and images to public HTTPS CDN (using Litterbox / Catbox / Uguu fallback via `post_to_instagram.get_public_url_for_asset`).
   - Store copies of daily rendered packages in `Fourvenues API/uploads/` and commit them to the `PromotersDashboard` GitHub repository (`lengamab/PromotersDashboard@main`).
   - This ensures the in-app player preview works smoothly and Meta Graph API can fetch the assets reliably.

---

## 🔄 7. Git & Cloud Run Deployment

The scheduler backend and UI live in the companion repository:
`/Users/brice.lengama/Documents/La French/Fourvenues API` (remote: `lengamab/PromotersDashboard.git`).

Whenever changes are made to the backend or frontend:
```bash
cd "/Users/brice.lengama/Documents/La French/Fourvenues API"
git add .
git commit -m "feat/fix(scheduler): your message"
git push origin main
```
GitHub Actions automatically builds the Docker container and deploys it to Cloud Run in `europe-west1`.

import os
import json
import uuid
import datetime
import re
import requests
from flask import Blueprint, jsonify, request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, 'backend'))
COMMS_DB_PATH = os.path.join(DATA_DIR, 'comms_schedule.json')

DEFAULT_GROUPS = [
    {
        "id": "group_whatsapp_lafrench",
        "name": "Our WhatsApp Group (La French Community)",
        "platform": "whatsapp",
        "category": "core",
        "audience": "Core French & International partygoers, regular attendees",
        "language": "bilingual",
        "link": "https://chat.whatsapp.com/sample-lafrench",
        "rules": "High energy, exclusive list openings, party vibes & polls",
        "active": True
    },
    {
        "id": "group_whatsapp_micampus",
        "name": "WhatsApp MiCampus Residence",
        "platform": "whatsapp",
        "category": "campus",
        "audience": "MiCampus student residence residents (Erasmus & International)",
        "language": "english",
        "link": "https://chat.whatsapp.com/sample-micampus",
        "rules": "Student friendly, group discounts, pre-drinks meetups, no spam before 12h",
        "active": True
    },
    {
        "id": "group_whatsapp_tbs",
        "name": "WhatsApp TBS Barcelona",
        "platform": "whatsapp",
        "category": "campus",
        "audience": "Toulouse Business School students in Barcelona (French & International)",
        "language": "bilingual",
        "link": "https://chat.whatsapp.com/sample-tbs",
        "rules": "Focus on student nightlife, after-class drinks, student ID perks",
        "active": True
    },
    {
        "id": "group_telegram_esei",
        "name": "Telegram ESEI Business School",
        "platform": "telegram",
        "category": "campus",
        "audience": "ESEI International Business School Barcelona students",
        "language": "english",
        "link": "https://t.me/sample_esei_community",
        "rules": "Use rich text, pin important ticket links, include event covers",
        "active": True
    },
    {
        "id": "group_facebook_bcn",
        "name": "Facebook Groups (French & Expats in Barcelona)",
        "platform": "facebook",
        "category": "expat",
        "audience": "Français à Barcelone + Expats in Barcelona community groups",
        "language": "bilingual",
        "link": "https://facebook.com/groups/francais.a.barcelone",
        "rules": "Must include bilingual FR / EN translation and clear event details",
        "active": True
    },
    {
        "id": "group_instagram_channel",
        "name": "Instagram Broadcast Channel (@la_french_bcn)",
        "platform": "instagram",
        "category": "channel",
        "audience": "VIP subscribers and most active Instagram followers",
        "language": "bilingual",
        "link": "https://ig.me/j/sample-lafrench-channel",
        "rules": "Exclusive drops, secret guestlist codes, direct polls",
        "active": True
    }
]

DEFAULT_MESSAGES = [
    {
        "id": "msg_sample_wednesday_poll",
        "title": "Wednesday Pre-Drinks & Dinner Poll",
        "type": "poll",
        "target_group_ids": ["group_whatsapp_lafrench", "group_whatsapp_tbs"],
        "scheduled_time": "2026-11-18T12:00:00",
        "status": "scheduled",
        "event_name": "Wednesday Experience @ Verne",
        "content_base": "Qui est chaud pour le dîner tapas + open bar sangria à 15€ avant le club ce soir ? 🍷\n\nVotez ci-dessous pour réserver la grande table collective !",
        "content_variants": {
            "whatsapp": "*LA FRENCH BARCELONA* 🇫🇷\n\nQui est chaud pour le dîner tapas + open bar sangria à *15€* avant le club demain ? 🍷✨\n\n📍 *Verne Barcelona* (Carrer d'Aribau 150)\n⏰ *21:30*\n\n📊 *SONDAGE :*\n1️⃣ Chaud pour le dîner + Club (15€)\n2️⃣ Je viens juste au Club après (Gratuit sur liste)\n3️⃣ Pas dispo cette semaine",
            "telegram": "**LA FRENCH WEDNESDAY EXPERIENCE** 🇫🇷\n\nWho's ready for our famous 15€ Tapas & Sangria dinner before party? 🍷\n\n📍 **Verne Barcelona**\n⏰ **21:30**\n\n📊 **POLL:**\n1️⃣ Dinner + Club (15€)\n2️⃣ Club only (Free on Guestlist)\n3️⃣ Next time!",
            "facebook": "🇫🇷 *FRANÇAIS :*\nMercredi Tapas & Club avec La French ! 🍷 Dîner tapas complet + sangria à seulement 15€ à Verne Barcelona, suivi d'une entrée offerte en club.\n\n━━━━━━━━━━━━━━\n\n🇬🇧 *ENGLISH :*\nWednesday Tapas & Club with La French! 🍷 Full tapas dinner + sangria for only 15€ at Verne Barcelona, followed by free club entrance.\n\n🎟️ Tickets & Free Guestlist: https://site.fourvenues.com/es/la-french-list",
            "instagram": "🚨 *WEDNESDAY SECRET DROP* 🚨\n\nDemain soir c'est notre Wednesday Experience :\n🍽️ Dîner Tapas + Verne Club pour 15€\n🎉 Entrée gratuite en club sur La French List\n\nQui vient avec son crew ? Répondez au sondage !"
        }
    },
    {
        "id": "msg_sample_friday_reminder",
        "title": "Friday Weekend Lineup & Guestlist Alert",
        "type": "event_promo",
        "target_group_ids": ["group_whatsapp_lafrench", "group_whatsapp_micampus", "group_telegram_esei", "group_facebook_bcn"],
        "scheduled_time": "2026-11-20T14:30:00",
        "status": "scheduled",
        "event_name": "Friday Circus @ La Fira Villarroel",
        "content_base": "Vendredi soir c'est le Circus ! Entrée gratuite jusqu'à 01:30 sur La French List.",
        "content_variants": {
            "whatsapp": "🔥 *VENDREDI SOIR : LA FRENCH CIRCUS* 🎪\n\nLe plus gros vendredi étudiant de Barcelone est de retour !\n\n🎟️ *Entrée GRATUITE sur La French List* jusqu'à 01:30\n🍾 *Bouteille VIP :* 150€ pour 5 personnes\n📍 *La Fira Villarroel*\n\n👉 Inscription liste & tickets ici : https://site.fourvenues.com/es/la-french-list\n\n_Arrivez avant 01h pour éviter la file !_",
            "telegram": "🎪 **FRIDAY NIGHT: LA FRENCH CIRCUS** 🎪\n\nBarcelona's favorite Friday student party is ON!\n\n🎟️ **Free Entry on La French List** until 01:30\n📍 **La Fira Villarroel**\n\n👉 Free Guestlist link: https://site.fourvenues.com/es/la-french-list",
            "facebook": "🇫🇷 *CIRCUS FRIDAY BARCELONA* 🎪\nCe vendredi, rendez-vous à La Fira Villarroel pour la soirée Circus La French ! Entrée offerte jusqu'à 01:30 sur liste.\n\n━━━━━━━━━━━━━━\n\n🇬🇧 *CIRCUS FRIDAY BARCELONA* 🎪\nThis Friday, join us at La Fira Villarroel for our circus party! Free entrance until 01:30 on guestlist.\n\n🎟️ Guestlist link: https://site.fourvenues.com/es/la-french-list",
            "instagram": "🎪 *WEEKEND IS HERE* 🎪\n\nCe vendredi c'est Circus à La Fira Villarroel.\nEntrée gratuite sur liste La French avant 01:30 !\n\nLien en bio pour la liste ⚡"
        }
    }
]

def load_comms_db():
    if os.path.exists(COMMS_DB_PATH):
        try:
            with open(COMMS_DB_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if not data.get("groups"):
                    data["groups"] = DEFAULT_GROUPS
                if not data.get("messages"):
                    data["messages"] = DEFAULT_MESSAGES
                return data
        except Exception as e:
            print(f"Error loading comms DB: {e}")
    return {
        "groups": DEFAULT_GROUPS,
        "messages": DEFAULT_MESSAGES
    }

def save_comms_db(data):
    try:
        os.makedirs(os.path.dirname(COMMS_DB_PATH), exist_ok=True)
        with open(COMMS_DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving comms DB: {e}")
        return False

def to_unicode_bold(text):
    """Converts standard A-Za-z0-9 chars into mathematical bold unicode chars for Facebook posts."""
    normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    bold =   "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"
    trans = str.maketrans(normal, bold)
    return text.translate(trans)

def generate_platform_formats(base_text, event_name="", event_link="", poll_options=None, fr_en_bilingual=True):
    """Generates formatted variants adapted to WhatsApp, Telegram, Facebook, and Instagram."""
    link_str = event_link or "https://site.fourvenues.com/es/la-french-list"
    
    # 1. WhatsApp format (*bold*, _italic_, bullet points, poll)
    wa_parts = []
    wa_parts.append(f"🇫🇷 *LA FRENCH BARCELONA* 🇫🇷")
    if event_name:
        wa_parts.append(f"✨ *{event_name.upper()}* ✨\n")
    else:
        wa_parts.append("")
        
    wa_parts.append(base_text.strip())
    
    if poll_options and len(poll_options) > 0:
        wa_parts.append("\n📊 *SONDAGE / POLL :*")
        for i, opt in enumerate(poll_options, 1):
            wa_parts.append(f"{i}️⃣ {opt}")
            
    if link_str:
        wa_parts.append(f"\n🎟️ *Lien Billetterie & Liste :*\n{link_str}")
        
    wa_content = "\n".join(wa_parts)
    # Convert any markdown **bold** to whatsapp *bold*
    wa_content = re.sub(r'\*\*(.*?)\*\*', r'*\1*', wa_content)

    # 2. Telegram format (**bold**, __italic__, clean tags)
    tg_parts = []
    tg_parts.append(f"🇫🇷 **LA FRENCH BARCELONA** 🇫🇷")
    if event_name:
        tg_parts.append(f"✨ **{event_name}** ✨\n")
    else:
        tg_parts.append("")
        
    tg_parts.append(base_text.strip())
    
    if poll_options and len(poll_options) > 0:
        tg_parts.append("\n📊 **POLL / SONDAGE :**")
        for i, opt in enumerate(poll_options, 1):
            tg_parts.append(f"{i}️⃣ {opt}")
            
    if link_str:
        tg_parts.append(f"\n🎟️ **Tickets & Guestlist:** [Click here]({link_str})\n{link_str}")
        
    tg_content = "\n".join(tg_parts)

    # 3. Facebook format (Bilingual FR/EN with Unicode bold headers & clean dividers)
    fb_header_fr = "🇫🇷 " + to_unicode_bold("LA FRENCH BARCELONA")
    fb_header_en = "🇬🇧 " + to_unicode_bold("LA FRENCH BARCELONA - ENGLISH")
    
    fb_parts = [
        f"{fb_header_fr}",
        base_text.strip(),
        f"\n🎟️ Inscription Liste & Billetterie : {link_str}",
        "\n━━━━━━━━━━━━━━━━━━━━━━\n",
        f"{fb_header_en}",
        f"Join us for an unforgettable night in Barcelona! Free entry with La French guestlist, VIP tables and party vibes.",
        f"\n🎟️ Tickets & Guestlist registration : {link_str}"
    ]
    fb_content = "\n".join(fb_parts)

    # 4. Instagram Broadcast Channel (Clean line breaks, short punchy DMs, reaction emoji)
    ig_parts = [
        "🚨 *COMMUNITY DROP* 🚨",
        base_text.strip()
    ]
    if poll_options and len(poll_options) > 0:
        ig_parts.append("\n📊 Vote below!")
        for i, opt in enumerate(poll_options, 1):
            ig_parts.append(f"• {opt}")
    if link_str:
        ig_parts.append(f"\n🔗 Link: {link_str}")
    ig_parts.append("\nDrop a 🔥 if you're coming!")
    ig_content = "\n".join(ig_parts)

    return {
        "whatsapp": wa_content,
        "telegram": tg_content,
        "facebook": fb_content,
        "instagram": ig_content
    }

def register_comms_scheduler(app):
    """Registers Comms Hub API routes in Flask."""

    @app.route('/comms')
    @app.route('/comms.html')
    def serve_comms_page():
        return app.send_static_file('comms.html')

    @app.route('/api/comms/data', methods=['GET'])
    def get_comms_data():
        db = load_comms_db()
        return jsonify({
            "success": True,
            "groups": db.get("groups", []),
            "messages": db.get("messages", [])
        })

    @app.route('/api/comms/messages', methods=['POST'])
    def save_comms_message():
        payload = request.json or {}
        db = load_comms_db()
        messages = db.get("messages", [])

        msg_id = payload.get("id")
        if not msg_id:
            msg_id = f"msg_{uuid.uuid4().hex[:8]}"
            payload["id"] = msg_id
            payload["created_at"] = datetime.datetime.now().isoformat()
            messages.append(payload)
        else:
            found = False
            for idx, m in enumerate(messages):
                if m.get("id") == msg_id:
                    messages[idx] = {**m, **payload, "updated_at": datetime.datetime.now().isoformat()}
                    found = True
                    break
            if not found:
                messages.append(payload)

        db["messages"] = messages
        if save_comms_db(db):
            return jsonify({"success": True, "message": payload})
        return jsonify({"success": False, "error": "Failed to save message"}), 500

    @app.route('/api/comms/messages/<msg_id>', methods=['DELETE'])
    def delete_comms_message(msg_id):
        db = load_comms_db()
        messages = [m for m in db.get("messages", []) if m.get("id") != msg_id]
        db["messages"] = messages
        if save_comms_db(db):
            return jsonify({"success": True, "id": msg_id})
        return jsonify({"success": False, "error": "Failed to delete message"}), 500

    @app.route('/api/comms/messages/<msg_id>/status', methods=['POST'])
    def update_comms_message_status(msg_id):
        status = (request.json or {}).get("status", "sent")
        db = load_comms_db()
        for m in db.get("messages", []):
            if m.get("id") == msg_id:
                m["status"] = status
                m["last_sent_at"] = datetime.datetime.now().isoformat()
                save_comms_db(db)
                return jsonify({"success": True, "id": msg_id, "status": status})
        return jsonify({"success": False, "error": "Message not found"}), 404

    @app.route('/api/comms/groups', methods=['POST'])
    def save_comms_group():
        payload = request.json or {}
        db = load_comms_db()
        groups = db.get("groups", [])

        grp_id = payload.get("id")
        if not grp_id:
            grp_id = f"group_{uuid.uuid4().hex[:8]}"
            payload["id"] = grp_id
            groups.append(payload)
        else:
            found = False
            for idx, g in enumerate(groups):
                if g.get("id") == grp_id:
                    groups[idx] = {**g, **payload}
                    found = True
                    break
            if not found:
                groups.append(payload)

        db["groups"] = groups
        if save_comms_db(db):
            return jsonify({"success": True, "group": payload})
        return jsonify({"success": False, "error": "Failed to save group"}), 500

    @app.route('/api/comms/groups/<grp_id>', methods=['DELETE'])
    def delete_comms_group(grp_id):
        db = load_comms_db()
        groups = [g for g in db.get("groups", []) if g.get("id") != grp_id]
        db["groups"] = groups
        if save_comms_db(db):
            return jsonify({"success": True, "id": grp_id})
        return jsonify({"success": False, "error": "Failed to delete group"}), 500

    @app.route('/api/comms/generate-plan', methods=['POST'])
    def generate_comms_plan():
        """Generates a complete 5-step event communication schedule or custom poll."""
        data = request.json or {}
        event_name = data.get("event_name", "Wednesday Experience @ Verne")
        event_date_str = data.get("event_date", "")
        event_link = data.get("event_link", "https://site.fourvenues.com/es/la-french-list")
        theme = data.get("theme", "Tapas & Nightclub Party")

        try:
            if event_date_str:
                ev_date = datetime.date.fromisoformat(event_date_str[:10])
            else:
                ev_date = datetime.date.today() + datetime.timedelta(days=2)
        except Exception:
            ev_date = datetime.date.today() + datetime.timedelta(days=2)

        # Plan Cadence: T-3 days, T-1 day, D-Day afternoon, D-Day night, D+1 recap
        plan_steps = [
            {
                "offset": -3,
                "hour": 18,
                "minute": 30,
                "title": f"T-3 Days: Save the Date & Theme Reveal",
                "type": "event_promo",
                "text": f"🎉 Nouvelle date annoncée ! Ce {ev_date.strftime('%A %d')} c'est {event_name}.\nAu programme : {theme}.\nPlaces très limitées pour le dîner, réservez vite !"
            },
            {
                "offset": -2,
                "hour": 14,
                "minute": 0,
                "title": f"T-2 Days: Guestlist & Early Tickets Opening",
                "type": "event_promo",
                "text": f"🎟️ La liste gratuite pour {event_name} est désormais ouverte !\nEntrée offerte avant 01:30 sur La French List. Prenez vos tickets maintenant pour être prioritaires."
            },
            {
                "offset": -1,
                "hour": 19,
                "minute": 0,
                "title": f"T-1 Day: Pre-Drinks / Table Attendance Poll",
                "type": "poll",
                "text": f"Demain soir c'est {event_name} ! Qui vient à l'apéro avant le club ?",
                "poll_options": [
                    "Je viens au dîner/pre-drinks + club 🍷",
                    "Je rejoins directement au club 🎉",
                    "Je suis chaud pour une table VIP 🍾",
                    "Pas dispo ce coup-ci"
                ]
            },
            {
                "offset": 0,
                "hour": 15,
                "minute": 0,
                "title": f"D-Day (15:00): Free Guestlist Closing Warning",
                "type": "reminder",
                "text": f"⚠️ DERNIÈRE LIGNE DROITE POUR CE SOIR !\n{event_name}.\nLa liste gratuite ferme à 20h pile. Inscrivez-vous et arrivez avant 01:00 pour éviter la queue."
            },
            {
                "offset": 0,
                "hour": 20,
                "minute": 30,
                "title": f"D-Day (20:30): Final Tonight Alert & Dress Code",
                "type": "last_call",
                "text": f"🔥 C'EST CE SOIR ! Rendez-vous pour {event_name}.\nDress code : Chic & Festive. N'oubliez pas votre pièce d'identité physique !"
            }
        ]

        generated_messages = []
        for step in plan_steps:
            target_dt = datetime.datetime.combine(
                ev_date + datetime.timedelta(days=step["offset"]),
                datetime.time(step["hour"], step["minute"])
            )
            # Don't schedule in past if already past
            if target_dt < datetime.datetime.now():
                target_dt = datetime.datetime.now() + datetime.timedelta(hours=2)

            variants = generate_platform_formats(
                base_text=step["text"],
                event_name=event_name,
                event_link=event_link,
                poll_options=step.get("poll_options")
            )

            msg = {
                "id": f"msg_plan_{uuid.uuid4().hex[:8]}",
                "title": f"[{event_name[:18]}] {step['title']}",
                "type": step["type"],
                "target_group_ids": [g["id"] for g in DEFAULT_GROUPS if g.get("active")],
                "scheduled_time": target_dt.strftime("%Y-%m-%dT%H:%M:00"),
                "status": "scheduled",
                "event_name": event_name,
                "content_base": step["text"],
                "poll_options": step.get("poll_options", []),
                "content_variants": variants,
                "created_at": datetime.datetime.now().isoformat()
            }
            generated_messages.append(msg)

        # Save to DB
        db = load_comms_db()
        db["messages"].extend(generated_messages)
        save_comms_db(db)

        return jsonify({"success": True, "count": len(generated_messages), "messages": generated_messages})

    @app.route('/api/comms/format-variants', methods=['POST'])
    def format_variants():
        """Generates formatted variants for given text and options."""
        data = request.json or {}
        base_text = data.get("text", "")
        event_name = data.get("event_name", "")
        event_link = data.get("event_link", "")
        poll_options = data.get("poll_options", [])

        variants = generate_platform_formats(
            base_text=base_text,
            event_name=event_name,
            event_link=event_link,
            poll_options=poll_options
        )
        return jsonify({"success": True, "variants": variants})

    # =========================================================================
    # AI STRATEGIST ENDPOINTS (POWERED BY GEMINI 2.5 FLASH)
    # =========================================================================

    def get_gemini_api_key():
        key = os.environ.get("GEMINI_API_KEY", "")
        if not key and os.path.exists(os.path.join(BASE_DIR, '.env')):
            try:
                with open(os.path.join(BASE_DIR, '.env'), 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.startswith('GEMINI_API_KEY='):
                            key = line.strip().split('=', 1)[1].strip().strip('"\'')
                            break
            except Exception:
                pass
        return key

    def extract_ai_json(text):
        """Robust JSON extraction handling markdown code blocks, outer braces, and trailing commas."""
        text = text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
        try:
            return json.loads(text)
        except Exception:
            pass

        # Try regex to locate outermost { ... }
        m = re.search(r"(\{[\s\S]*\})", text)
        if m:
            candidate = m.group(1)
            try:
                return json.loads(candidate)
            except Exception:
                cleaned = re.sub(r",\s*([\}\]])", r"\1", candidate)
                return json.loads(cleaned)
        raise ValueError("Could not parse valid JSON from AI response")

    def call_gemini_ai(prompt, system_instruction=None, json_mode=False, model="gemini-3.1-pro-preview", temperature=0.5):
        key = get_gemini_api_key()
        if not key:
            return {"success": False, "error": "GEMINI_API_KEY is not configured in backend environment"}

        # Candidate models hierarchy: flagship 3.1 Pro -> Pro latest -> 3.8 Flash -> 2.5 Flash
        candidate_models = [model, "gemini-pro-latest", "gemini-3.8-flash", "gemini-2.5-flash"]
        # Deduplicate preserving order
        candidate_models = list(dict.fromkeys(candidate_models))

        last_error = ""
        for m_name in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": 8192
                }
            }
            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }
            if json_mode:
                payload["generationConfig"]["responseMimeType"] = "application/json"

            try:
                resp = requests.post(url, json=payload, timeout=40)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if json_mode:
                            try:
                                parsed = extract_ai_json(text)
                                return {"success": True, "data": parsed, "model": m_name, "raw": text}
                            except Exception as je:
                                return {"success": True, "data": None, "model": m_name, "raw": text, "json_error": str(je)}
                        return {"success": True, "text": text, "model": m_name}
                last_error = f"Model {m_name} returned status {resp.status_code}: {resp.text[:150]}"
            except Exception as e:
                last_error = f"Model {m_name} error: {str(e)}"

        return {"success": False, "error": f"All AI models failed. Last error: {last_error}"}

    AI_SYSTEM_PROMPT = """You are the Chief Community & Growth Marketing Director for 'La French Barcelona', the premier nightlife, student, and expat party brand in Barcelona.
You specialize in multi-channel community growth across:
1. WhatsApp Groups (La French core, MiCampus residence, TBS Barcelona student group)
2. Telegram Groups (ESEI Business School)
3. Facebook Groups (Français à Barcelone & Expats in Barcelona)
4. Instagram VIP Broadcast Channel (@la_french_bcn)

Your core weekly events include:
- Wednesday Experience @ Verne (15€ Tapas dinner + sangria open bar + nightclub afterparty)
- Friday Circus @ La Fira Villarroel (large student party, free guestlist before 01:30, VIP tables)
- Weekend & Summer Specials (boat trips, rooftop socials, after-work events)

Ticketing and guestlist link: https://site.fourvenues.com/es/la-french-list

Key principles:
- Cadence discipline: T-3 teaser, T-2 guestlist opening, T-1 pre-drinks/dinner attendance poll, D-Day afternoon cutoff warning (urgency/FOMO), D-Day night last call with dress code.
- Platform formatting: WhatsApp uses single *bold*, emojis, number polls. Facebook does not support markdown and requires Unicode bold headers with a clean bilingual FR/EN separator (━━━━━━━━━━━━━━━━━━━━━━). Telegram uses markdown **bold** and clean links. Instagram uses high-energy DM tone with reaction CTA.
- Tone: High energy, fun, welcoming, exclusive yet accessible for international & French students and expats.
"""

    @app.route('/api/comms/ai/review-strategy', methods=['POST'])
    def ai_review_strategy():
        """Performs a comprehensive AI audit of the entire communication schedule, rhythm, and channel mix."""
        db = load_comms_db()
        groups = db.get("groups", [])
        messages = db.get("messages", [])

        groups_summary = [
            {"id": g.get("id"), "name": g.get("name"), "platform": g.get("platform"), "audience": g.get("audience"), "active": g.get("active")}
            for g in groups
        ]

        messages_summary = [
            {
                "id": m.get("id"),
                "title": m.get("title"),
                "event_name": m.get("event_name"),
                "type": m.get("type"),
                "scheduled_time": m.get("scheduled_time"),
                "status": m.get("status"),
                "target_groups": m.get("target_group_ids", []),
                "preview": (m.get("content_base") or "")[:120]
            }
            for m in messages
        ]

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M (%A)")

        prompt = f"""Perform a complete strategic audit of our community communications.

CURRENT DATE & TIME: {now_str} (Europe/Madrid)

CHANNELS & GROUPS DIRECTORY ({len(groups)} total):
{json.dumps(groups_summary, indent=2, ensure_ascii=False)}

SCHEDULED COMMUNICATIONS ({len(messages)} total):
{json.dumps(messages_summary, indent=2, ensure_ascii=False)}

Evaluate our strategy and return a strictly valid JSON object with the following exact structure:
{{
  "overall_score": 75,
  "score_breakdown": {{
    "cadence_rhythm": 80,
    "channel_diversity": 70,
    "community_engagement": 65,
    "conversion_power": 85
  }},
  "executive_summary": "Concise 2-3 sentence overview of the health of our comms strategy.",
  "strengths": [
    "Strength 1...",
    "Strength 2...",
    "Strength 3..."
  ],
  "critical_gaps": [
    "Gap or risk 1...",
    "Gap 2...",
    "Gap 3..."
  ],
  "actionable_recommendations": [
    "Action 1...",
    "Action 2...",
    "Action 3..."
  ],
  "suggested_messages": [
    {{
      "title": "Clear descriptive title",
      "type": "poll",
      "event_name": "Event name or Community Engagement",
      "target_group_ids": ["group_whatsapp_lafrench", "group_whatsapp_micampus"],
      "scheduled_time": "YYYY-MM-DDTHH:MM:00",
      "content_base": "French base copy with emojis and clear CTA",
      "poll_options": ["Option 1", "Option 2", "Option 3"]
    }}
  ]
}}
Ensure suggested_messages contains 2 high-impact messages that directly solve the critical gaps you identified, ready for 1-click addition to our calendar.
"""

        res = call_gemini_ai(prompt, system_instruction=AI_SYSTEM_PROMPT, json_mode=True, temperature=0.6)
        if not res.get("success"):
            return jsonify({"success": False, "error": res.get("error")}), 500

        data = res.get("data")
        if not data:
            return jsonify({"success": False, "error": "AI response was not valid JSON", "raw": res.get("raw")}), 500

        # Auto-format platform variants if Gemini didn't fill all of them
        for msg in data.get("suggested_messages", []):
            if not msg.get("content_variants") or not msg.get("content_variants", {}).get("whatsapp"):
                msg["content_variants"] = generate_platform_formats(
                    base_text=msg.get("content_base", ""),
                    event_name=msg.get("event_name", ""),
                    poll_options=msg.get("poll_options")
                )

        return jsonify({"success": True, "analysis": data, "model": res.get("model", "gemini-3.1-pro-preview")})

    @app.route('/api/comms/ai/review-event', methods=['POST'])
    def ai_review_event():
        """Performs a deep-dive cadence and copy review for a specific event."""
        payload = request.json or {}
        event_name = payload.get("event_name", "").strip()
        if not event_name:
            return jsonify({"success": False, "error": "event_name is required"}), 400

        db = load_comms_db()
        all_messages = db.get("messages", [])
        
        # Filter messages for this event (case-insensitive substring)
        event_lower = event_name.lower()
        matched_messages = [
            m for m in all_messages
            if event_lower in (m.get("event_name") or "").lower() or event_lower in (m.get("title") or "").lower()
        ]

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M (%A)")

        prompt = f"""Perform an in-depth audit of the communications scheduled for the specific event: '{event_name}'.

CURRENT DATE & TIME: {now_str} (Europe/Madrid)

SCHEDULED MESSAGES FOR THIS EVENT ({len(matched_messages)} found):
{json.dumps(matched_messages, indent=2, ensure_ascii=False)}

Check the event against the gold-standard 5-step nightlife cadence:
1. T-3 Days: Teaser & Theme Reveal
2. T-2 Days: Free Guestlist & Early Bird Tickets Opening
3. T-1 Day: Pre-Drinks / Dinner / Table Attendance Poll
4. D-Day (15:00): Free Guestlist Closing Cutoff Urgency
5. D-Day (20:30): Final Tonight Alert & Dress Code Reminder

Evaluate copy conversion, pricing clarity (e.g. 15€ tapas + open bar vs free club entry), FOMO, and channel reach.
Return a strictly valid JSON object with:
{{
  "event_name": "{event_name}",
  "readiness_score": 82,
  "verdict": "2-3 sentences evaluating if this event is ready to sell out.",
  "cadence_audit": [
    {{
      "step": "T-3: Teaser & Theme Reveal",
      "status": "covered",
      "scheduled_time": "ISO time or null",
      "comment": "Specific feedback..."
    }},
    {{
      "step": "T-2: Guestlist Opening",
      "status": "covered",
      "scheduled_time": "ISO time or null",
      "comment": "Specific feedback..."
    }},
    {{
      "step": "T-1: Pre-Drinks / Table Attendance Poll",
      "status": "covered",
      "scheduled_time": "ISO time or null",
      "comment": "Specific feedback..."
    }},
    {{
      "step": "D-Day (15:00): Guestlist Closing Warning",
      "status": "covered",
      "scheduled_time": "ISO time or null",
      "comment": "Specific feedback..."
    }},
    {{
      "step": "D-Day (20:30): Tonight Alert & Dress Code",
      "status": "covered",
      "scheduled_time": "ISO time or null",
      "comment": "Specific feedback..."
    }}
  ],
  "channel_coverage": {{
    "whatsapp": "Strong / Fair / Missing...",
    "telegram": "Strong / Fair / Missing...",
    "facebook": "Strong / Fair / Missing...",
    "instagram": "Strong / Fair / Missing..."
  }},
  "copy_critique": [
    "Critique point 1...",
    "Critique point 2..."
  ],
  "missing_messages_to_add": [
    {{
      "title": "[Event] Step Title",
      "type": "poll",
      "event_name": "{event_name}",
      "target_group_ids": ["group_whatsapp_lafrench", "group_whatsapp_tbs", "group_whatsapp_micampus"],
      "scheduled_time": "YYYY-MM-DDTHH:MM:00",
      "content_base": "Base French copy with emojis and guestlist link",
      "poll_options": ["Option 1", "Option 2"]
    }}
  ]
}}
Ensure status is strictly one of 'covered', 'missing', or 'improvable'.
"""

        res = call_gemini_ai(prompt, system_instruction=AI_SYSTEM_PROMPT, json_mode=True, temperature=0.5)
        if not res.get("success"):
            return jsonify({"success": False, "error": res.get("error")}), 500

        data = res.get("data")
        if not data:
            return jsonify({"success": False, "error": "AI response was not valid JSON", "raw": res.get("raw")}), 500

        # Auto-populate platform variants for missing messages to add
        for msg in data.get("missing_messages_to_add", []):
            if not msg.get("content_variants"):
                msg["content_variants"] = generate_platform_formats(
                    base_text=msg.get("content_base", ""),
                    event_name=event_name,
                    poll_options=msg.get("poll_options")
                )

        return jsonify({"success": True, "analysis": data, "matched_count": len(matched_messages), "model": res.get("model", "gemini-3.1-pro-preview")})

    @app.route('/api/comms/ai/suggest-polls', methods=['POST'])
    def ai_suggest_polls():
        """Generates 3 clever, high-engagement community polls tailored for WhatsApp & Telegram groups."""
        db = load_comms_db()
        groups = db.get("groups", [])
        
        prompt = """Generate 3 interactive, fun, and high-engagement polls for our student & expat WhatsApp and Telegram groups (MiCampus, TBS Barcelona, ESEI, La French Core).
Themes:
1. Pre-drinks meetup / dinner table reservations
2. Music vibe / DJ requests for the upcoming party
3. Student nightlife perks (e.g. Erasmus discounts, shot competitions, arrival time)

Return strictly JSON format:
{
  "polls": [
    {
      "title": "Short title",
      "theme": "pre_drinks",
      "target_group_ids": ["group_whatsapp_lafrench", "group_whatsapp_micampus", "group_whatsapp_tbs"],
      "content_base": "Engaging question in French with emojis",
      "poll_options": [
        "1️⃣ Option 1...",
        "2️⃣ Option 2...",
        "3️⃣ Option 3..."
      ]
    }
  ]
}
"""
        res = call_gemini_ai(prompt, system_instruction=AI_SYSTEM_PROMPT, json_mode=True, temperature=0.7)
        if not res.get("success") or not res.get("data"):
            return jsonify({"success": False, "error": res.get("error", "Failed to generate polls")}), 500

        polls = res["data"].get("polls", [])
        for p in polls:
            p["content_variants"] = generate_platform_formats(
                base_text=p.get("content_base", ""),
                poll_options=p.get("poll_options")
            )
            tomorrow = datetime.date.today() + datetime.timedelta(days=1)
            p["scheduled_time"] = f"{tomorrow.isoformat()}T13:00:00"
            p["type"] = "poll"

        return jsonify({"success": True, "polls": polls, "model": res.get("model", "gemini-3.1-pro-preview")})

    @app.route('/api/comms/ai/chat', methods=['POST'])
    def ai_chat():
        """Interactive conversational advisor for community comms planning and copy generation."""
        payload = request.json or {}
        user_message = payload.get("message", "").strip()
        history = payload.get("history", [])
        event_context = payload.get("event_context", "")

        if not user_message:
            return jsonify({"success": False, "error": "message is required"}), 400

        db = load_comms_db()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M (%A)")

        context_prompt = f"""CURRENT DATE & TIME: {now_str} (Europe/Madrid)
ACTIVE GROUPS: {[g['name'] for g in db.get('groups', []) if g.get('active')]}
SCHEDULED MESSAGES COUNT: {len(db.get('messages', []))}
SELECTED EVENT CONTEXT: {event_context or 'None'}

CONVERSATION HISTORY:
{json.dumps(history[-6:], indent=1, ensure_ascii=False) if history else 'None'}

USER INQUIRY:
{user_message}

Provide a sharp, knowledgeable, and actionable response as the Chief Community Strategist for La French Barcelona.
If the user asks for copy, provide platform-ready versions (WhatsApp *bold*, FB unicode bold, Telegram, Instagram).
Use Markdown formatting with bolding and bullet points."""

        res = call_gemini_ai(context_prompt, system_instruction=AI_SYSTEM_PROMPT, json_mode=False, temperature=0.7)
        if not res.get("success"):
            return jsonify({"success": False, "error": res.get("error")}), 500

        return jsonify({"success": True, "reply": res.get("text", ""), "model": res.get("model", "gemini-3.1-pro-preview")})

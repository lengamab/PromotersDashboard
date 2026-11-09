import os
import json
import time
import datetime
import threading
import mimetypes
import urllib.request
import urllib.parse
from flask import Blueprint, jsonify, request, send_file, Response
from werkzeug.utils import secure_filename

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

# Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'backend')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

SCHEDULE_DB_PATH = os.path.join(DATA_DIR, 'instagram_schedule.json')
LOCK = threading.Lock()

def get_now_bcn():
    if ZoneInfo:
        try:
            return datetime.datetime.now(ZoneInfo("Europe/Madrid"))
        except Exception:
            pass
    return datetime.datetime.now()

def load_schedule_db():
    with LOCK:
        if not os.path.exists(SCHEDULE_DB_PATH):
            default_data = {"posts": []}
            with open(SCHEDULE_DB_PATH, "w", encoding="utf-8") as f:
                json.dump(default_data, f, indent=2)
            return default_data
        try:
            with open(SCHEDULE_DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"posts": []}

def save_schedule_db(data):
    with LOCK:
        with open(SCHEDULE_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

def get_credentials():
    account_id = os.environ.get("INSTAGRAM_ACCOUNT_ID") or os.environ.get("IG_ACCOUNT_ID")
    token = os.environ.get("INSTAGRAM_ACCESS_TOKEN") or os.environ.get("IG_ACCESS_TOKEN") or os.environ.get("META_ACCESS_TOKEN")
    return account_id, token

def upload_to_public_cdn_fallback(file_path):
    """Fallback for localhost: Uploads video or photo to public CDN (uguu.se -> litterbox) so Meta can ingest it."""
    import requests
    filename = os.path.basename(file_path)
    # Try Uguu
    try:
        with open(file_path, "rb") as f:
            r = requests.post("https://uguu.se/upload.php", files={"files[]": (filename, f)}, timeout=60)
            if r.status_code == 200:
                res = r.json()
                if res.get("success") and res.get("files"):
                    return res["files"][0]["url"]
    except Exception as e:
        print(f"Uguu upload failed ({e}), trying Litterbox...")

    # Fallback to Litterbox
    try:
        with open(file_path, "rb") as f:
            r = requests.post("https://litterbox.catbox.moe/resources/internals/api.php",
                              data={"reqtype": "fileupload", "time": "1h"},
                              files={"fileToUpload": (filename, f)}, timeout=90)
            if r.status_code == 200 and r.text.startswith("http"):
                return r.text.strip()
    except Exception as e:
        print(f"Litterbox upload failed: {e}")

    raise RuntimeError(f"Could not generate public URL for {filename}")

def get_public_url(rel_or_filename, base_request_url=""):
    """
    Returns public HTTPS URL for asset.
    If app is hosted on an HTTPS domain (e.g. Cloud Run), uses direct domain URL.
    Otherwise uses public CDN fallback.
    """
    filename = os.path.basename(rel_or_filename)
    local_path = os.path.join(UPLOAD_DIR, filename)

    # Check custom BASE_MEDIA_URL or DASHBOARD_URL
    base_env = os.environ.get("BASE_MEDIA_URL") or os.environ.get("DASHBOARD_URL", "")
    if base_env.startswith("https://"):
        return f"{base_env.rstrip('/')}/uploads/{filename}"

    if base_request_url.startswith("https://"):
        return f"{base_request_url.rstrip('/')}/uploads/{filename}"

    # If local file exists in uploads, use CDN upload fallback
    if os.path.exists(local_path):
        return upload_to_public_cdn_fallback(local_path)

    # If it is a relative or absolute path in workspace (e.g. daily_flyers/...)
    workspace_alt = os.path.join(os.path.dirname(BASE_DIR), "LaFrench", rel_or_filename.lstrip("/"))
    if os.path.exists(rel_or_filename):
        return upload_to_public_cdn_fallback(rel_or_filename)
    elif os.path.exists(workspace_alt):
        return upload_to_public_cdn_fallback(workspace_alt)
    
    # If it's already an absolute URL, return it
    if rel_or_filename.startswith("http://") or rel_or_filename.startswith("https://"):
        return rel_or_filename

    raise FileNotFoundError(f"Asset not found: {filename}")

def publish_reel_meta(video_url, caption, cover_url=None, user_tags=None, account_id=None, token=None):
    import requests
    graph_url = f"https://graph.facebook.com/v21.0/{account_id}/media"
    payload = {
        "media_type": "REELS",
        "video_url": video_url,
        "caption": caption,
        "share_to_feed": "true",
        "access_token": token
    }
    if cover_url:
        payload["cover_url"] = cover_url

    if user_tags:
        valid_tags = []
        for tag in user_tags:
            h = tag.lstrip("@").strip()
            if h:
                valid_tags.append({"username": h, "x": 0.5, "y": 0.5})
        if valid_tags:
            # Tag handles
            for tag_attempt in [valid_tags, valid_tags[:8], []]:
                if tag_attempt:
                    payload["user_tags"] = json.dumps(tag_attempt)
                else:
                    payload.pop("user_tags", None)
                r = requests.post(graph_url, data=payload, timeout=30)
                if r.status_code == 200:
                    break
            if r.status_code != 200:
                raise RuntimeError(f"Reel container creation failed: {r.text}")
    else:
        r = requests.post(graph_url, data=payload, timeout=30)
        if r.status_code != 200:
            raise RuntimeError(f"Reel container creation failed: {r.text}")

    container_id = r.json().get("id")
    if not container_id:
        raise RuntimeError(f"No container ID in response: {r.text}")

    # Poll status until FINISHED
    status_url = f"https://graph.facebook.com/v21.0/{container_id}"
    for _ in range(40):
        time.sleep(5)
        st_res = requests.get(status_url, params={"fields": "status_code", "access_token": token}, timeout=15)
        st_data = st_res.json()
        status_code = st_data.get("status_code")
        if status_code == "FINISHED":
            break
        elif status_code == "ERROR":
            raise RuntimeError(f"Meta video processing failed: {st_data}")

    # Publish
    pub_url = f"https://graph.facebook.com/v21.0/{account_id}/media_publish"
    pub_res = requests.post(pub_url, data={"creation_id": container_id, "access_token": token}, timeout=30)
    pub_data = pub_res.json()
    if pub_res.status_code != 200 or "id" not in pub_data:
        raise RuntimeError(f"Publish call failed: {pub_data}")

    return pub_data["id"]

def publish_story_meta(media_url, is_video=True, account_id=None, token=None):
    import requests
    graph_url = f"https://graph.facebook.com/v21.0/{account_id}/media"
    payload = {
        "media_type": "STORIES",
        "access_token": token
    }
    if is_video:
        payload["video_url"] = media_url
    else:
        payload["image_url"] = media_url

    r = requests.post(graph_url, data=payload, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"Story container creation failed: {r.text}")

    container_id = r.json().get("id")

    if is_video:
        status_url = f"https://graph.facebook.com/v21.0/{container_id}"
        for _ in range(40):
            time.sleep(4)
            st_res = requests.get(status_url, params={"fields": "status_code", "access_token": token}, timeout=15)
            st_data = st_res.json()
            if st_data.get("status_code") == "FINISHED":
                break
            elif st_data.get("status_code") == "ERROR":
                raise RuntimeError(f"Story video processing failed: {st_data}")

    pub_url = f"https://graph.facebook.com/v21.0/{account_id}/media_publish"
    pub_res = requests.post(pub_url, data={"creation_id": container_id, "access_token": token}, timeout=30)
    pub_data = pub_res.json()
    if pub_res.status_code != 200 or "id" not in pub_data:
        raise RuntimeError(f"Story publish failed: {pub_data}")

    return pub_data["id"]

def publish_photo_meta(image_url, caption, account_id=None, token=None):
    import requests
    graph_url = f"https://graph.facebook.com/v21.0/{account_id}/media"
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": token
    }
    r = requests.post(graph_url, data=payload, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"Photo container creation failed: {r.text}")

    container_id = r.json().get("id")
    pub_url = f"https://graph.facebook.com/v21.0/{account_id}/media_publish"
    pub_res = requests.post(pub_url, data={"creation_id": container_id, "access_token": token}, timeout=30)
    pub_data = pub_res.json()
    if pub_res.status_code != 200 or "id" not in pub_data:
        raise RuntimeError(f"Photo publish failed: {pub_data}")

    return pub_data["id"]

def execute_publish_job(post, base_request_url=""):
    logs = []
    def log(msg):
        logs.append(f"[{get_now_bcn().strftime('%H:%M:%S')}] {msg}")
        print(f"🚀 [Online Scheduler] {msg}")

    account_id, token = get_credentials()
    if not account_id or not token:
        log("Error: INSTAGRAM_ACCOUNT_ID or IG_ACCESS_TOKEN missing.")
        return False, logs

    post_type = post.get("post_type", "reel")
    caption = post.get("caption", "").strip()
    primary = post.get("primary_media")
    cover = post.get("cover_media")
    story1 = post.get("story_part1")
    story2 = post.get("story_part2")
    user_tags = post.get("user_tags", [])

    try:
        # 1. Reel
        if post_type in ["reel", "both"]:
            if not primary:
                log("Error: No primary media specified for Reel.")
                return False, logs

            log(f"Resolving public URL for Reel: {primary}...")
            video_url = get_public_url(primary, base_request_url)
            log(f"Public Video URL: {video_url}")

            cover_url = None
            if cover:
                try:
                    cover_url = get_public_url(cover, base_request_url)
                    log(f"Cover URL: {cover_url}")
                except Exception as ec:
                    log(f"Cover URL skipped: {ec}")

            log(f"Creating Reel container on Instagram Account {account_id}...")
            reel_id = publish_reel_meta(video_url, caption, cover_url, user_tags, account_id, token)
            log(f"✅ Reel successfully published! Media ID: {reel_id}")

        # 2. Photo
        elif post_type == "photo":
            if not primary:
                log("Error: No photo specified.")
                return False, logs
            image_url = get_public_url(primary, base_request_url)
            photo_id = publish_photo_meta(image_url, caption, account_id, token)
            log(f"✅ Photo successfully published! Media ID: {photo_id}")

        # 3. Stories
        if post_type in ["story_parts", "both"]:
            if story1 and story2:
                log("Publishing 2-Part Synchronized Stories...")
                log("   [1/2] Publishing Story Part 1...")
                url1 = get_public_url(story1, base_request_url)
                is_vid1 = story1.lower().endswith((".mp4", ".mov"))
                s1_id = publish_story_meta(url1, is_video=is_vid1, account_id=account_id, token=token)
                log(f"   ✅ Story Part 1 published! Media ID: {s1_id}")

                log("   ⏳ Waiting 8s for sequential Instagram ordering...")
                time.sleep(8)

                log("   [2/2] Publishing Story Part 2...")
                url2 = get_public_url(story2, base_request_url)
                is_vid2 = story2.lower().endswith((".mp4", ".mov"))
                s2_id = publish_story_meta(url2, is_video=is_vid2, account_id=account_id, token=token)
                log(f"   ✅ Story Part 2 published! Media ID: {s2_id}")

        elif post_type == "story_single":
            target = primary or story1
            if not target:
                log("Error: No media provided for single story.")
                return False, logs
            url = get_public_url(target, base_request_url)
            is_vid = target.lower().endswith((".mp4", ".mov"))
            sid = publish_story_meta(url, is_video=is_vid, account_id=account_id, token=token)
            log(f"✅ Story published! Media ID: {sid}")

        return True, logs
    except Exception as e:
        log(f"❌ Execution failed: {e}")
        return False, logs

def background_scheduler_worker():
    print("⏰ [Online Social Scheduler] Background daemon thread started...")
    while True:
        try:
            now = get_now_bcn()
            now_str = now.strftime("%Y-%m-%dT%H:%M")
            db = load_schedule_db()
            posts = db.get("posts", [])
            modified = False

            for p in posts:
                if p.get("status") == "scheduled":
                    sched_time = p.get("scheduled_time")
                    if sched_time and sched_time <= now_str:
                        p_dt = datetime.datetime.fromisoformat(sched_time)
                        now_naive = now.replace(tzinfo=None) if p_dt.tzinfo is None else now
                        diff_hours = (now_naive - p_dt).total_seconds() / 3600.0
                        if diff_hours < 24.0:
                            print(f"\n🔔 [Online Scheduler] Triggering post '{p.get('title')}' ({sched_time})...")
                            p["status"] = "publishing"
                            save_schedule_db(db)

                            success, logs = execute_publish_job(p)
                            p["status"] = "published" if success else "failed"
                            p["logs"] = logs
                            p["published_at"] = get_now_bcn().isoformat()
                            modified = True
                        else:
                            p["status"] = "expired"
                            modified = True

            if modified:
                save_schedule_db(db)
        except Exception as e:
            print(f"⚠️ [Online Scheduler Worker] Error: {e}")

        time.sleep(20)

# Blueprint & Route Setup
bp = Blueprint('instagram_scheduler', __name__)

@bp.route('/api/upload-media', methods=['POST'])
def upload_media():
    """Handles direct browser drag-and-drop media uploads."""
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "Empty filename"}), 400

    filename = secure_filename(file.filename)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_filename = f"{timestamp}_{filename}"
    save_path = os.path.join(UPLOAD_DIR, saved_filename)
    file.save(save_path)

    file_size_mb = round(os.path.getsize(save_path) / (1024 * 1024), 2)
    is_video = filename.lower().endswith((".mp4", ".mov", ".m4v"))

    return jsonify({
        "success": True,
        "url": f"/uploads/{saved_filename}",
        "filename": saved_filename,
        "size_mb": file_size_mb,
        "is_video": is_video
    })

@bp.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    """Serves uploaded media with HTTP Range support for video scrubbing."""
    safe_name = secure_filename(os.path.basename(filename))
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    if not os.path.exists(file_path):
        return "File not found", 404

    file_size = os.path.getsize(file_path)
    mime_type, _ = mimetypes.guess_type(file_path)
    mime_type = mime_type or "application/octet-stream"

    range_header = request.headers.get("Range", None)
    if range_header and range_header.startswith("bytes="):
        byte_range = range_header[6:].split("-")
        start = int(byte_range[0]) if byte_range[0] else 0
        end = int(byte_range[1]) if byte_range[1] else file_size - 1
        if start >= file_size:
            return "Requested Range Not Satisfiable", 416
        length = end - start + 1

        with open(file_path, "rb") as f:
            f.seek(start)
            data = f.read(length)

        resp = Response(data, 206, mimetype=mime_type)
        resp.headers.add("Content-Range", f"bytes {start}-{end}/{file_size}")
        resp.headers.add("Accept-Ranges", "bytes")
        resp.headers.add("Content-Length", str(length))
        return resp
    else:
        return send_file(file_path, mimetype=mime_type)

@bp.route('/api/schedule', methods=['GET'])
def get_schedule():
    db = load_schedule_db()
    return jsonify(db)

@bp.route('/api/schedule', methods=['POST'])
def save_schedule():
    data = request.json or {}
    post_id = data.get("id") or f"post_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.urandom(2).hex()}"
    data["id"] = post_id
    data["updated_at"] = get_now_bcn().isoformat()
    if "created_at" not in data:
        data["created_at"] = get_now_bcn().isoformat()
    if "status" not in data:
        data["status"] = "scheduled"

    db = load_schedule_db()
    posts = db.get("posts", [])
    idx = next((i for i, p in enumerate(posts) if p.get("id") == post_id), None)
    if idx is not None:
        posts[idx] = data
    else:
        posts.append(data)

    posts.sort(key=lambda x: x.get("scheduled_time", ""))
    db["posts"] = posts
    save_schedule_db(db)
    return jsonify({"success": True, "post": data})

@bp.route('/api/schedule/<post_id>', methods=['DELETE'])
def delete_schedule(post_id):
    db = load_schedule_db()
    posts = [p for p in db.get("posts", []) if p.get("id") != post_id]
    db["posts"] = posts
    save_schedule_db(db)
    return jsonify({"success": True, "deleted_id": post_id})

@bp.route('/api/publish-now', methods=['POST'])
def publish_now():
    data = request.json or {}
    post_id = data.get("id")
    db = load_schedule_db()
    posts = db.get("posts", [])
    target = next((p for p in posts if p.get("id") == post_id), None) or data

    target["status"] = "publishing"
    save_schedule_db(db)

    base_url = request.host_url.rstrip('/')
    success, logs = execute_publish_job(target, base_url)
    target["status"] = "published" if success else "failed"
    target["logs"] = logs
    target["published_at"] = get_now_bcn().isoformat()
    save_schedule_db(db)

    return jsonify({"success": success, "logs": logs, "post": target})

@bp.route('/api/schedule/status', methods=['GET'])
def scheduler_status():
    account_id, token = get_credentials()
    db = load_schedule_db()
    scheduled_count = sum(1 for p in db.get("posts", []) if p.get("status") == "scheduled")
    published_count = sum(1 for p in db.get("posts", []) if p.get("status") == "published")
    return jsonify({
        "server_time_bcn": get_now_bcn().strftime("%Y-%m-%d %H:%M:%S"),
        "account_id": f"{account_id[:6]}...{account_id[-4:]}" if account_id and len(account_id) > 10 else (account_id or "Not Configured"),
        "has_token": bool(token),
        "scheduled_count": scheduled_count,
        "published_count": published_count,
        "daemon_running": True
    })

def register_instagram_scheduler(app):
    app.register_blueprint(bp)
    daemon = threading.Thread(target=background_scheduler_worker, daemon=True)
    daemon.start()


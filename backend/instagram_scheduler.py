import os
import json
import time
import datetime
import threading
import mimetypes
import urllib.request
import urllib.parse
import re
import random
import requests
from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, jsonify, request, send_file, Response
from werkzeug.utils import secure_filename

def parse_iso_timestamp(ts_str):
    """Robust ISO 8601 parser supporting +0000, +00:00, and Z across all Python versions."""
    if not ts_str:
        return None
    s = str(ts_str).strip().replace("Z", "+00:00")
    if re.match(r'.*[+-]\d{4}$', s):
        s = s[:-2] + ':' + s[-2:]
    try:
        return datetime.datetime.fromisoformat(s)
    except Exception:
        return None

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
GCS_BUCKET = os.environ.get("GCS_BUCKET", "promotersdashboard-optimal-relic-data")
_GCS_STATE = {
    "bucket_ok": None,
    "bucket_checked_at": 0.0,
    "project_id": None,
    "last_error": None,
}

def _load_git_seed_data():
    try:
        if os.path.exists(SCHEDULE_DB_PATH):
            with open(SCHEDULE_DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {"posts": []}

_GIT_SEED_DATA = _load_git_seed_data()

def get_gcp_token():
    """Fetches GCP Service Account token from metadata server when running inside Cloud Run."""
    try:
        r = requests.get(
            "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
            headers={"Metadata-Flavor": "Google"},
            timeout=1.5
        )
        if r.status_code == 200:
            return r.json().get("access_token")
    except Exception:
        pass
    return None

def get_gcp_project_id():
    if _GCS_STATE["project_id"]:
        return _GCS_STATE["project_id"]
    try:
        r = requests.get(
            "http://metadata.google.internal/computeMetadata/v1/project/project-id",
            headers={"Metadata-Flavor": "Google"},
            timeout=1.5
        )
        if r.status_code == 200 and r.text.strip():
            _GCS_STATE["project_id"] = r.text.strip()
            return _GCS_STATE["project_id"]
    except Exception:
        pass
    return os.environ.get("GOOGLE_CLOUD_PROJECT") or "optimal-relic-482522-d0"

def ensure_gcs_bucket(gcp_token):
    if not gcp_token or not GCS_BUCKET:
        return False
    now_ts = time.time()
    if _GCS_STATE["bucket_ok"] is True:
        return True
    if _GCS_STATE["bucket_ok"] is False and (now_ts - _GCS_STATE["bucket_checked_at"]) < 60:
        return False
    _GCS_STATE["bucket_checked_at"] = now_ts
    try:
        r = requests.get(
            f"https://storage.googleapis.com/storage/v1/b/{GCS_BUCKET}",
            headers={"Authorization": f"Bearer {gcp_token}"},
            timeout=2.5
        )
        if r.status_code == 200:
            _GCS_STATE["bucket_ok"] = True
            _GCS_STATE["last_error"] = None
            return True
        if r.status_code == 404:
            project_id = get_gcp_project_id()
            cr = requests.post(
                f"https://storage.googleapis.com/storage/v1/b?project={project_id}",
                headers={"Authorization": f"Bearer {gcp_token}", "Content-Type": "application/json"},
                json={
                    "name": GCS_BUCKET,
                    "location": "EUROPE-WEST1",
                    "iamConfiguration": {"uniformBucketLevelAccess": {"enabled": True}},
                },
                timeout=4.0,
            )
            if cr.status_code in (200, 201, 409):
                _GCS_STATE["bucket_ok"] = True
                _GCS_STATE["last_error"] = None
                print(f"✅ [Online Scheduler] Created/verified GCS bucket '{GCS_BUCKET}' in {project_id}")
                return True
            _GCS_STATE["bucket_ok"] = False
            _GCS_STATE["last_error"] = f"Bucket create HTTP {cr.status_code}: {cr.text[:200]}"
            print(f"⚠️ {_GCS_STATE['last_error']}")
            return False
        _GCS_STATE["bucket_ok"] = False
        _GCS_STATE["last_error"] = f"Bucket check HTTP {r.status_code}: {r.text[:200]}"
        print(f"⚠️ {_GCS_STATE['last_error']}")
    except Exception as e:
        _GCS_STATE["bucket_ok"] = False
        _GCS_STATE["last_error"] = str(e)
        print(f"⚠️ ensure_gcs_bucket error: {e}")
    return False

def merge_schedule_data(gcs_data, seed_data):
    """Merges persisted GCS state with newly deployed git seed posts without losing published history."""
    deleted_ids = set(gcs_data.get("deleted_ids", []))
    by_id = {}
    for sp in seed_data.get("posts", []):
        pid = sp.get("id")
        if pid and pid not in deleted_ids:
            by_id[pid] = dict(sp)

    for gp in gcs_data.get("posts", []):
        pid = gp.get("id")
        if not pid:
            continue
        if pid not in by_id:
            by_id[pid] = dict(gp)
            continue
        sp = by_id[pid]
        g_status = gp.get("status")
        s_status = sp.get("status")
        if g_status == "published" and s_status == "published":
            merged = dict(gp)
            g_m = gp.get("metrics") if isinstance(gp.get("metrics"), dict) else {}
            s_m = sp.get("metrics") if isinstance(sp.get("metrics"), dict) else {}
            if (s_m.get("updated_ts") or 0) > (g_m.get("updated_ts") or 0):
                merged["metrics"] = dict(s_m)
            for k in ("media_id", "media_ids", "permalink"):
                if not merged.get(k) and sp.get(k):
                    merged[k] = sp[k]
            by_id[pid] = merged
        elif g_status == "published":
            by_id[pid] = dict(gp)
        elif s_status == "published":
            by_id[pid] = dict(sp)
        elif g_status == "publishing":
            by_id[pid] = dict(gp)
        else:
            if (sp.get("updated_at") or "") > (gp.get("updated_at") or ""):
                by_id[pid] = dict(sp)
            else:
                by_id[pid] = dict(gp)

    posts = sorted(by_id.values(), key=lambda x: x.get("scheduled_time", ""))
    res = {"posts": posts}
    if deleted_ids:
        res["deleted_ids"] = sorted(deleted_ids)
    return res

def get_now_bcn():
    if ZoneInfo:
        try:
            return datetime.datetime.now(ZoneInfo("Europe/Madrid"))
        except Exception:
            pass
    return datetime.datetime.now()

def load_schedule_db():
    with LOCK:
        # 1. Try remote GCS if on Cloud Run
        gcp_token = get_gcp_token()
        if gcp_token and GCS_BUCKET and ensure_gcs_bucket(gcp_token):
            try:
                gcs_url = f"https://storage.googleapis.com/storage/v1/b/{GCS_BUCKET}/o/instagram_schedule.json?alt=media"
                r = requests.get(gcs_url, headers={"Authorization": f"Bearer {gcp_token}"}, timeout=2.5)
                if r.status_code == 200:
                    data = merge_schedule_data(r.json(), _GIT_SEED_DATA)
                    try:
                        with open(SCHEDULE_DB_PATH, "w", encoding="utf-8") as f:
                            json.dump(data, f, indent=2)
                    except Exception:
                        pass
                    return data
                elif r.status_code == 404:
                    # Seed GCS bucket on first run
                    upload_url = f"https://storage.googleapis.com/upload/storage/v1/b/{GCS_BUCKET}/o?uploadType=media&name=instagram_schedule.json"
                    requests.post(
                        upload_url,
                        headers={"Authorization": f"Bearer {gcp_token}", "Content-Type": "application/json"},
                        data=json.dumps(_GIT_SEED_DATA),
                        timeout=3.0,
                    )
            except Exception as e:
                _GCS_STATE["last_error"] = str(e)
                print(f"⚠️ GCS load error (using local cache): {e}")

        # 2. Local fallback
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
        # 1. Save locally
        try:
            with open(SCHEDULE_DB_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving local DB: {e}")

        # 2. Sync to GCS if on Cloud Run
        gcp_token = get_gcp_token()
        if gcp_token and GCS_BUCKET and ensure_gcs_bucket(gcp_token):
            try:
                upload_url = f"https://storage.googleapis.com/upload/storage/v1/b/{GCS_BUCKET}/o?uploadType=media&name=instagram_schedule.json"
                payload = json.dumps(data)
                r = requests.post(upload_url, headers={"Authorization": f"Bearer {gcp_token}", "Content-Type": "application/json"}, data=payload, timeout=3.0)
                if r.status_code not in (200, 201):
                    _GCS_STATE["last_error"] = f"GCS save HTTP {r.status_code}: {r.text[:200]}"
                    print(f"⚠️ {_GCS_STATE['last_error']}")
            except Exception as e:
                _GCS_STATE["last_error"] = str(e)
                print(f"⚠️ GCS save error: {e}")

def acquire_publish_lock(post_id):
    """
    Acquires an atomic distributed lock for post_id across all Cloud Run instances.
    Returns (True, None) if lock acquired.
    Returns (False, reason) if post is already in-flight or completed.
    """
    now_ts = time.time()
    instance_id = os.environ.get("K_REVISION") or os.environ.get("HOSTNAME") or "local"

    # 1. Local lock check
    tmp_lock = f"/tmp/lock_{post_id}.json"
    if os.path.exists(tmp_lock):
        try:
            with open(tmp_lock, "r") as f:
                d = json.load(f)
            if d.get("status") == "completed":
                return False, f"Post already published (Media ID: {d.get('media_id')})"
            if d.get("status") == "in_flight" and (now_ts - d.get("ts", 0)) < 600:
                return False, f"Post is currently being published by instance {d.get('instance')} (started {int(now_ts - d.get('ts', 0))}s ago)"
        except Exception:
            pass

    # 2. Remote GCS lock check (Cloud Run)
    gcp_token = get_gcp_token()
    if gcp_token and GCS_BUCKET:
        try:
            lock_url = f"https://storage.googleapis.com/storage/v1/b/{GCS_BUCKET}/o/locks%2F{post_id}.json?alt=media"
            r = requests.get(lock_url, headers={"Authorization": f"Bearer {gcp_token}"}, timeout=2.0)
            if r.status_code == 200:
                d = r.json()
                if d.get("status") == "completed":
                    return False, f"Post already published on instance {d.get('instance')} (Media ID: {d.get('media_id')})"
                if d.get("status") == "in_flight" and (now_ts - d.get("ts", 0)) < 600:
                    return False, f"Post is currently being published by instance {d.get('instance')} (started {int(now_ts - d.get('ts', 0))}s ago)"

            # Write lock to GCS
            upload_url = f"https://storage.googleapis.com/upload/storage/v1/b/{GCS_BUCKET}/o?uploadType=media&name=locks/{post_id}.json"
            lock_payload = json.dumps({"status": "in_flight", "ts": now_ts, "instance": instance_id})
            requests.post(upload_url, headers={"Authorization": f"Bearer {gcp_token}", "Content-Type": "application/json"}, data=lock_payload, timeout=2.5)
        except Exception as e:
            print(f"⚠️ GCS acquire lock error: {e}")

    # Write local lock
    try:
        with open(tmp_lock, "w") as f:
            json.dump({"status": "in_flight", "ts": now_ts, "instance": instance_id}, f)
    except Exception:
        pass

    return True, None

def release_publish_lock(post_id, media_id=None, success=True):
    now_ts = time.time()
    instance_id = os.environ.get("K_REVISION") or os.environ.get("HOSTNAME") or "local"
    status = "completed" if success else "failed"

    # Local release
    tmp_lock = f"/tmp/lock_{post_id}.json"
    try:
        with open(tmp_lock, "w") as f:
            json.dump({"status": status, "ts": now_ts, "instance": instance_id, "media_id": media_id}, f)
    except Exception:
        pass

    # Remote release
    gcp_token = get_gcp_token()
    if gcp_token and GCS_BUCKET:
        try:
            upload_url = f"https://storage.googleapis.com/upload/storage/v1/b/{GCS_BUCKET}/o?uploadType=media&name=locks/{post_id}.json"
            lock_payload = json.dumps({"status": status, "ts": now_ts, "instance": instance_id, "media_id": media_id})
            requests.post(upload_url, headers={"Authorization": f"Bearer {gcp_token}", "Content-Type": "application/json"}, data=lock_payload, timeout=2.5)
        except Exception as e:
            print(f"⚠️ GCS release lock error: {e}")

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

def publish_carousel_meta(items_urls, caption, account_id=None, token=None):
    import requests, time
    graph_url = f"https://graph.facebook.com/v21.0/{account_id}/media"
    item_ids = []
    for url in items_urls:
        is_video = url.lower().endswith((".mp4", ".mov"))
        payload = {
            "is_carousel_item": "true",
            "access_token": token
        }
        if is_video:
            payload["media_type"] = "VIDEO"
            payload["video_url"] = url
        else:
            payload["image_url"] = url
        r = requests.post(graph_url, data=payload, timeout=30)
        if r.status_code != 200:
            raise RuntimeError(f"Carousel item container failed for {url}: {r.text}")
        item_ids.append(r.json().get("id"))
    
    # Create Carousel Container
    carousel_payload = {
        "media_type": "CAROUSEL",
        "children": ",".join(item_ids),
        "caption": caption,
        "access_token": token
    }
    cr = requests.post(graph_url, data=carousel_payload, timeout=30)
    if cr.status_code != 200:
        raise RuntimeError(f"Carousel container creation failed: {cr.text}")
    carousel_container_id = cr.json().get("id")

    # Wait 5 seconds for child containers to process
    time.sleep(5)

    # Publish Carousel
    pub_url = f"https://graph.facebook.com/v21.0/{account_id}/media_publish"
    pub_res = requests.post(pub_url, data={"creation_id": carousel_container_id, "access_token": token}, timeout=30)
    pub_data = pub_res.json()
    if pub_res.status_code != 200 or "id" not in pub_data:
        raise RuntimeError(f"Carousel publish failed: {pub_data}")
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

def check_duplicate_reel_on_instagram(caption, account_id, token):
    """Checks if a reel with similar caption was already published in the last 24 hours on Instagram."""
    try:
        import requests
        url = f"https://graph.facebook.com/v21.0/{account_id}/media"
        r = requests.get(url, params={"fields": "id,caption,timestamp,media_product_type", "limit": 25, "access_token": token}, timeout=15)
        if r.status_code == 200:
            data = r.json().get("data", [])
            cap_prefix = caption.strip()[:40].lower() if caption else ""
            now = datetime.datetime.now(datetime.timezone.utc)
            for m in data:
                m_prod = m.get("media_product_type", "")
                if m_prod in ["REELS", "FEED", "VIDEO"]:
                    ts_str = m.get("timestamp")
                    if ts_str:
                        m_dt = parse_iso_timestamp(ts_str)
                        if m_dt:
                            hours_ago = (now - m_dt).total_seconds() / 3600.0
                            if hours_ago < 24.0:
                                m_cap = (m.get("caption") or "").strip()[:40].lower()
                                if cap_prefix and len(cap_prefix) > 10 and (cap_prefix in m_cap or m_cap in cap_prefix):
                                    return m.get("id")
    except Exception as e:
        print(f"Error checking duplicate: {e}")
    return None

def check_duplicate_stories_on_instagram(account_id, token, min_minutes=2):
    """Checks if stories were already published on Instagram within min_minutes ago."""
    try:
        import requests
        url = f"https://graph.facebook.com/v21.0/{account_id}/stories"
        r = requests.get(url, params={"fields": "id,timestamp", "limit": 10, "access_token": token}, timeout=15)
        if r.status_code == 200:
            data = r.json().get("data", [])
            now = datetime.datetime.now(datetime.timezone.utc)
            for s in data:
                ts_str = s.get("timestamp")
                if ts_str:
                    s_dt = parse_iso_timestamp(ts_str)
                    if s_dt:
                        mins_ago = (now - s_dt).total_seconds() / 60.0
                        if mins_ago < min_minutes:
                            return s.get("id")
    except Exception:
        pass
    return None

def execute_publish_job(post, base_request_url=""):
    logs = []
    def log(msg):
        logs.append(f"[{get_now_bcn().strftime('%H:%M:%S')}] {msg}")
        print(f"🚀 [Online Scheduler] {msg}")

    post_id = post.get("id") or "unknown"

    # Step 0: Atomic Distributed In-Flight Lock Check
    acquired, lock_reason = acquire_publish_lock(post_id)
    if not acquired:
        log(f"🛡️ [Deduplication Guard] Skipped: {lock_reason}")
        return True, logs

    account_id, token = get_credentials()
    if not account_id or not token:
        release_publish_lock(post_id, success=False)
        log("Error: INSTAGRAM_ACCOUNT_ID or IG_ACCESS_TOKEN missing.")
        return False, logs

    post_type = post.get("post_type", "reel")
    caption = post.get("caption", "").strip()
    primary = post.get("primary_media")
    cover = post.get("cover_media")
    story1 = post.get("story_part1")
    story2 = post.get("story_part2")
    user_tags = post.get("user_tags", [])
    published_media_id = None

    try:
        # 1. Reel
        if post_type in ["reel", "both"]:
            dup_id = check_duplicate_reel_on_instagram(caption, account_id, token)
            if dup_id:
                published_media_id = dup_id
                log(f"⚠️ Deduplication Guard: Reel already live on Instagram! (Media ID: {dup_id}). Skipping duplicate publish.")
            else:
                if not primary:
                    log("Error: No primary media specified for Reel.")
                    release_publish_lock(post_id, success=False)
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
                published_media_id = reel_id
                log(f"✅ Reel successfully published! Media ID: {reel_id}")

        # 2. Photo
        elif post_type == "photo":
            if not primary:
                log("Error: No photo specified.")
                release_publish_lock(post_id, success=False)
                return False, logs
            image_url = get_public_url(primary, base_request_url)
            photo_id = publish_photo_meta(image_url, caption, account_id, token)
            published_media_id = photo_id
            log(f"✅ Photo successfully published! Media ID: {photo_id}")

        # 3. Carousel (Multiple Slides)
        elif post_type == "carousel":
            items = post.get("carousel_items") or []
            if not items and primary:
                items = [primary]
            if not items:
                log("Error: No items provided for Carousel.")
                release_publish_lock(post_id, success=False)
                return False, logs
            log(f"Publishing Carousel with {len(items)} slides...")
            pub_urls = [get_public_url(x, base_request_url) for x in items]
            cid = publish_carousel_meta(pub_urls, caption, account_id, token)
            published_media_id = cid
            log(f"✅ Carousel successfully published! Media ID: {cid}")

        # 4. Stories
        if post_type in ["story_parts", "both"]:
            dup_s_id = check_duplicate_stories_on_instagram(account_id, token, min_minutes=2)
            if dup_s_id:
                published_media_id = dup_s_id
                log(f"⚠️ Deduplication Guard: Stories were already published within last 2m (Media ID: {dup_s_id}). Skipping duplicate publish.")
            elif story1 and story2:
                log("Publishing 2-Part Synchronized Stories...")
                log("   [1/2] Publishing Story Part 1...")
                url1 = get_public_url(story1, base_request_url)
                is_vid1 = story1.lower().endswith((".mp4", ".mov"))
                s1_id = publish_story_meta(url1, is_video=is_vid1, account_id=account_id, token=token)
                published_media_id = s1_id
                log(f"   ✅ Story Part 1 published! Media ID: {s1_id}")

                log("   ⏳ Waiting 8s for sequential Instagram ordering...")
                time.sleep(8)

                log("   [2/2] Publishing Story Part 2...")
                url2 = get_public_url(story2, base_request_url)
                is_vid2 = story2.lower().endswith((".mp4", ".mov"))
                s2_id = publish_story_meta(url2, is_video=is_vid2, account_id=account_id, token=token)
                published_media_id = s2_id
                log(f"   ✅ Story Part 2 published! Media ID: {s2_id}")

        elif post_type == "story_single":
            dup_s_id = check_duplicate_stories_on_instagram(account_id, token, min_minutes=2)
            if dup_s_id:
                published_media_id = dup_s_id
                post["media_id"] = dup_s_id
                log(f"⚠️ Deduplication Guard: A story was already published within last 2m (Media ID: {dup_s_id}). Skipping duplicate publish.")
                release_publish_lock(post_id, media_id=dup_s_id, success=True)
                return True, logs
            target = primary or story1
            if not target:
                log("Error: No media provided for single story.")
                release_publish_lock(post_id, success=False)
                return False, logs
            url = get_public_url(target, base_request_url)
            is_vid = target.lower().endswith((".mp4", ".mov"))
            sid = publish_story_meta(url, is_video=is_vid, account_id=account_id, token=token)
            published_media_id = sid
            log(f"✅ Story published! Media ID: {sid}")

        found_mids = list(dict.fromkeys(re.findall(r"Media ID:\s*(\d+)", "\n".join(logs))))
        if published_media_id and published_media_id not in found_mids:
            found_mids.append(published_media_id)
        if published_media_id:
            post["media_id"] = published_media_id
        elif found_mids:
            post["media_id"] = found_mids[-1]
        if found_mids:
            post["media_ids"] = found_mids

        release_publish_lock(post_id, media_id=post.get("media_id"), success=True)
        return True, logs
    except Exception as e:
        release_publish_lock(post_id, success=False)
        log(f"❌ Execution failed: {e}")
        return False, logs

def is_placeholder_post(post):
    if not post:
        return False
    if post.get("status") == "placeholder" or post.get("is_placeholder") is True:
        return True
    title_u = (post.get("title") or "").upper()
    cap_u = (post.get("caption") or "").upper()
    return "PLACEHOLDER" in title_u or "PLACEHOLDER" in cap_u

def reconcile_schedule_with_meta(db):
    """Reconciles past/pending scheduled or missed posts with live Instagram media & publish locks."""
    changed = False
    posts = db.get("posts", [])
    candidates = [
        p for p in posts
        if p.get("status") in ("scheduled", "missed", "failed", "publishing")
        and not is_placeholder_post(p)
    ]
    if not candidates:
        return False

    gcp_token = get_gcp_token()
    bcn_tz = ZoneInfo("Europe/Madrid") if ZoneInfo else datetime.timezone(datetime.timedelta(hours=1))

    # 1. Recover from local / GCS completion locks (covers stories as well as reels)
    for p in candidates:
        pid = p.get("id")
        if not pid:
            continue
        lock_data = None
        tmp_lock = f"/tmp/lock_{pid}.json"
        if os.path.exists(tmp_lock):
            try:
                with open(tmp_lock, "r", encoding="utf-8") as f:
                    lock_data = json.load(f)
            except Exception:
                pass
        if (not lock_data or lock_data.get("status") != "completed") and gcp_token and GCS_BUCKET and ensure_gcs_bucket(gcp_token):
            try:
                r = requests.get(
                    f"https://storage.googleapis.com/storage/v1/b/{GCS_BUCKET}/o/locks%2F{pid}.json?alt=media",
                    headers={"Authorization": f"Bearer {gcp_token}"},
                    timeout=2.0,
                )
                if r.status_code == 200:
                    lock_data = r.json()
            except Exception:
                pass
        if lock_data and lock_data.get("status") == "completed":
            p["status"] = "published"
            if lock_data.get("media_id"):
                p["media_id"] = lock_data["media_id"]
            p["published_at"] = p.get("published_at") or get_now_bcn().isoformat()
            p["logs"] = [f"🔄 Restored published state from completion lock (Media ID: {lock_data.get('media_id')})"]
            changed = True

    # 2. Recover feed/reel/carousel posts by matching Meta Graph API /{account_id}/media
    feed_candidates = [
        p for p in candidates
        if p.get("status") != "published"
        and p.get("post_type") in ("reel", "both", "photo", "carousel")
    ]
    if feed_candidates:
        account_id, token = get_credentials()
        if account_id and token:
            try:
                r = requests.get(
                    f"https://graph.facebook.com/v21.0/{account_id}/media",
                    params={"fields": "id,caption,timestamp,media_product_type,permalink", "limit": 30, "access_token": token},
                    timeout=10,
                )
                if r.status_code == 200:
                    ig_media = r.json().get("data", [])
                    for p in feed_candidates:
                        sched_dt = parse_iso_timestamp(p.get("scheduled_time"))
                        if not sched_dt:
                            continue
                        if sched_dt.tzinfo is None:
                            sched_dt = sched_dt.replace(tzinfo=bcn_tz)
                        cap_prefix = re.sub(r"\s+", " ", (p.get("caption") or "").strip()).lower()[:35]
                        if len(cap_prefix) < 12:
                            continue
                        for m in ig_media:
                            m_dt = parse_iso_timestamp(m.get("timestamp"))
                            if not m_dt:
                                continue
                            delta_sec = (m_dt.astimezone(datetime.timezone.utc) - sched_dt.astimezone(datetime.timezone.utc)).total_seconds()
                            if -7200 <= delta_sec <= 43200:
                                m_cap = re.sub(r"\s+", " ", (m.get("caption") or "").strip()).lower()
                                if cap_prefix in m_cap:
                                    p["status"] = "published"
                                    p["media_id"] = m.get("id")
                                    if m.get("permalink"):
                                        p["permalink"] = m["permalink"]
                                    p["published_at"] = m.get("timestamp")
                                    p["logs"] = [f"🔄 Reconciled from Meta Graph API: Already live on Instagram (Media ID: {m.get('id')})"]
                                    changed = True
                                    break
            except Exception as e:
                print(f"⚠️ Meta reconciliation error: {e}")

    return changed

def _extract_media_ids(post):
    """Collects unique Instagram numeric media IDs stored on the post or inside publish logs."""
    mids = []
    for raw in list(post.get("media_ids") or []) + ([post.get("media_id")] if post.get("media_id") else []):
        s = str(raw).strip()
        if s.isdigit() and s not in mids:
            mids.append(s)
    for m in re.findall(r"Media ID:\s*(\d+)", "\n".join(post.get("logs") or [])):
        if m not in mids:
            mids.append(m)
    return mids

def fetch_media_metrics_meta(media_id, token):
    """Fetches views, reach, likes, comments and permalink for one IG media object.

    Returns (metrics_dict_or_None, expired_bool).
    """
    if not media_id or not token:
        return None, False
    try:
        r = requests.get(
            f"https://graph.facebook.com/v21.0/{media_id}",
            params={"fields": "id,like_count,comments_count,permalink", "access_token": token},
            timeout=10,
        )
        if r.status_code in (400, 404):
            return None, True
        if r.status_code != 200:
            return None, False
        meta = r.json()
        likes = int(meta.get("like_count") or 0)
        comments = int(meta.get("comments_count") or 0)
        permalink = meta.get("permalink") or ""

        views = 0
        reach = 0
        ir = requests.get(
            f"https://graph.facebook.com/v21.0/{media_id}/insights",
            params={"metric": "reach,views", "access_token": token},
            timeout=10,
        )
        if ir.status_code == 200:
            for item in ir.json().get("data", []):
                name = item.get("name")
                vals = item.get("values") or []
                val = int((vals[0] or {}).get("value") or 0) if vals else 0
                if name == "views":
                    views = val
                elif name == "reach":
                    reach = val

        return {
            "views": views,
            "likes": likes,
            "reach": reach,
            "comments": comments,
            "permalink": permalink,
        }, False
    except Exception as e:
        print(f"⚠️ Metric fetch failed for {media_id}: {e}")
        return None, False

def _refresh_single_post_metrics(post, token):
    """Fetches latest Meta insights for a published post, preserving cached values if expired."""
    mids = _extract_media_ids(post)
    if not mids:
        return False
    changed = False
    if not post.get("media_id"):
        post["media_id"] = mids[-1]
        changed = True
    if post.get("media_ids") != mids:
        post["media_ids"] = mids
        changed = True

    agg = {"views": 0, "likes": 0, "reach": 0, "comments": 0, "permalink": ""}
    fetched_any = False
    saw_expired = False
    for mid in mids:
        data, expired = fetch_media_metrics_meta(mid, token)
        if data:
            fetched_any = True
            agg["views"] += data["views"]
            agg["likes"] += data["likes"]
            agg["reach"] += data["reach"]
            agg["comments"] += data["comments"]
            if not agg["permalink"] and data.get("permalink"):
                agg["permalink"] = data["permalink"]
        elif expired:
            saw_expired = True

    if not fetched_any:
        if saw_expired and not post.get("metrics_expired"):
            post["metrics_expired"] = True
            changed = True
        return changed

    existing_permalink = post.get("permalink") or (post.get("metrics") or {}).get("permalink") or ""
    permalink = agg["permalink"] or existing_permalink
    post["metrics"] = {
        "views": agg["views"],
        "likes": agg["likes"],
        "reach": agg["reach"],
        "comments": agg["comments"],
        "permalink": permalink,
        "updated_ts": int(time.time()),
        "updated_at": get_now_bcn().isoformat(),
    }
    if permalink:
        post["permalink"] = permalink
    post.pop("metrics_expired", None)
    return True

def compute_published_totals(posts):
    """Aggregates cached views, likes, reach and comments across all published posts."""
    totals = {
        "total_views": 0,
        "total_likes": 0,
        "total_reach": 0,
        "total_comments": 0,
        "published_count": 0,
        "tracked_count": 0,
        "last_updated_ts": 0,
    }
    for p in posts or []:
        if p.get("status") != "published":
            continue
        totals["published_count"] += 1
        m = p.get("metrics")
        if isinstance(m, dict):
            totals["tracked_count"] += 1
            totals["total_views"] += int(m.get("views") or 0)
            totals["total_likes"] += int(m.get("likes") or 0)
            totals["total_reach"] += int(m.get("reach") or 0)
            totals["total_comments"] += int(m.get("comments") or 0)
            totals["last_updated_ts"] = max(totals["last_updated_ts"], int(m.get("updated_ts") or 0))
    return totals

def refresh_published_metrics(db, ttl_seconds=600, force=False):
    """Refreshes stale published post metrics in parallel and persists changes if any."""
    _, token = get_credentials()
    posts = db.get("posts", [])
    if not token:
        return False, compute_published_totals(posts)

    now_ts = int(time.time())
    targets = []
    for p in posts:
        if p.get("status") != "published":
            continue
        if not force and p.get("metrics_expired"):
            continue
        m = p.get("metrics") if isinstance(p.get("metrics"), dict) else {}
        if force or (now_ts - int(m.get("updated_ts") or 0) >= ttl_seconds):
            targets.append(p)

    changed = False
    if targets:
        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(lambda post: _refresh_single_post_metrics(post, token), targets))
        changed = any(results)
        if changed:
            save_schedule_db(db)

    return changed, compute_published_totals(posts)

def background_scheduler_worker():
    print("⏰ [Online Social Scheduler] Background daemon thread started...")
    did_startup_reconcile = False
    last_metrics_sync_ts = 0
    while True:
        try:
            # Randomized jitter so two parallel containers during deployment do not collide
            time.sleep(random.uniform(0.5, 3.5))

            now = get_now_bcn()
            now_str = now.strftime("%Y-%m-%dT%H:%M")
            db = load_schedule_db()
            posts = db.get("posts", [])
            modified = False
            checked_meta_this_cycle = False

            if not did_startup_reconcile:
                if reconcile_schedule_with_meta(db):
                    modified = True
                did_startup_reconcile = True
                checked_meta_this_cycle = True

            for p in posts:
                if is_placeholder_post(p):
                    continue
                if p.get("status") == "scheduled":
                    sched_time = p.get("scheduled_time")
                    if sched_time and sched_time <= now_str:
                        p_dt = parse_iso_timestamp(sched_time)
                        if p_dt:
                            now_naive = now.replace(tzinfo=None) if p_dt.tzinfo is None else now
                            diff_sec = (now_naive - p_dt).total_seconds()
                            # STRICT 5-MINUTE WINDOW (0 to 300 seconds late)
                            # NEVER auto-publish late/outdated posts (protects Instagram algorithm and reach)
                            if 0 <= diff_sec <= 300:
                                print(f"\n🔔 [Online Scheduler] Triggering post '{p.get('title')}' ({sched_time})...")
                                p["status"] = "publishing"
                                save_schedule_db(db)

                                success, logs = execute_publish_job(p)
                                p["status"] = "published" if success else "failed"
                                p["logs"] = logs
                                p["published_at"] = get_now_bcn().isoformat()
                                modified = True
                            elif diff_sec > 300:
                                # Double-check Meta & GCS locks before marking missed
                                if not checked_meta_this_cycle:
                                    checked_meta_this_cycle = True
                                    if reconcile_schedule_with_meta(db):
                                        modified = True
                                    if p.get("status") == "published":
                                        continue
                                # Over 5 minutes late: mark MISSED, do NOT publish late
                                print(f"⚠️ [Online Scheduler] Post '{p.get('title')}' is {int(diff_sec/60)} minutes late. Marked as missed to protect algorithm.")
                                p["status"] = "missed"
                                p["logs"] = [f"⚠️ Missed Window: Scheduled for {sched_time}, current time is {now_str} ({int(diff_sec/60)}m late). Auto-publish cancelled to protect Instagram algorithm."]
                                modified = True

            if modified:
                save_schedule_db(db)

            # Snapshot metrics every 15 minutes so ephemeral Stories are preserved before 24h expiry
            if time.time() - last_metrics_sync_ts >= 900:
                last_metrics_sync_ts = time.time()
                refresh_published_metrics(db, ttl_seconds=900, force=False)
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
    import re, glob
    safe_name = secure_filename(os.path.basename(filename))
    clean_name = re.sub(r'^\d{8}_\d{6}_', '', safe_name)

    search_dirs = [
        UPLOAD_DIR,
        os.path.join(BASE_DIR, 'uploads'),
        os.path.join(BASE_DIR, 'backend', 'uploads')
    ]

    file_path = None
    for d in search_dirs:
        if not os.path.isdir(d):
            continue
        # Exact name match
        for candidate in [safe_name, clean_name]:
            p = os.path.join(d, candidate)
            if os.path.isfile(p):
                file_path = p
                break
        if file_path:
            break
        # Glob fallback (match stripped name)
        matches = glob.glob(os.path.join(d, f"*{clean_name}"))
        if matches:
            file_path = matches[0]
            break

    if not file_path or not os.path.exists(file_path):
        return "File not found", 404

    mime_type, _ = mimetypes.guess_type(file_path)
    mime_type = mime_type or "application/octet-stream"

    # Flask's send_file supports conditional range requests natively in Werkzeug without duplicate Content-Length headers
    resp = send_file(file_path, mimetype=mime_type, conditional=True)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Range, Content-Type, Accept'
    resp.headers['Accept-Ranges'] = 'bytes'
    return resp

@bp.route('/api/schedule', methods=['GET'])
def get_schedule():
    db = load_schedule_db()
    db["published_totals"] = compute_published_totals(db.get("posts", []))
    return jsonify(db)

@bp.route('/api/schedule/metrics', methods=['GET'])
def get_schedule_metrics():
    force = request.args.get("refresh") in ("1", "true", "yes")
    db = load_schedule_db()
    _, totals = refresh_published_metrics(db, ttl_seconds=120 if force else 600, force=force)
    per_post = {
        p["id"]: p.get("metrics")
        for p in db.get("posts", [])
        if p.get("status") == "published" and p.get("id")
    }
    return jsonify({
        "success": True,
        "published_totals": totals,
        "per_post": per_post,
    })

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
        existing = posts[idx]
        for keep_key in ("metrics", "media_id", "media_ids", "permalink", "logs", "published_at", "metrics_expired"):
            if keep_key not in data and keep_key in existing:
                data[keep_key] = existing[keep_key]
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
    deleted = db.setdefault("deleted_ids", [])
    if post_id not in deleted:
        deleted.append(post_id)
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
    missed_count = sum(1 for p in db.get("posts", []) if p.get("status") == "missed")
    return jsonify({
        "server_time_bcn": get_now_bcn().strftime("%Y-%m-%d %H:%M:%S"),
        "account_id": f"{account_id[:6]}...{account_id[-4:]}" if account_id and len(account_id) > 10 else (account_id or "Not Configured"),
        "has_token": bool(token),
        "scheduled_count": scheduled_count,
        "published_count": published_count,
        "missed_count": missed_count,
        "gcs_bucket": GCS_BUCKET,
        "gcs_ok": _GCS_STATE["bucket_ok"],
        "gcs_last_error": _GCS_STATE["last_error"],
        "daemon_running": True
    })

def register_instagram_scheduler(app):
    app.register_blueprint(bp)
    daemon = threading.Thread(target=background_scheduler_worker, daemon=True)
    daemon.start()


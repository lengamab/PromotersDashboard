#!/usr/bin/env python3
"""
Create CapCut project for La French Barcelona Ad
Using pycapcut for proper draft generation
"""
import os
import pycapcut as cc
from pycapcut import trange, tim

# ============================================================
# CONFIGURATION
# ============================================================
VIDEO_DIR = "/Users/brice.lengama/Documents/La French/Fourvenues API/25-07 La French (ac meta)"
DRAFTS_DIR = "/Users/brice.lengama/Movies/CapCut/User Data/Projects/com.lveditor.draft"

# Video durations (from metadata analysis, in seconds)
VIDEOS = {
    "01": {"file": "01_groupe_marche_ville [+LUMINOSITE].mov", "duration": 12.80},
    "02": {"file": "02_filles_arrivent_rue [+LUMINOSITE].mov", "duration": 15.17},
    "03": {"file": "03_file_attente_verte [+LUMINOSITE].mov", "duration": 12.66},
    "04": {"file": "04_queue_animee_hostel.mov", "duration": 33.15},
    "06": {"file": "06_couloir_neon_rouge [+CONTRASTE NEONS].mov", "duration": 11.86},
    "07": {"file": "07_ecran_led_bleu [+CONTRASTE NEONS].mov", "duration": 36.26},
    "08": {"file": "08_dj_scene_neons [+STABILISER +CONTRASTE NEONS +LUMINOSITE].mov", "duration": 20.33},
    "09": {"file": "09_portrait_mec_bar [+LUMINOSITE +CONTRASTE NEONS].mov", "duration": 20.90},
    "10": {"file": "10_dancefloor_climax [+LUMINOSITE +CONTRASTE NEONS].mov", "duration": 25.33},
}

# ============================================================
# CREATE DRAFT
# ============================================================
print("🎬 Creating CapCut project with pycapcut...")

draft_folder = cc.DraftFolder(DRAFTS_DIR)
# 1080x1920 = vertical (9:16) for Reels/Stories
script = draft_folder.create_draft("LaFrench_Ad_Samedi", 1080, 1920, allow_replace=True)

# Create tracks
script.add_track(cc.TrackType.video)  # Main video track
script.add_track(cc.TrackType.text)   # Text overlay track

# ============================================================
# ACTE 1 — L'APPEL (0-4s)
# ============================================================
print("\n📹 ACTE 1 — L'APPEL (0-4s)")

v01 = os.path.join(VIDEO_DIR, VIDEOS["01"]["file"])
v02 = os.path.join(VIDEO_DIR, VIDEOS["02"]["file"])

print(f"  Adding: {VIDEOS['01']['file']}")
seg1 = cc.VideoSegment(v01, trange("0s", "2s"))
script.add_segment(seg1)

print(f"  Adding: {VIDEOS['02']['file']}")
seg2 = cc.VideoSegment(v02, trange("2s", "2s"))
script.add_segment(seg2)

print("  📝 Text: CE SAMEDI ✨")
text1 = cc.TextSegment("✨ CE SAMEDI ✨", trange("0s", "4s"),
                        style=cc.TextStyle(size=14.0, color=(1.0, 1.0, 1.0)))
script.add_segment(text1)

# ============================================================
# ACTE 2 — L'ARRIVÉE (4-8s)
# ============================================================
print("\n📹 ACTE 2 — L'ARRIVÉE (4-8s)")

v03 = os.path.join(VIDEO_DIR, VIDEOS["03"]["file"])
v04 = os.path.join(VIDEO_DIR, VIDEOS["04"]["file"])

print(f"  Adding: {VIDEOS['03']['file']}")
seg3 = cc.VideoSegment(v03, trange("4s", "2s"))
script.add_segment(seg3)

print(f"  Adding: {VIDEOS['04']['file']}")
seg4 = cc.VideoSegment(v04, trange("6s", "2s"))
script.add_segment(seg4)

print("  📝 Text: LA PLUS GRANDE SOIRÉE FRANÇAISE 🇫🇷")
text2 = cc.TextSegment("🇫🇷 LA PLUS GRANDE SOIRÉE FRANÇAISE DE BARCELONE", 
                        trange("4s", "4s"),
                        style=cc.TextStyle(size=12.0, color=(1.0, 1.0, 1.0)))
script.add_segment(text2)

# ============================================================
# ACTE 3 — L'EXPÉRIENCE (8-14s)
# ============================================================
print("\n📹 ACTE 3 — L'EXPÉRIENCE (8-14s)")

v06 = os.path.join(VIDEO_DIR, VIDEOS["06"]["file"])
v07 = os.path.join(VIDEO_DIR, VIDEOS["07"]["file"])
v08 = os.path.join(VIDEO_DIR, VIDEOS["08"]["file"])
v10 = os.path.join(VIDEO_DIR, VIDEOS["10"]["file"])

print(f"  Adding: {VIDEOS['06']['file']}")
seg5 = cc.VideoSegment(v06, trange("8s", "1.5s"))
script.add_segment(seg5)

print(f"  Adding: {VIDEOS['07']['file']}")
seg6 = cc.VideoSegment(v07, trange("9.5s", "1.5s"))
script.add_segment(seg6)

print(f"  Adding: {VIDEOS['08']['file']}")
seg7 = cc.VideoSegment(v08, trange("11s", "1.5s"))
script.add_segment(seg7)

print(f"  Adding: {VIDEOS['10']['file']}")
seg8 = cc.VideoSegment(v10, trange("12.5s", "1.5s"))
script.add_segment(seg8)

print("  📝 Text: LA FIRA PROVENZA • 22H30")
text3 = cc.TextSegment("🔥 LA FIRA PROVENZA • 22H30", trange("8s", "6s"),
                        style=cc.TextStyle(size=12.0, color=(1.0, 1.0, 1.0)))
script.add_segment(text3)

# ============================================================
# ACTE 4 — LE CTA (14-18s)
# ============================================================
print("\n📹 ACTE 4 — LE CTA (14-18s)")

print(f"  Adding: {VIDEOS['10']['file']} (freeze)")
seg9 = cc.VideoSegment(v10, trange("14s", "2s"))
script.add_segment(seg9)

v09 = os.path.join(VIDEO_DIR, VIDEOS["09"]["file"])
print(f"  Adding: {VIDEOS['09']['file']}")
seg10 = cc.VideoSegment(v09, trange("16s", "2s"))
script.add_segment(seg10)

print("  📝 Text: À PARTIR DE 10€")
text4 = cc.TextSegment("À PARTIR DE 10€", trange("14s", "2s"),
                        style=cc.TextStyle(size=18.0, color=(1.0, 1.0, 1.0)))
script.add_segment(text4)

print("  📝 Text: RÉSERVE MAINTENANT")
text5 = cc.TextSegment("👇 RÉSERVE MAINTENANT — PLACES LIMITÉES", trange("16s", "2s"),
                        style=cc.TextStyle(size=12.0, color=(1.0, 1.0, 1.0)))
script.add_segment(text5)

# ============================================================
# SAVE
# ============================================================
print("\n💾 Saving project...")
script.save()
print("✅ Project saved successfully!")
print(f"📂 Location: {DRAFTS_DIR}/LaFrench_Ad_Samedi")
print("\n🚀 Restart CapCut to see the project!")

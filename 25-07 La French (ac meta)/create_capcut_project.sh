#!/bin/bash
# ============================================================
# CREATE CAPCUT PROJECT — "CE SAMEDI, C'EST CHEZ NOUS"
# La French Barcelona — Ad Video Template
# ============================================================

set -e

# Paths
VIDEO_DIR="/Users/brice.lengama/Documents/La French/Fourvenues API/25-07 La French (ac meta)"
PROJECT_NAME="LaFrench_Ad_Samedi"

echo "🎬 Creating CapCut project: $PROJECT_NAME"
echo "================================================"

# Step 1: Create project with the first video clip (ACTE 1 opener)
echo ""
echo "📹 ACTE 1 — L'APPEL (0-4s)"
echo "  Adding: 01_groupe_marche_ville"
capcut quickstart "$PROJECT_NAME" \
  --video "$VIDEO_DIR/01_groupe_marche_ville [+LUMINOSITE].mov" \
  --drafts "$VIDEO_DIR"

PROJECT="$VIDEO_DIR/$PROJECT_NAME"

# Trim first clip to 2s
echo "  ✂️  Trimming to 0-2s..."
FIRST_SEG=$(capcut segments "$PROJECT" --track video 2>/dev/null | python3 -c "import sys,json; segs=json.load(sys.stdin); print(segs[0]['id'])" 2>/dev/null || echo "")

if [ -n "$FIRST_SEG" ]; then
  capcut trim "$PROJECT" "$FIRST_SEG" 0s 2s
fi

# Add second clip of ACTE 1
echo "  Adding: 02_filles_arrivent_rue"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/02_filles_arrivent_rue [+LUMINOSITE].mov" \
  2s 2s

# ACTE 1 Text overlay
echo "  📝 Text: CE SAMEDI ✨"
capcut add-text "$PROJECT" 0s 4s "✨ CE SAMEDI ✨" \
  --font-size 14 \
  --color "#FFFFFF"

# ============================================================
echo ""
echo "📹 ACTE 2 — L'ARRIVÉE (4-8s)"

echo "  Adding: 03_file_attente_verte"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/03_file_attente_verte [+LUMINOSITE].mov" \
  4s 2s

echo "  Adding: 04_queue_animee_hostel"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/04_queue_animee_hostel.mov" \
  6s 2s

# ACTE 2 Text overlay
echo "  📝 Text: LA PLUS GRANDE SOIRÉE FRANÇAISE 🇫🇷"
capcut add-text "$PROJECT" 4s 4s "🇫🇷 LA PLUS GRANDE SOIRÉE FRANÇAISE DE BARCELONE" \
  --font-size 12 \
  --color "#FFFFFF"

# ============================================================
echo ""
echo "📹 ACTE 3 — L'EXPÉRIENCE (8-14s)"

echo "  Adding: 06_couloir_neon_rouge"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/06_couloir_neon_rouge [+CONTRASTE NEONS].mov" \
  8s 1.5s

echo "  Adding: 07_ecran_led_bleu"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/07_ecran_led_bleu [+CONTRASTE NEONS].mov" \
  9.5s 1.5s

echo "  Adding: 08_dj_scene_neons"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/08_dj_scene_neons [+STABILISER +CONTRASTE NEONS +LUMINOSITE].mov" \
  11s 1.5s

echo "  Adding: 10_dancefloor_climax (extended)"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/10_dancefloor_climax [+LUMINOSITE +CONTRASTE NEONS].mov" \
  12.5s 1.5s

# ACTE 3 Text overlay
echo "  📝 Text: LA FIRA PROVENZA • 22H30"
capcut add-text "$PROJECT" 8s 6s "🔥 LA FIRA PROVENZA • 22H30" \
  --font-size 12 \
  --color "#FFFFFF"

# ============================================================
echo ""
echo "📹 ACTE 4 — LE CTA (14-18s)"

echo "  Adding: 10_dancefloor_climax (freeze shot)"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/10_dancefloor_climax [+LUMINOSITE +CONTRASTE NEONS].mov" \
  14s 2s

echo "  Adding: 09_portrait_mec_bar (alt ending)"
capcut add-video "$PROJECT" \
  "$VIDEO_DIR/09_portrait_mec_bar [+LUMINOSITE +CONTRASTE NEONS].mov" \
  16s 2s

# CTA Text overlays
echo "  📝 Text: À PARTIR DE 10€"
capcut add-text "$PROJECT" 14s 2s "À PARTIR DE 10€" \
  --font-size 18 \
  --color "#FFFFFF"

echo "  📝 Text: RÉSERVE MAINTENANT"
capcut add-text "$PROJECT" 16s 2s "👇 RÉSERVE MAINTENANT — PLACES LIMITÉES" \
  --font-size 12 \
  --color "#FFFFFF"

# ============================================================
echo ""
echo "✅ Projet CapCut créé avec succès !"
echo ""
echo "📂 Emplacement: $PROJECT"
echo ""
echo "🚀 Pour ouvrir dans CapCut:"
echo "   1. Ouvre CapCut Desktop"
echo "   2. Le projet '$PROJECT_NAME' devrait apparaître dans tes drafts"
echo "   3. Si non, utilise: capcut register \"$PROJECT\" --apply"
echo ""
echo "📋 TODO dans CapCut:"
echo "   - Ajouter la musique (Afro/French Trap)"
echo "   - Ajuster les transitions (coupes sèches)"
echo "   - Augmenter luminosité sur clips marqués [+LUMINOSITE]"
echo "   - Augmenter contraste sur clips marqués [+CONTRASTE NEONS]"
echo "   - Stabiliser le clip 08_dj_scene_neons"
echo "   - Ajouter speed ramps sur les moments clés"
echo "   - Styliser les textes (Montserrat/Bebas Neue, ombre portée)"
echo "   - Exporter en 1080x1920 (9:16) pour Reels/Stories"

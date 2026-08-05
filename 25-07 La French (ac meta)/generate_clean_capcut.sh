#!/bin/bash
set -e

VIDEO_DIR="/Users/brice.lengama/Documents/La French/Fourvenues API/25-07 La French (ac meta)"

generate_variant() {
  local VARIANT_NAME=$1
  local TEXT_CTA=$2

  echo "🎬 Creating CapCut project: $VARIANT_NAME"
  
  # Remove if exists to start fresh
  rm -rf "$HOME/Movies/CapCut/User Data/Projects/com.lveditor.draft/$VARIANT_NAME"

  # 1. Quickstart (Act 1 opener)
  capcut quickstart "$VARIANT_NAME" --video "$VIDEO_DIR/converted_01.mp4" --drafts "$VIDEO_DIR" --width 1080 --height 1920

  local PROJECT="$VIDEO_DIR/$VARIANT_NAME"

  # Trim first segment
  local FIRST_SEG=$(capcut segments "$PROJECT" --track video 2>/dev/null | python3 -c "import sys,json; segs=json.load(sys.stdin); print(segs[0]['id'])" 2>/dev/null || echo "")
  if [ -n "$FIRST_SEG" ]; then
    capcut trim "$PROJECT" "$FIRST_SEG" 0s 2s
  fi

  # 2. Add remaining videos
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_02.mp4" 2s 2s --width 1080 --height 1920
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_03.mp4" 4s 2s --width 1080 --height 1920
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_06.mp4" 6s 2s --width 1080 --height 1920
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_05.mp4" 8s 1.5s --width 1080 --height 1920
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_07.mp4" 9.5s 1.5s --width 1080 --height 1920
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_08.mp4" 11s 1.5s --width 1080 --height 1920
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_10.mp4" 12.5s 1.5s --width 1080 --height 1920
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_10.mp4" 14s 2s --width 1080 --height 1920
  capcut add-video "$PROJECT" "$VIDEO_DIR/converted_09.mp4" 16s 2s --width 1080 --height 1920

  # 3. Add Texts (NO emojis to avoid white squares)
  capcut add-text "$PROJECT" 0s 4s "CE SAMEDI" --font-size 14 --color "#FFFFFF"
  capcut add-text "$PROJECT" 4s 4s "LA PLUS GRANDE SOIREE FRANCAISE DE BARCELONE" --font-size 12 --color "#FFFFFF"
  capcut add-text "$PROJECT" 8s 6s "LA FIRA VILLAROEL • 22H30" --font-size 12 --color "#FFFFFF"
  capcut add-text "$PROJECT" 14s 4s "$TEXT_CTA" --font-size 12 --color "#FFFFFF"

  # 4. Register to finalize the project
  capcut register "$PROJECT" --apply

  echo "✅ Project $VARIANT_NAME generated successfully!"
}

# Delete the broken drafts we made earlier so CapCut cleans up the index
rm -rf "$HOME/Movies/CapCut/User Data/Projects/com.lveditor.draft/LaFrench_Variant_A"
rm -rf "$HOME/Movies/CapCut/User Data/Projects/com.lveditor.draft/LaFrench_Variant_B"

# Ensure CapCut is closed so it registers successfully
echo "Closing CapCut to register drafts safely..."
pkill -f CapCut || true

generate_variant "LaFrench_Variant_A_Clean" "PASS CLASSIQUE 10€\n\nRESERVE MAINTENANT\nPLACES LIMITEES"
generate_variant "LaFrench_Variant_B_Clean" "PASS OPEN BAR 45€\n\nBOISSONS ILLIMITEES\nPLACES LIMITEES"

echo "🎉 All Done! You can now open CapCut."

#!/bin/bash
set -e

VARIANT_NAME="LaFrench_Variant_A"
VIDEO_DIR="/Users/brice.lengama/Documents/La French/Fourvenues API/25-07 La French (ac meta)"
DRAFT_DIR="$HOME/Movies/CapCut/User Data/Projects/com.lveditor.draft/$VARIANT_NAME"

# Clean
rm -rf "$DRAFT_DIR"

echo "🎬 Creating CapCut project: $VARIANT_NAME"

# 1. Quickstart (Act 1 opener)
capcut quickstart "$VARIANT_NAME" \
  --video "$VIDEO_DIR/converted_01.mp4" --force-write

# Get first segment ID and trim
FIRST_SEG=$(capcut segments "$DRAFT_DIR" --track video | python3 -c "import sys,json; segs=json.load(sys.stdin); print(segs[0]['id'])" || echo "")
if [ -n "$FIRST_SEG" ]; then
  capcut trim "$DRAFT_DIR" "$FIRST_SEG" 0s 2s
fi

# 2. Add remaining videos sequentially
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_02.mp4" 2s 2s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_03.mp4" 4s 2s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_06.mp4" 6s 2s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_05.mp4" 8s 1.5s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_07.mp4" 9.5s 1.5s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_08.mp4" 11s 1.5s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_10.mp4" 12.5s 1.5s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_10.mp4" 14s 2s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_09.mp4" 16s 2s --force-write

# 3. Add Texts
capcut add-text "$DRAFT_DIR" 0s 4s "CE SAMEDI" --font-size 14 --color "#FFFFFF" --force-write
capcut add-text "$DRAFT_DIR" 4s 4s "LA PLUS GRANDE SOIRÉE FRANÇAISE DE BARCELONE" --font-size 12 --color "#FFFFFF" --force-write
capcut add-text "$DRAFT_DIR" 8s 6s "LA FIRA VILLAROEL • 22H30" --font-size 12 --color "#FFFFFF" --force-write
capcut add-text "$DRAFT_DIR" 14s 4s "PASS CLASSIQUE 10€\n\nRÉSERVE MAINTENANT\nPLACES LIMITÉES" --font-size 12 --color "#FFFFFF" --force-write

# 4. FIX DRAFT JSON (Resolution metadata mismatch causes CapCut 8.5 to wipe the timeline)
python3 -c "
import json, os
path = os.path.expanduser('~/Movies/CapCut/User Data/Projects/com.lveditor.draft/$VARIANT_NAME/draft_content.json')
stat = os.stat(path)
with open(path, 'r') as f: data = json.load(f)

for vid in data.get('materials', {}).get('videos', []):
    vid['width'] = 1080
    vid['height'] = 1920
for can in data.get('materials', {}).get('canvases', []):
    can['width'] = 1080
    can['height'] = 1920

data['tm_duration'] = 18000000

with open(path, 'w') as f: json.dump(data, f)
os.utime(path, (stat.st_atime, stat.st_mtime))
"

echo "✅ Done! Project $VARIANT_NAME is created."

VARIANT_NAME="LaFrench_Variant_B"
DRAFT_DIR="$HOME/Movies/CapCut/User Data/Projects/com.lveditor.draft/$VARIANT_NAME"

rm -rf "$DRAFT_DIR"

echo "🎬 Creating CapCut project: $VARIANT_NAME"

capcut quickstart "$VARIANT_NAME" --video "$VIDEO_DIR/converted_01.mp4" --force-write

FIRST_SEG=$(capcut segments "$DRAFT_DIR" --track video | python3 -c "import sys,json; segs=json.load(sys.stdin); print(segs[0]['id'])" || echo "")
if [ -n "$FIRST_SEG" ]; then
  capcut trim "$DRAFT_DIR" "$FIRST_SEG" 0s 2s
fi

capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_02.mp4" 2s 2s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_03.mp4" 4s 2s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_06.mp4" 6s 2s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_05.mp4" 8s 1.5s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_07.mp4" 9.5s 1.5s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_08.mp4" 11s 1.5s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_10.mp4" 12.5s 1.5s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_10.mp4" 14s 2s --force-write
capcut add-video "$DRAFT_DIR" "$VIDEO_DIR/converted_09.mp4" 16s 2s --force-write

capcut add-text "$DRAFT_DIR" 0s 4s "CE SAMEDI" --font-size 14 --color "#FFFFFF" --force-write
capcut add-text "$DRAFT_DIR" 4s 4s "LA PLUS GRANDE SOIRÉE FRANÇAISE DE BARCELONE" --font-size 12 --color "#FFFFFF" --force-write
capcut add-text "$DRAFT_DIR" 8s 6s "LA FIRA VILLAROEL • 22H30" --font-size 12 --color "#FFFFFF" --force-write
capcut add-text "$DRAFT_DIR" 14s 4s "PASS OPEN BAR 45€\n\nBOISSONS ILLIMITÉES\nPLACES LIMITÉES" --font-size 12 --color "#FFFFFF" --force-write

python3 -c "
import json, os
path = os.path.expanduser('~/Movies/CapCut/User Data/Projects/com.lveditor.draft/$VARIANT_NAME/draft_content.json')
stat = os.stat(path)
with open(path, 'r') as f: data = json.load(f)

for vid in data.get('materials', {}).get('videos', []):
    vid['width'] = 1080
    vid['height'] = 1920
for can in data.get('materials', {}).get('canvases', []):
    can['width'] = 1080
    can['height'] = 1920

data['tm_duration'] = 18000000

with open(path, 'w') as f: json.dump(data, f)
os.utime(path, (stat.st_atime, stat.st_mtime))
"

echo "✅ Done! Project $VARIANT_NAME is created."

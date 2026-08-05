import os
import sys
from moviepy.editor import VideoFileClip, concatenate_videoclips, CompositeVideoClip, ImageClip, vfx
from PIL import Image, ImageDraw, ImageFont
import PIL
if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.Resampling.LANCZOS

from pilmoji import Pilmoji
from pilmoji.source import AppleEmojiSource

VIDEO_DIR = "/Users/brice.lengama/Documents/La French/Fourvenues API/25-07 La French (ac meta)"
OUTPUT_FILE = os.path.join(VIDEO_DIR, "LaFrench_Ad_Final.mp4")

V = {
    "01": "converted_01.mp4",
    "02": "converted_02.mp4",
    "03": "converted_03.mp4",
    "05": "converted_05.mp4",
    "06": "converted_06.mp4",
    "07": "converted_07.mp4",
    "08": "converted_08.mp4",
    "09": "converted_09.mp4",
    "10": "converted_10.mp4",
}

for k, v in V.items():
    p = os.path.join(VIDEO_DIR, v)
    if not os.path.exists(p):
        print(f"Error: Missing file {p}")
        sys.exit(1)

def create_text_image(text, size=(1080, 1920), font_size=70):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Impact.ttf", font_size)
    except:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
            
    # Calculate size using Pilmoji
    with Pilmoji(img, source=AppleEmojiSource) as pilmoji:
        bbox = pilmoji.getsize(text, font=font)
        text_w, text_h = bbox[0], bbox[1]
        
        x = (size[0] - text_w) / 2
        y = (size[1] - text_h) / 2 + 300
        
        # Shadow/Outline
        outline_color = (0, 0, 0, 255)
        for offset_x in [-4, 0, 4]:
            for offset_y in [-4, 0, 4]:
                pilmoji.text((x + offset_x, y + offset_y), text, font=font, fill=outline_color)
                
        # Main text
        pilmoji.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    
    temp_path = f"/tmp/text_{hash(text)}.png"
    img.save(temp_path)
    return temp_path

def get_clip(key, start, duration):
    path = os.path.join(VIDEO_DIR, V[key])
    clip = VideoFileClip(path).subclip(start, start + duration)
    clip = clip.resize(height=1920, width=1080)
    return clip

# Helper to animate text (fade in and slight slide up)
def animate_text(img_path, duration):
    # Slide up animation: y goes from 'center'+50 to 'center'
    # Actually, MoviePy v1 has set_position(lambda t: ('center', 1000 - int(20*t)))
    # Let's just do a simple fadein and a subtle scale or position change
    clip = ImageClip(img_path).set_duration(duration)
    # Basic fade in and fade out
    clip = clip.crossfadein(0.5).crossfadeout(0.5)
    # Slight slide up
    clip = clip.set_position(lambda t: ('center', -20*t), relative=True)
    # Ensure it's rendered over the center but offset
    clip = clip.set_position(('center', 'center'))
    # Actually, set_position(('center', 'center')) overrides the function. 
    # Let's just stick to crossfadein for the text to make it look smooth.
    return ImageClip(img_path).set_duration(duration).crossfadein(0.5).crossfadeout(0.5).set_position('center')

print("🎬 Loading clips and adding transitions...")

# We will use crossfadein on the video clips to make smooth transitions
# To use crossfadein in concatenate_videoclips, we must use method="compose"

# ACT 1 (0-4s)
c1 = get_clip("01", 0, 2)
c2 = get_clip("02", 0, 2).crossfadein(0.5)
act1_video = concatenate_videoclips([c1, c2], method="compose")
act1_text = animate_text(create_text_image("✨ CE SAMEDI ✨", font_size=110), 4)
act1 = CompositeVideoClip([act1_video, act1_text])

# ACT 2 (4-8s)
c3 = get_clip("03", 0, 2)
c6 = get_clip("06", 0, 2).crossfadein(0.5)
act2_video = concatenate_videoclips([c3, c6], method="compose")
act2_text = animate_text(create_text_image("🇫🇷 LA PLUS GRANDE SOIRÉE\nFRANÇAISE DE BARCELONE", font_size=80), 4)
act2 = CompositeVideoClip([act2_video, act2_text])

# ACT 3 (8-14s)
c5 = get_clip("05", 4, 1.5)
c7 = get_clip("07", 0, 1.5).fx(vfx.colorx, 2.0).crossfadein(0.5)
c8 = get_clip("08", 0, 1.5).crossfadein(0.5)
c10 = get_clip("10", 0, 1.5).crossfadein(0.5)
act3_video = concatenate_videoclips([c5, c7, c8, c10], method="compose")
act3_text = animate_text(create_text_image("🔥 LA FIRA PROVENZA • 22H30", font_size=80), 6)
act3 = CompositeVideoClip([act3_video, act3_text])

# ACT 4 (14-18s)
c10_freeze = get_clip("10", 1.5, 2)
c9 = get_clip("09", 5, 2).crossfadein(0.5)
act4_video = concatenate_videoclips([c10_freeze, c9], method="compose")
act4_text = animate_text(create_text_image("À PARTIR DE 10€\n\n👇 RÉSERVE MAINTENANT\nPLACES LIMITÉES", font_size=80), 4)
act4 = CompositeVideoClip([act4_video, act4_text])

print("🔗 Concatenating final video with crossfades...")
# Add crossfade between acts as well
act2 = act2.crossfadein(0.5)
act3 = act3.crossfadein(0.5)
act4 = act4.crossfadein(0.5)
final_video = concatenate_videoclips([act1, act2, act3, act4], method="compose")

print(f"💾 Writing to {OUTPUT_FILE} (this will take a minute or two)...")
final_video.write_videofile(OUTPUT_FILE, fps=30, codec="libx264", audio_codec="aac", logger=None)
print("✅ Done! Video is ready.")

import os
import sys
from moviepy.editor import VideoFileClip, concatenate_videoclips, CompositeVideoClip, ImageClip, vfx
from PIL import Image, ImageFont
import PIL

if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.Resampling.LANCZOS

from pilmoji import Pilmoji
from pilmoji.source import AppleEmojiSource

VIDEO_DIR = "/Users/brice.lengama/Documents/La French/Fourvenues API/25-07 La French (ac meta)"

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

def create_text_image(text, size=(1080, 1920), font_size=70):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Impact.ttf", font_size)
    except:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
            
    with Pilmoji(img, source=AppleEmojiSource) as pilmoji:
        bbox = pilmoji.getsize(text, font=font)
        text_w, text_h = bbox[0], bbox[1]
        x = (size[0] - text_w) / 2
        y = (size[1] - text_h) / 2 + 300
        
        outline_color = (0, 0, 0, 255)
        for offset_x in [-4, 0, 4]:
            for offset_y in [-4, 0, 4]:
                pilmoji.text((x + offset_x, y + offset_y), text, font=font, fill=outline_color)
                
        pilmoji.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    
    temp_path = f"/tmp/text_{hash(text)}.png"
    img.save(temp_path)
    return temp_path

def get_clip(key, start, duration):
    path = os.path.join(VIDEO_DIR, V[key])
    clip = VideoFileClip(path).subclip(start, start + duration)
    clip = clip.resize(height=1920, width=1080)
    return clip

def animate_text(img_path, duration):
    return ImageClip(img_path).set_duration(duration).crossfadein(0.5).crossfadeout(0.5).set_position('center')

def generate_variant(variant_name, text_act4):
    output_file = os.path.join(VIDEO_DIR, f"{variant_name}.mp4")
    print(f"🎬 Generating {variant_name}...")

    c1 = get_clip("01", 0, 2)
    c2 = get_clip("02", 0, 2).crossfadein(0.5)
    act1_video = concatenate_videoclips([c1, c2], method="compose")
    act1_text = animate_text(create_text_image("✨ CE SAMEDI ✨", font_size=110), 4)
    act1 = CompositeVideoClip([act1_video, act1_text])

    c3 = get_clip("03", 0, 2)
    c6 = get_clip("06", 0, 2).crossfadein(0.5)
    act2_video = concatenate_videoclips([c3, c6], method="compose")
    act2_text = animate_text(create_text_image("🇫🇷 LA PLUS GRANDE SOIRÉE\nFRANÇAISE DE BARCELONE", font_size=80), 4)
    act2 = CompositeVideoClip([act2_video, act2_text])

    c5 = get_clip("05", 4, 1.5)
    c7 = get_clip("07", 0, 1.5).fx(vfx.colorx, 2.0).crossfadein(0.5)
    c8 = get_clip("08", 0, 1.5).crossfadein(0.5)
    c10 = get_clip("10", 0, 1.5).crossfadein(0.5)
    act3_video = concatenate_videoclips([c5, c7, c8, c10], method="compose")
    act3_text = animate_text(create_text_image("🔥 LA FIRA PROVENZA • 22H30", font_size=80), 6)
    act3 = CompositeVideoClip([act3_video, act3_text])

    c10_freeze = get_clip("10", 1.5, 2)
    c9 = get_clip("09", 5, 2).crossfadein(0.5)
    act4_video = concatenate_videoclips([c10_freeze, c9], method="compose")
    act4_text = animate_text(create_text_image(text_act4, font_size=80), 4)
    act4 = CompositeVideoClip([act4_video, act4_text])

    act2 = act2.crossfadein(0.5)
    act3 = act3.crossfadein(0.5)
    act4 = act4.crossfadein(0.5)
    final_video = concatenate_videoclips([act1, act2, act3, act4], method="compose")

    print(f"💾 Writing to {output_file}...")
    final_video.write_videofile(output_file, fps=30, codec="libx264", audio_codec="aac", logger=None)
    print(f"✅ {variant_name} ready.")

if __name__ == "__main__":
    generate_variant("LaFrench_Variant_A", "PASS CLASSIQUE 10€\n\n👇 RÉSERVE MAINTENANT\nPLACES LIMITÉES")
    generate_variant("LaFrench_Variant_B", "PASS OPEN BAR 45€\n\n👇 BOISSONS ILLIMITÉES\nPLACES LIMITÉES")

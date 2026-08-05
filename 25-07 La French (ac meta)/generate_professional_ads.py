import PIL
from PIL import Image, ImageDraw, ImageFont
if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.Resampling.LANCZOS

import os
from moviepy.editor import VideoFileClip, concatenate_videoclips, CompositeVideoClip, ImageClip
from pilmoji import Pilmoji
from pilmoji.source import AppleEmojiSource

def create_text_clip(text, duration, start_time, font_size, filename):
    img = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font = None
    for fp in [
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf"
    ]:
        try:
            font = ImageFont.truetype(fp, font_size)
            print(f"Loaded font: {fp}")
            break
        except Exception:
            pass
            
    if font is None:
        font = ImageFont.load_default()

    bbox = draw.multiline_textbbox((0, 0), text, font=font, align='center')
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (1080 - text_width) // 2
    y = (1920 - text_height) // 2
    
    
    with Pilmoji(img, source=AppleEmojiSource) as pilmoji:
        pilmoji.text((x, y - bbox[1]), text, font=font, fill=(255, 255, 255, 255), align='center')
        
    img.save(filename)
    # has_mask=True is important for RGBA PNGs in MoviePy
    clip = ImageClip(filename).set_duration(duration).set_start(start_time)
    return clip

def main():
    video_dir = "/Users/brice.lengama/Documents/La French/Fourvenues API/25-07 La French (ac meta)"
    os.chdir(video_dir)
    
    print("Loading video clips...")
    c1 = VideoFileClip("converted_01.mp4").subclip(0, 2)
    c2 = VideoFileClip("converted_02.mp4").subclip(0, 2)
    c3 = VideoFileClip("converted_03.mp4").subclip(0, 2)
    c6 = VideoFileClip("converted_06.mp4").subclip(0, 2)
    c5 = VideoFileClip("converted_05.mp4").subclip(2, 3.5)
    c7 = VideoFileClip("converted_07.mp4").subclip(0, 1.5)
    c8 = VideoFileClip("converted_08.mp4").subclip(0, 1.5)
    c10 = VideoFileClip("converted_10.mp4").subclip(0, 1.5)
    c10_2 = VideoFileClip("converted_10.mp4").subclip(0, 2)
    c9 = VideoFileClip("converted_09.mp4").subclip(0, 2)
    
    print("Concatenating video clips...")
    base_video = concatenate_videoclips([c1, c2, c3, c6, c5, c7, c8, c10, c10_2, c9], method="compose")

    # Common Texts
    t1 = create_text_clip("✨ CE SAMEDI ✨", 4.0, 0.0, 90, "text1.png")
    t2 = create_text_clip("🇫🇷 LA PLUS GRANDE SOIRÉE\nFRANÇAISE DE BARCELONE", 4.0, 4.0, 70, "text2.png")
    t3 = create_text_clip("🔥 LA FIRA VILLAROEL • 22H30", 6.0, 8.0, 70, "text3.png")
    
    # Variant A
    print("Rendering Variant A...")
    t4_a = create_text_clip("PASS CLASSIQUE 10€\n\n👇 RÉSERVE MAINTENANT\nPLACES LIMITÉES", 4.0, 14.0, 70, "text4_a.png")
    final_a = CompositeVideoClip([base_video, t1, t2, t3, t4_a])
    final_a.write_videofile("LaFrench_Variant_A_Final.mp4", fps=30, codec="libx264", audio_codec="aac")
    
    # Variant B
    print("Rendering Variant B...")
    t4_b = create_text_clip("PASS OPEN BAR 45€\n\n👇 BOISSONS ILLIMITÉES\nPLACES LIMITÉES", 4.0, 14.0, 70, "text4_b.png")
    final_b = CompositeVideoClip([base_video, t1, t2, t3, t4_b])
    final_b.write_videofile("LaFrench_Variant_B_Final.mp4", fps=30, codec="libx264", audio_codec="aac")

    # Cleanup temp images
    for f in ["text1.png", "text2.png", "text3.png", "text4_a.png", "text4_b.png"]:
        if os.path.exists(f):
            os.remove(f)
            
    print("✅ Successfully generated LaFrench_Variant_A_Final.mp4 and LaFrench_Variant_B_Final.mp4!")

if __name__ == "__main__":
    main()

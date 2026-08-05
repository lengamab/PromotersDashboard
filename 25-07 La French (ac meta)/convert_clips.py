import os
import sys
import subprocess

VIDEO_DIR = "/Users/brice.lengama/Documents/La French/Fourvenues API/25-07 La French (ac meta)"
FFMPEG = "/Users/brice.lengama/Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"

V = {
    "01": "01_groupe_marche_ville [+LUMINOSITE].mov",
    "02": "02_filles_arrivent_rue [+LUMINOSITE].mov",
    "03": "03_file_attente_verte [+LUMINOSITE].mov",
    "05": "05_entree_caisse_paiement.mov",
    "06": "06_couloir_neon_rouge [+CONTRASTE NEONS].mov",
    "07": "07_ecran_led_bleu [+CONTRASTE NEONS].mov",
    "08": "08_dj_scene_neons [+STABILISER +CONTRASTE NEONS +LUMINOSITE].mov",
    "09": "09_portrait_mec_bar [+LUMINOSITE +CONTRASTE NEONS].mov",
    "10": "10_dancefloor_climax [+LUMINOSITE +CONTRASTE NEONS].mov",
}

print("Converting videos to standard H.264 1080x1920 to fix MoviePy artifacts...")

for k, v in V.items():
    inp = os.path.join(VIDEO_DIR, v)
    out = os.path.join(VIDEO_DIR, f"converted_{k}.mp4")
    
    if os.path.exists(out):
        print(f"Skipping {k} (already converted)")
        continue
        
    print(f"Converting {v}...")
    
    # Scale to 1080x1920 (cropping if necessary) to ensure uniform standard format
    vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
    
    cmd = [
        FFMPEG, "-y",
        "-i", inp,
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        out
    ]
    
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
print("All videos converted!")

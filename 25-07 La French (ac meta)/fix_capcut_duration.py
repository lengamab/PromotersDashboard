import json
import os

def fix_project(variant_name):
    base_path = os.path.expanduser(f'~/Movies/CapCut/User Data/Projects/com.lveditor.draft/{variant_name}')
    
    # 1. Fix draft_meta_info.json
    meta_path = os.path.join(base_path, 'draft_meta_info.json')
    if os.path.exists(meta_path):
        stat = os.stat(meta_path)
        with open(meta_path, 'r') as f:
            data = json.load(f)
        
        data['tm_duration'] = 18000000
        
        with open(meta_path, 'w') as f:
            json.dump(data, f)
        os.utime(meta_path, (stat.st_atime, stat.st_mtime))
        print(f"Fixed {meta_path}")

    # 2. Fix draft_info.json (if it exists)
    info_path = os.path.join(base_path, 'draft_info.json')
    if os.path.exists(info_path):
        stat = os.stat(info_path)
        with open(info_path, 'r') as f:
            data = json.load(f)
        
        data['tm_duration'] = 18000000
        for vid in data.get('materials', {}).get('videos', []):
            vid['width'] = 1080
            vid['height'] = 1920
            
        with open(info_path, 'w') as f:
            json.dump(data, f)
        os.utime(info_path, (stat.st_atime, stat.st_mtime))
        print(f"Fixed {info_path}")
        
    # 3. Check draft_content.json just in case
    content_path = os.path.join(base_path, 'draft_content.json')
    if os.path.exists(content_path):
        stat = os.stat(content_path)
        with open(content_path, 'r') as f:
            data = json.load(f)
        
        data['tm_duration'] = 18000000
        # Check if duration is also needed at root level
        data['duration'] = 18000000 
            
        with open(content_path, 'w') as f:
            json.dump(data, f)
        os.utime(content_path, (stat.st_atime, stat.st_mtime))
        print(f"Fixed {content_path}")

fix_project("LaFrench_Variant_A")
fix_project("LaFrench_Variant_B")
print("✅ Done fixing both projects!")

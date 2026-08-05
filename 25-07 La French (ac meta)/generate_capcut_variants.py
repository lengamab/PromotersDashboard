import os
import sys
import json
import shutil
import uuid

# Base CapCut projects directory on macOS
CAPCUT_DIR = os.path.expanduser("~/Movies/CapCut/User Data/Projects/com.lveditor.draft")

def update_root_meta(template_dir, new_dir, new_name):
    # Register the new project in root_meta_info.json
    root_meta_path = os.path.join(CAPCUT_DIR, "root_meta_info.json")
    if not os.path.exists(root_meta_path):
        return

    with open(root_meta_path, 'r') as f:
        root_data = json.load(f)

    # Find the new project and update its name
    # We'll just assume CapCut reads the draft_info.json directly, but let's 
    # check if there's anything to do. Usually CapCut dynamically updates root_meta_info
    # when it scans folders. However, it's safer to let CapCut discover it.
    pass

def clone_project(template_name, variant_name, new_texts):
    """
    Clones a CapCut project and replaces the payload of text objects sequentially.
    new_texts should be a list of strings matching the order of text elements.
    """
    template_dir = os.path.join(CAPCUT_DIR, template_name)
    variant_dir = os.path.join(CAPCUT_DIR, variant_name)

    if not os.path.exists(template_dir):
        print(f"Error: Template project '{template_name}' not found.")
        return False

    if os.path.exists(variant_dir):
        print(f"Overwriting existing project '{variant_name}'...")
        shutil.rmtree(variant_dir)

    shutil.copytree(template_dir, variant_dir)

    draft_info_path = os.path.join(variant_dir, "draft_info.json")
    if not os.path.exists(draft_info_path):
        print("Error: draft_info.json missing in template.")
        return False

    with open(draft_info_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Update project name and IDs
    new_id = str(uuid.uuid4()).upper()
    if 'id' in data:
        data['id'] = new_id
    if 'draft_id' in data:
        data['draft_id'] = new_id
    if 'draft_name' in data:
        data['draft_name'] = variant_name

    # Modify texts
    texts = data.get('materials', {}).get('texts', [])
    if len(texts) < len(new_texts):
        print(f"Warning: Template has {len(texts)} texts, but you provided {len(new_texts)} replacements.")

    for i, new_text in enumerate(new_texts):
        if i < len(texts):
            text_obj = texts[i]
            # Content is stored as a stringified JSON object
            content_str = text_obj.get('content', '{}')
            try:
                content_data = json.loads(content_str)
                content_data['text'] = new_text
                text_obj['content'] = json.dumps(content_data, ensure_ascii=False)
            except Exception as e:
                print(f"Failed to parse text content for text {i}: {e}")

    with open(draft_info_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        
    print(f"✅ Successfully created CapCut project: {variant_name}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 generate_capcut_variants.py <Template_Project_Name>")
        sys.exit(1)
        
    template_name = sys.argv[1]
    
    # Texts to inject for Variant A
    # The order MUST match the order of text tracks created in the template!
    # Adjust this list according to the template you build.
    variant_a_texts = [
        "✨ CE SAMEDI ✨",
        "🇫🇷 LA PLUS GRANDE SOIRÉE\nFRANÇAISE DE BARCELONE",
        "🔥 LA FIRA VILLAROEL • 22H30",
        "PASS CLASSIQUE 10€\n\n👇 RÉSERVE MAINTENANT\nPLACES LIMITÉES"
    ]
    
    variant_b_texts = [
        "✨ CE SAMEDI ✨",
        "🇫🇷 LA PLUS GRANDE SOIRÉE\nFRANÇAISE DE BARCELONE",
        "🔥 LA FIRA VILLAROEL • 22H30",
        "PASS OPEN BAR 45€\n\n👇 BOISSONS ILLIMITÉES\nPLACES LIMITÉES"
    ]

    clone_project(template_name, "LaFrench_Variant_A", variant_a_texts)
    clone_project(template_name, "LaFrench_Variant_B", variant_b_texts)
    
    print("\nNext Steps:")
    print("1. Restart CapCut.")
    print("2. The new projects should appear in your Recent Drafts.")

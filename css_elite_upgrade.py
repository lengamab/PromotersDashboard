with open('frontend/style.css', 'r') as f:
    css = f.read()

# 1. Update body to animated mesh
css = css.replace(
    'background: radial-gradient(circle at 50% 0%, #0f1c3f 0%, var(--bg-main) 60%);\n    background-attachment: fixed;',
    '''background: linear-gradient(45deg, #040914, #0f1c3f, #08122a, #040914);
    background-size: 400% 400%;
    animation: auroraBreathe 20s ease infinite;'''
)

# 2. Update Header to Floating Island
css = css.replace(
    '.main-header {\n    background-color: var(--bg-header);\n    backdrop-filter: var(--glass-blur);\n    -webkit-backdrop-filter: var(--glass-blur);\n    border: 1px solid var(--border-color);\n    border-radius: 16px;\n    padding: 20px 24px;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);\n    z-index: 10;\n}',
    '''.main-header {
    background-color: var(--bg-header);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 50px;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    z-index: 100;
    margin: 10px auto 30px auto;
    width: 95%;
    position: sticky;
    top: 20px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.main-header:hover {
    transform: translateY(-2px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}'''
)

# 3. Add Holographic Card logic and Loaders
animations = '''

/* Elite Animations */
@keyframes auroraBreathe {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

@keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
}

.skeleton-box {
    display: inline-block;
    height: 1em;
    position: relative;
    overflow: hidden;
    background-color: rgba(255,255,255,0.05);
    border-radius: 4px;
}
.skeleton-box::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    background-image: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0,
        rgba(255, 255, 255, 0.05) 20%,
        rgba(255, 255, 255, 0.1) 60%,
        rgba(255, 255, 255, 0)
    );
    animation: shimmer 2s infinite;
    content: '';
}

.stat-card::before {
    content: '';
    position: absolute;
    top: -2px; left: -2px; right: -2px; bottom: -2px;
    background: linear-gradient(45deg, transparent 40%, rgba(59, 130, 246, 0.5) 50%, transparent 60%);
    z-index: -1;
    background-size: 200% 200%;
    animation: borderSweep 4s linear infinite;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.stat-card:hover::before {
    opacity: 1;
}

@keyframes borderSweep {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 200%; }
}

.stagger-in {
    opacity: 0;
    animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
}
'''

if "auroraBreathe" not in css:
    css += animations

with open('frontend/style.css', 'w') as f:
    f.write(css)
print("CSS updated with Elite styles")

import re

with open('frontend/style.css', 'r') as f:
    css = f.read()

# 1. Update Core Design Tokens
css = re.sub(
    r':root \{.*?\n\}',
    ''':root {
    --bg-main: #040914;
    --bg-card: rgba(13, 17, 28, 0.65);
    --bg-header: rgba(10, 14, 23, 0.75);
    
    --border-color: rgba(255, 255, 255, 0.06);
    --border-hover: rgba(255, 255, 255, 0.12);
    --border-glow: rgba(59, 130, 246, 0.3);
    
    --color-primary: #3b82f6;
    --color-primary-hover: #2563eb;
    --color-primary-glow: rgba(59, 130, 246, 0.2);
    
    --color-success: #10b981;
    --color-success-hover: #059669;
    --color-success-bg: rgba(16, 185, 129, 0.12);
    --color-success-glow: rgba(16, 185, 129, 0.25);
    
    --color-danger: #ef4444;
    --color-danger-hover: #dc2626;
    --color-danger-bg: rgba(239, 68, 68, 0.12);
    --color-danger-glow: rgba(239, 68, 68, 0.25);
    
    --color-warning: #f59e0b;
    --color-warning-bg: rgba(245, 158, 11, 0.12);
    
    --text-primary: #ffffff;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;
    
    --font-ui: 'Inter', -apple-system, sans-serif;
    --font-heading: 'Outfit', -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    
    --transition-fast: 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    --transition-normal: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    
    --glass-blur: blur(24px);
    --shadow-premium: 0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    --shadow-hover: 0 30px 60px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}''',
    css,
    flags=re.DOTALL
)

# 2. Add deep gradient background
css = css.replace(
    '''body {
    background-color: var(--bg-main);''',
    '''body {
    background: radial-gradient(circle at 50% 0%, #0f1c3f 0%, var(--bg-main) 60%);
    background-attachment: fixed;'''
)

# 3. Add Custom Scrollbars
scrollbar_css = '''
/* Custom Scrollbars */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}
::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
}
::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}
'''
if "::-webkit-scrollbar" not in css:
    css = css.replace('/* Main Header */', scrollbar_css + '\n/* Main Header */')

# 4. Enhance Stat Cards
css = css.replace('transform: translateY(-2px);', 'transform: translateY(-6px);')
css = css.replace('box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);', 'box-shadow: var(--shadow-hover); border-color: var(--border-hover);')
css = css.replace('transition: all 0.3s ease;', 'transition: var(--transition-normal);')

# 5. Enhance Tables
css = css.replace(
    'background-color: rgba(255, 255, 255, 0.02);',
    'background-color: rgba(255, 255, 255, 0.015); transform: scale(1.002); box-shadow: 0 4px 12px rgba(0,0,0,0.1);'
)

# 6. Enhance Badges
css = css.replace('border-radius: 6px;', 'border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);')

# Write back
with open('frontend/style.css', 'w') as f:
    f.write(css)

print("CSS rewritten successfully!")

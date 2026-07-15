import re

with open('frontend/style.css', 'r') as f:
    css = f.read()

# Make the app-container look premium
css = css.replace(
    'box-shadow: var(--shadow-premium);',
    'box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);'
)

# Enhance stats grid and cards
css = css.replace(
    '.stat-card {',
    '.stat-card {\n    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);\n    position: relative;\n    overflow: hidden;'
)

# Enhance badges
css = css.replace(
    '.badge {',
    '.badge {\n    box-shadow: 0 2px 10px rgba(0,0,0,0.1);\n    backdrop-filter: blur(8px);\n    border: 1px solid rgba(255,255,255,0.05);'
)

css = css.replace(
    'padding: 4px 10px;',
    'padding: 6px 14px;'
)

css = css.replace(
    'border-radius: 6px;',
    'border-radius: 20px;'
)

# Enhance data tables
css = css.replace(
    '.data-table th {',
    '.data-table th {\n    text-transform: uppercase;\n    letter-spacing: 0.5px;\n    font-size: 11px;\n    color: var(--text-muted);'
)

css = css.replace(
    '.tracking-table th {',
    '.tracking-table th {\n    text-transform: uppercase;\n    letter-spacing: 0.5px;\n    font-size: 11px;\n    color: var(--text-muted);'
)

css = css.replace(
    'background-color: rgba(255, 255, 255, 0.04);',
    'background-color: rgba(255, 255, 255, 0.03);\n    transform: translateY(-1px);\n    box-shadow: 0 4px 12px rgba(0,0,0,0.1);'
)

css = css.replace(
    'background-color: rgba(255, 255, 255, 0.02);',
    'background-color: rgba(255, 255, 255, 0.02);\n    transform: translateY(-1px);\n    box-shadow: 0 4px 12px rgba(0,0,0,0.1);'
)

# Adjust Font weights
css = css.replace('font-weight: 500;', 'font-weight: 600;')
css = css.replace('font-weight: 400;', 'font-weight: 500;')

with open('frontend/style.css', 'w') as f:
    f.write(css)

print("CSS refined")

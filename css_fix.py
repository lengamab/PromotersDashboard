with open('frontend/style.css', 'r') as f:
    css = f.read()

# Fix the stat-card border trick
css = css.replace(
    '.stat-card::before {\n    content: \'\';\n    position: absolute;',
    '''.stat-card {
    background: transparent !important;
}
.stat-card::after {
    content: '';
    position: absolute;
    inset: 1px;
    background: rgba(13, 17, 28, 0.85);
    border-radius: inherit;
    z-index: -1;
    backdrop-filter: blur(20px);
}
.stat-card::before {
    content: '';
    position: absolute;'''
)

css = css.replace('z-index: -1;\n    background-size: 200% 200%;', 'z-index: -2;\n    background-size: 200% 200%;')

with open('frontend/style.css', 'w') as f:
    f.write(css)

print("CSS border logic fixed")

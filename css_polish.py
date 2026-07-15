with open('frontend/style.css', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'background-color: var(--bg-card);' in line:
        new_lines.append('    background: linear-gradient(145deg, rgba(20,25,35,0.7) 0%, rgba(10,15,25,0.85) 100%);\n')
        new_lines.append('    backdrop-filter: blur(20px);\n')
    elif '--bg-header: rgba(10, 14, 23, 0.75);' in line:
        new_lines.append('    --bg-header: rgba(10, 14, 23, 0.55);\n')
    else:
        new_lines.append(line)

with open('frontend/style.css', 'w') as f:
    f.writelines(new_lines)
print("Polished")

import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

# Add stagger-in to rows
js = js.replace('<tr class="table-row"', '<tr class="table-row stagger-in"')
js = js.replace('<tr class="commission-row"', '<tr class="commission-row stagger-in"')
js = js.replace('<tr onclick="', '<tr class="stagger-in" onclick="')

with open('frontend/app.js', 'w') as f:
    f.write(js)

print("Stagger added")

import re
import requests
import json

url = "https://site.fourvenues.com/fr/la-french-barcelona-1@g:gduqj/events/espana---belgica-fan-zone-10-07-2026-BJVB"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
resp = requests.get(url, headers=headers, timeout=10)

text = re.sub(r'<style.*?>.*?</style>', ' ', resp.text, flags=re.IGNORECASE|re.DOTALL)
text = re.sub(r'<script.*?>.*?</script>', ' ', text, flags=re.IGNORECASE|re.DOTALL)
text = re.sub(r'<[^>]+>', ' ', text)
text = re.sub(r'\s+', ' ', text).strip()
print(text[:1000])

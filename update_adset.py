import urllib.request
import urllib.parse
import json

ACT_ID = 'act_911535275086772'
TOKEN = 'EAAMlAfQc4LsBR18bIHU1HG9VaGgmHrcu9vXtRrlLnoqHYnJiuAjdgyGTJ89q37NvYu4XjZAVjiz47WPUVOjJpYF58HtvOXJZCHLI4wk1c5ViRTzFZANZCNFoWnCZBdM0ZBwcTFqlS5IBWPwZCJcZBQPw2IqAfmgROp93elmCe9CZAEj4KXbqmOLf6MckZBONfOZA5AZD'
ADSET_ID = '120256034691320002'

# 1. Fetch current targeting
params = urllib.parse.urlencode({'access_token': TOKEN, 'fields': 'targeting'})
url = f"https://graph.facebook.com/v19.0/{ADSET_ID}?{params}"
with urllib.request.urlopen(url) as res:
    data = json.loads(res.read().decode('utf-8'))
    targeting = data['targeting']

# 2. Modify targeting
targeting['targeting_optimization'] = 'none'
# We might need to remove some readonly fields if Facebook complains, but usually updating entire targeting works if we pass what they gave us.

# 3. Update adset
update_data = urllib.parse.urlencode({
    'access_token': TOKEN,
    'targeting': json.dumps(targeting)
}).encode('utf-8')

req = urllib.request.Request(f"https://graph.facebook.com/v19.0/{ADSET_ID}", data=update_data, method='POST')
try:
    with urllib.request.urlopen(req) as res:
        print("Update response:", res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Error:", e.read().decode('utf-8'))

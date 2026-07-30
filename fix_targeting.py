import urllib.request
import urllib.parse
import json
import sys

# Replace this with a token that has 'ads_management' scope!
TOKEN = 'EAAXtLNkkUdQBSEDgpREXQjLsz2PYu1W1Le1VDoxL8AIDw5SKWIinkJVuYZA9fkjEVUeR8ZANZCqbpi0N3ZAwl3bvJoZC10Bf5KYuM6ktPWjhbJZBJj1b76dWd25ijK761o9TnUhPYDdZBZA9pWE30y3vI2xOsnprgF1bhKgbSqbnffiLZBy2osjHL4ccD52Up7LEpcrjrMniNZCR8NxaYZD'
ADSET_ID = '120256034691320002'

def fix_expansion():
    print("Fetching current targeting...")
    params = urllib.parse.urlencode({'access_token': TOKEN, 'fields': 'targeting'})
    url = f"https://graph.facebook.com/v19.0/{ADSET_ID}?{params}"
    
    try:
        with urllib.request.urlopen(url) as res:
            data = json.loads(res.read().decode('utf-8'))
            targeting = data['targeting']
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    if targeting.get('targeting_optimization') == 'expansion_all':
        print("Targeting expansion leak found! Fixing...")
        targeting['targeting_optimization'] = 'none'
        
        update_data = urllib.parse.urlencode({
            'access_token': TOKEN,
            'targeting': json.dumps(targeting)
        }).encode('utf-8')

        req = urllib.request.Request(f"https://graph.facebook.com/v19.0/{ADSET_ID}", data=update_data, method='POST')
        try:
            with urllib.request.urlopen(req) as res:
                print("Successfully updated ad set! Response:", res.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            print("Error updating (Make sure your token has 'ads_management' permission!):")
            print(e.read().decode('utf-8'))
    else:
        print("Expansion is already off.")

if __name__ == "__main__":
    fix_expansion()

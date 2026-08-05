import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("FOURVENUES_API_KEY")
print(f"Key loaded: {'Yes' if api_key else 'No'}")

url = "https://api.fourvenues.com/integrations/events"
headers = {"X-Api-Key": api_key, "Content-Type": "application/json"}
resp = requests.get(url, headers=headers)
print(resp.status_code)
print(resp.text[:100])

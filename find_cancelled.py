import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
from email_sender import get_fourvenues_data

events = get_fourvenues_data("events?start=2026-01-01&end=2026-12-31")
statuses = set()

for event in events:
    tickets = get_fourvenues_data(f"tickets/?event_id={event['_id']}")
    for t in tickets:
        if "status" in t:
            statuses.add(t["status"])

print("Found ticket statuses:", statuses)

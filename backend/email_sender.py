import os
import json
import urllib.request
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
import concurrent.futures
from dotenv import load_dotenv

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Promoters that should never receive commission (venue's own accounts)
NO_COMMISSION_PROMOTERS = {
    "la french barcelona",
    "direct sale / no promoter",
}

API_KEY = os.getenv("FOURVENUES_API_KEY")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = os.getenv("SMTP_PORT")
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
RECIPIENT_EMAIL = os.getenv("RECIPIENT_EMAIL")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:5000")

DATA_DIR = os.environ.get("DATA_DIR", os.path.dirname(__file__))
DB_PATH = os.path.join(DATA_DIR, 'tracking.json')
COMMISSIONS_PATH = os.path.join(DATA_DIR, 'commissions.json')
PERFORMANCE_CACHE_PATH = os.path.join(DATA_DIR, 'performance_cache.json')

def load_db():
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def load_performance_cache():
    if os.path.exists(PERFORMANCE_CACHE_PATH):
        try:
            with open(PERFORMANCE_CACHE_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def parse_fourvenues_time(created_at):
    """Parses a Fourvenues UTC timestamp into a formatted local string and day string."""
    if not created_at:
        return "Unknown", "Unknown"
    
    try:
        clean_str = created_at.replace('Z', '+00:00')
        dt = datetime.fromisoformat(clean_str)
        if ZoneInfo:
            dt = dt.astimezone(ZoneInfo("Europe/Madrid"))
        return dt.strftime("%Y-%m-%d %H:%M:%S"), dt.strftime("%Y-%m-%d")
    except Exception:
        day = created_at.split('T')[0]
        time_full = created_at.replace('T', ' ').split('.')[0]
        return time_full, day

def save_performance_cache(data):
    try:
        with open(PERFORMANCE_CACHE_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving performance cache: {e}")
        return False

def load_commissions():
    if os.path.exists(COMMISSIONS_PATH):
        try:
            with open(COMMISSIONS_PATH, 'r') as f:
                return json.load(f).get("rates", {})
        except Exception:
            return {}
    return {}

def save_commissions(rates):
    try:
        with open(COMMISSIONS_PATH, 'w') as f:
            json.dump({"rates": rates}, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving commissions: {e}")
        return False

def get_fourvenues_data(endpoint, return_none_on_error=False):
    import time
    url = f"https://api.fourvenues.com/integrations/{endpoint}"
    req = urllib.request.Request(url, headers={"X-Api-Key": API_KEY})
    
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode()).get("data", [])
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(1.0 + attempt)  # Backoff
            else:
                print(f"Error fetching Fourvenues endpoint {endpoint}: {e}")
                return None if return_none_on_error else []
        except Exception as e:
            print(f"Error fetching Fourvenues endpoint {endpoint}: {e}")
            return None if return_none_on_error else []
            
    print(f"Failed to fetch {endpoint} after 4 retries.")
    return None if return_none_on_error else []

def get_all_event_tickets(events):
    """
    Fetches tickets for all events concurrently.
    Returns a dictionary mapping event_id -> list of tickets.
    """
    results = {}
    
    def fetch_for_event(ev_id):
        return ev_id, get_fourvenues_data(f"tickets/?event_id={ev_id}", return_none_on_error=True)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_ev = {executor.submit(fetch_for_event, ev["_id"]): ev["_id"] for ev in events}
        for future in concurrent.futures.as_completed(future_to_ev):
            ev_id = future_to_ev[future]
            try:
                res_id, t_data = future.result()
                results[res_id] = t_data
            except Exception as exc:
                print(f"Event {ev_id} generated an exception: {exc}")
                results[ev_id] = None
                
    return results

def calculate_ticket_commission(rate_name, price, rate_slug, custom_commissions=None, sale_type="cash", promoter_name=None):
    if custom_commissions is None:
        custom_commissions = {}
        
    comm = 1.0
    # Check if a custom commission was configured for this rate name/slug
    comm_config = custom_commissions.get(rate_slug) or custom_commissions.get(rate_name)
    if comm_config is not None:
        if isinstance(comm_config, dict):
            comm = float(comm_config.get(sale_type, 0.0))
        else:
            comm = float(comm_config)
    else:
        rate_upper = rate_name.upper()
        # 1. Open Bar check first (7€)
        if "OPEN BAR" in rate_upper or "OPENBAR" in rate_upper:
            comm = 7.0
        # 2. Fanzone checks (1€)
        elif "FAN ZONE" in rate_upper or "FANZONE" in rate_upper:
            comm = 1.0
        # 3. PASS at 10€ check (5€)
        elif "PASS" in rate_upper and abs(price - 10.0) < 0.01:
            comm = 5.0
        else:
            comm = 1.0
            
    # Custom rule for "Welovebcn Guest List"
    if promoter_name and "Welovebcn Guest List" in promoter_name and abs(comm - 1.0) < 0.01:
        comm = 2.0
        
    return comm

def gather_performance_report(start_date=None, end_date=None):
    import time
    
    # 1. Resolve promoters (users)
    users = get_fourvenues_data("users")
    users_dict = {
        u["_id"]: f"{u['profile']['name']} {u['profile']['last_name']}".strip() or u.get("email")
        for u in users
    }
    
    # 2. Get events. To capture pre-sales, fetch from start_date up to 1 year in the future.
    if not start_date:
        current_year = datetime.now().year
        start_date = f"{current_year}-01-01"
    if not end_date:
        end_date = f"{datetime.now().year}-12-31"
        
    fetch_end = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=365)).strftime("%Y-%m-%d")
    events = get_fourvenues_data(f"events?start={start_date}&end={fetch_end}")
    
    cache = load_performance_cache()
    if "events" not in cache:
        cache["events"] = {}
        
    custom_commissions = load_commissions()
    
    promoter_globals = {}
    daily_trends = {}
    current_time = time.time()
    
    cache_dirty = False
    
    # 1. Determine which events need live fetching
    events_to_fetch = []
    for event in events:
        event_id = event["_id"]
        event_date_raw = event.get("date", 0)
        is_completed = (event_date_raw + 86400) < current_time
        
        # Invalidate cache if it doesn't have the new format (checking for commission in daily stats)
        is_valid_cache = False
        if is_completed and event_id in cache["events"] and isinstance(cache["events"][event_id], dict):
            daily_data = cache["events"][event_id].get("daily", {})
            if daily_data:
                first_day = next(iter(daily_data.values()))
                first_promoter = next(iter(first_day.get("promoters", {}).values()), {})
                if "commission" in first_promoter:
                    is_valid_cache = True
                    
        if not (is_completed and is_valid_cache):
            events_to_fetch.append(event)
            
    # 2. Fetch required tickets in parallel
    event_tickets_map = get_all_event_tickets(events_to_fetch)
    
    for event in events:
        event_id = event["_id"]
        event_date_raw = event.get("date", 0)
        event_name = event.get("name", "Unknown Event")
        
        # Consider event completed if its date + 24 hours is in the past
        is_completed = (event_date_raw + 86400) < current_time
        
        event_daily = {}
        
        # Re-check cache validity for this event
        is_valid_cache = False
        if is_completed and event_id in cache["events"] and isinstance(cache["events"][event_id], dict):
            daily_data = cache["events"][event_id].get("daily", {})
            if daily_data:
                first_day = next(iter(daily_data.values()))
                first_promoter = next(iter(first_day.get("promoters", {}).values()), {})
                if "commission" in first_promoter:
                    is_valid_cache = True
                    
        if is_completed and is_valid_cache:
            # Load from cache
            event_data = cache["events"][event_id]
            event_daily = event_data.get("daily", {})
        else:
            # Fetch live
            tickets = event_tickets_map.get(event_id)
            if tickets is None:
                continue
                
            for t in tickets:
                if t.get("status") == "cancelled":
                    continue
                    
                price = float(t.get("price", 0))
                referral_id = t.get("referral_id")
                
                promoter_id = referral_id or "unknown"
                if promoter_id not in users_dict:
                    promoter_id = "unknown"
                promoter_name = users_dict.get(promoter_id, "unknown")
                
                rate_name = t.get("rate_name", "Unknown Rate")
                rate_slug = t.get("rate_slug", "unknown-slug")
                sale_type = "online" if t.get("payment_id") else "cash"
                comm = calculate_ticket_commission(rate_name, price, rate_slug, custom_commissions, sale_type=sale_type, promoter_name=promoter_name)
                
                if sale_type == "online" and t.get("enter", 0) != 1:
                    comm = 0.0
                    
                created_at = t.get("created_at")
                _, day_str = parse_fourvenues_time(created_at)
                
                if day_str not in event_daily:
                    event_daily[day_str] = {"sales": 0, "revenue": 0.0, "promoters": {}, "no_shows": 0}
                    
                event_daily[day_str]["sales"] += 1
                event_daily[day_str]["revenue"] += price
                if is_completed and t.get("enter", 0) != 1:
                    event_daily[day_str]["no_shows"] += 1
                
                if promoter_id not in event_daily[day_str]["promoters"]:
                    event_daily[day_str]["promoters"][promoter_id] = {
                        "sales": 0, 
                        "revenue": 0.0,
                        "commission": 0.0,
                        "no_shows": 0
                    }
                event_daily[day_str]["promoters"][promoter_id]["sales"] += 1
                event_daily[day_str]["promoters"][promoter_id]["revenue"] += price
                event_daily[day_str]["promoters"][promoter_id]["commission"] += comm
                
                if is_completed and t.get("enter", 0) != 1:
                    event_daily[day_str]["promoters"][promoter_id]["no_shows"] += 1
            
            # Save to cache if completed
            if is_completed:
                cache["events"][event_id] = {
                    "daily": event_daily
                }
                cache_dirty = True
                
        # Now process event_daily but filter strictly by start_date and end_date!
        for day_str, stats in event_daily.items():
            if day_str == "Unknown":
                continue
            if start_date and day_str < start_date:
                continue
            if end_date and day_str > end_date:
                continue
                
            # Merge into daily_trends
            if day_str not in daily_trends:
                daily_trends[day_str] = {"date": day_str, "sales": 0, "revenue": 0.0, "promoters": {}, "no_shows": 0}
            daily_trends[day_str]["sales"] += stats["sales"]
            daily_trends[day_str]["revenue"] += stats["revenue"]
            daily_trends[day_str]["no_shows"] += stats.get("no_shows", 0)
            
            for pid, pstats in stats.get("promoters", {}).items():
                if pid not in daily_trends[day_str]["promoters"]:
                    daily_trends[day_str]["promoters"][pid] = {"sales": 0, "revenue": 0.0, "events": {}}
                daily_trends[day_str]["promoters"][pid]["sales"] += pstats["sales"]
                daily_trends[day_str]["promoters"][pid]["revenue"] += pstats["revenue"]
                
                if event_name not in daily_trends[day_str]["promoters"][pid]["events"]:
                    daily_trends[day_str]["promoters"][pid]["events"][event_name] = 0
                daily_trends[day_str]["promoters"][pid]["events"][event_name] += pstats["sales"]
                
                # Merge into promoter_globals
                if pid not in promoter_globals:
                    promoter_globals[pid] = {
                        "promoter_id": pid,
                        "promoter_name": users_dict.get(pid, "Direct Sale / No Promoter"),
                        "total_tickets": 0,
                        "total_revenue": 0.0,
                        "total_commission": 0.0,
                        "total_no_shows": 0,
                        "events_promoted_set": set()
                    }
                
                pg = promoter_globals[pid]
                pg["total_tickets"] += pstats["sales"]
                pg["total_revenue"] += pstats["revenue"]
                if pg["promoter_name"].lower() not in NO_COMMISSION_PROMOTERS:
                    pg["total_commission"] += pstats.get("commission", 0.0)
                pg["total_no_shows"] += pstats.get("no_shows", 0)
                pg["events_promoted_set"].add(event_id)
            
    if cache_dirty:
        save_performance_cache(cache)
        
    # Calculate final derived metrics
    for p_id, pg in promoter_globals.items():
        tickets = pg["total_tickets"]
        if tickets > 0:
            pg["no_show_rate"] = round((pg["total_no_shows"] / tickets) * 100, 1)
        else:
            pg["no_show_rate"] = 0.0
            
        events_promoted = len(pg["events_promoted_set"])
        pg["events_promoted"] = events_promoted
        if events_promoted > 0:
            pg["sales_per_event"] = round(tickets / events_promoted, 1)
        else:
            pg["sales_per_event"] = 0.0
            
        del pg["events_promoted_set"] # Remove before returning JSON
            
    results = list(promoter_globals.values())
    # Default sort by total tickets descending
    results.sort(key=lambda x: x["total_tickets"], reverse=True)
    
    # Sort daily trends chronologically, discard "Unknown" if you want or keep it
    sorted_trends = []
    for k in sorted(daily_trends.keys()):
        if k == "Unknown":
            continue
        # Only include dates within our requested range
        if start_date and k < start_date:
            continue
        if end_date and k > end_date:
            continue
            
        trend = daily_trends[k].copy()
        
        # Convert promoters dict to sorted list
        promoter_list = []
        for pid, pstats in trend.get("promoters", {}).items():
            pname = users_dict.get(pid, "Direct Sale / No Promoter")
            events_sold = ", ".join(f"{count}x {ename}" for ename, count in pstats.get("events", {}).items())
            
            promoter_list.append({
                "promoter_id": pid,
                "promoter_name": pname,
                "sales": pstats["sales"],
                "revenue": pstats["revenue"],
                "events_sold": events_sold
            })
        promoter_list.sort(key=lambda x: x["sales"], reverse=True)
        trend["promoters"] = promoter_list
        
        sorted_trends.append(trend)
    
    return {
        "promoter_stats": results,
        "daily_trends": sorted_trends
    }

def gather_cash_report(start_date=None, end_date=None):
    db = load_db()
    custom_commissions = load_commissions()
    
    # 1. Resolve promoters (users)
    users = get_fourvenues_data("users")
    users_dict = {
        u["_id"]: f"{u['profile']['name']} {u['profile']['last_name']}".strip() or u.get("email")
        for u in users
    }
    
    # 2. Get events for specified date range (default: 7 days ago to 14 days in the future)
    if not start_date:
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
    events = get_fourvenues_data(f"events?start={start_date}&end={end_date}")
    
    event_tickets_map = get_all_event_tickets(events)
    
    report_data = []
    
    total_gathered = 0.0
    total_commission = 0.0
    total_net_due = 0.0
    total_returned = 0.0
    total_pending = 0.0
    
    for event in events:
        ev_id = event["_id"]
        ev_name = event["name"]
        ev_date_raw = event.get("date")
        
        # Format date for display
        if ev_date_raw:
            try:
                ev_date = datetime.fromtimestamp(ev_date_raw, tz=ZoneInfo("Europe/Madrid") if ZoneInfo else None).strftime("%d/%m/%Y")
            except Exception:
                ev_date = str(ev_date_raw)
        else:
            ev_date = "N/A"
            
        tickets = event_tickets_map.get(ev_id, [])
        
        # Aggregate by promoter
        promoter_cash = {}
        for t in tickets:
            if t.get("status") == "cancelled":
                continue
                
            price = float(t.get("price", 0))
            payment_id = t.get("payment_id")
            referral_id = t.get("referral_id")
            sale_type = t.get("sale_type", "")
            
            # Cash ticket condition: no payment_id and not an online sale
            if price >= 0 and not payment_id and sale_type != "online":
                promoter_id = referral_id or "unknown"
                if promoter_id not in users_dict:
                    promoter_id = "unknown"
                promoter_name = users_dict.get(promoter_id, "Direct Sale / No Promoter")
                
                amount = float(t.get("raised", 0) or t.get("total_paid", 0) or price)
                comm = calculate_ticket_commission(t.get("rate_name", "Unknown Rate"), price, t.get("rate_slug", "unknown-slug"), custom_commissions, promoter_name=promoter_name)
                
                # Zero commission for venue's own accounts
                if promoter_name.lower() in NO_COMMISSION_PROMOTERS:
                    comm = 0.0
                
                if promoter_id not in promoter_cash:
                    promoter_cash[promoter_id] = {
                        "name": promoter_name,
                        "amount": 0.0,
                        "commission": 0.0,
                        "breakdown": {}
                    }
                promoter_cash[promoter_id]["amount"] += amount
                promoter_cash[promoter_id]["commission"] += comm
                
                # Ticket type breakdown
                rate_name = t.get("rate_name", "Unknown Rate")
                breakdown_key = f"{rate_name} ({price:.2f}€)"
                if breakdown_key not in promoter_cash[promoter_id]["breakdown"]:
                    promoter_cash[promoter_id]["breakdown"][breakdown_key] = {
                        "count": 0,
                        "price": price,
                        "rate_name": rate_name,
                        "commission_unit": comm
                    }
                promoter_cash[promoter_id]["breakdown"][breakdown_key]["count"] += 1

        # Add to report
        for p_id, data in promoter_cash.items():
            db_key = f"{ev_id}_{p_id}"
            db_record = db.get(db_key, {})
            
            amount = data["amount"]
            commission = data["commission"]
            net_due = max(0.0, amount - commission)
            
            total_gathered += amount
            total_commission += commission
            total_net_due += net_due
            
            # Resolve returned amount and handle compatibility with legacy boolean
            db_returned_amt = db_record.get("returned_amount")
            db_returned_bool = db_record.get("returned", False)
            
            if db_returned_amt is not None:
                if db_returned_amt == -1.0:
                    returned_amount = net_due if db_returned_bool else 0.0
                else:
                    returned_amount = float(db_returned_amt)
            else:
                returned_amount = net_due if db_returned_bool else 0.0
            
            # Cap the values to net_due to avoid boundaries anomalies
            returned_amount = min(returned_amount, net_due)
            returned_amount = max(0.0, returned_amount)
            
            # Check statuses against net_due
            is_returned = returned_amount >= net_due
            is_partial = 0.0 < returned_amount < net_due
            
            total_returned += returned_amount
            total_pending += (net_due - returned_amount)
            
            # Compile breakdown descriptions sorted by unit price descending
            breakdown_list = []
            sorted_keys = sorted(data["breakdown"].keys(), key=lambda k: data["breakdown"][k]["price"], reverse=True)
            for k in sorted_keys:
                bd_item = data["breakdown"][k]
                comm_info = f" | Comm: {bd_item['commission_unit'] * bd_item['count']:.2f}€" if bd_item['commission_unit'] > 0 else ""
                breakdown_list.append(f"{bd_item['count']}x {bd_item['rate_name']} ({bd_item['price']:.2f}€){comm_info}")
                
            report_data.append({
                "event_id": ev_id,
                "event_name": ev_name,
                "event_date": ev_date,
                "promoter_id": p_id,
                "promoter_name": data["name"],
                "amount": amount,
                "commission": commission,
                "net_due": net_due,
                "returned_amount": returned_amount,
                "returned": is_returned,
                "partial": is_partial,
                "returned_at": db_record.get("returned_at", ""),
                "breakdown": breakdown_list,
                "event_date_raw": ev_date_raw or 0
            })
            
    # Sort report data: pending first, then by event date (newest first)
    report_data.sort(key=lambda x: (x["returned"], -x["event_date_raw"]))
    
    return {
        "items": report_data,
        "total_gathered": total_gathered,
        "total_commission": total_commission,
        "total_net_due": total_net_due,
        "total_returned": total_returned,
        "total_pending": total_pending,
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }

def gather_online_report(start_date=None, end_date=None):
    db = load_db()
    custom_commissions = load_commissions()
    
    # 1. Resolve promoters (users)
    users = get_fourvenues_data("users")
    users_dict = {
        u["_id"]: f"{u['profile']['name']} {u['profile']['last_name']}".strip() or u.get("email")
        for u in users
    }
    
    # 2. Get events for specified date range (default: 7 days ago to 14 days in the future)
    if not start_date:
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
    events = get_fourvenues_data(f"events?start={start_date}&end={end_date}")
    
    event_tickets_map = get_all_event_tickets(events)
    
    report_data = []
    
    total_sales = 0.0
    total_commission_owed = 0.0
    total_paid = 0.0
    total_pending = 0.0
    
    for event in events:
        ev_id = event["_id"]
        ev_name = event["name"]
        ev_date_raw = event.get("date")
        
        # Format date for display
        if ev_date_raw:
            try:
                ev_date = datetime.fromtimestamp(ev_date_raw, tz=ZoneInfo("Europe/Madrid") if ZoneInfo else None).strftime("%d/%m/%Y")
            except Exception:
                ev_date = str(ev_date_raw)
        else:
            ev_date = "N/A"
            
        tickets = event_tickets_map.get(ev_id, [])
        
        # Aggregate by promoter
        promoter_online = {}
        for t in tickets:
            if t.get("status") == "cancelled":
                continue
                
            price = float(t.get("price", 0))
            payment_id = t.get("payment_id")
            referral_id = t.get("referral_id")
            sale_type = t.get("sale_type", "")
            
            # Online ticket condition: has payment_id or marked as online sale
            if price >= 0 and (payment_id or sale_type == "online"):
                promoter_id = referral_id or "unknown"
                if promoter_id not in users_dict:
                    promoter_id = "unknown"
                promoter_name = users_dict.get(promoter_id, "Direct Sale / No Promoter")
                
                amount = float(t.get("raised", 0) or t.get("total_paid", 0) or price)
                comm = calculate_ticket_commission(t.get("rate_name", "Unknown Rate"), price, t.get("rate_slug", "unknown-slug"), custom_commissions, sale_type="online", promoter_name=promoter_name)
                
                # Zero commission for no-shows or venue's own accounts
                if t.get("enter", 0) != 1 or promoter_name.lower() in NO_COMMISSION_PROMOTERS:
                    comm = 0.0
                
                if promoter_id not in promoter_online:
                    promoter_online[promoter_id] = {
                        "name": promoter_name,
                        "amount": 0.0,
                        "commission": 0.0,
                        "breakdown": {}
                    }
                promoter_online[promoter_id]["amount"] += amount
                promoter_online[promoter_id]["commission"] += comm
                
                # Ticket type breakdown
                rate_name = t.get("rate_name", "Unknown Rate")
                breakdown_key = f"{rate_name} ({price:.2f}€)"
                if breakdown_key not in promoter_online[promoter_id]["breakdown"]:
                    promoter_online[promoter_id]["breakdown"][breakdown_key] = {
                        "count": 0,
                        "price": price,
                        "rate_name": rate_name,
                        "commission_unit": comm
                    }
                promoter_online[promoter_id]["breakdown"][breakdown_key]["count"] += 1

        # Add to report
        for p_id, data in promoter_online.items():
            db_key = f"online_{ev_id}_{p_id}"
            db_record = db.get(db_key, {})
            
            sales_amount = data["amount"]
            commission_owed = data["commission"]
            
            total_sales += sales_amount
            total_commission_owed += commission_owed
            
            # Auto-mark no-commission promoters as paid (nothing to pay)
            if data["name"].lower() in NO_COMMISSION_PROMOTERS:
                paid_amount = commission_owed
                is_paid = True
                is_partial = False
            else:
                db_paid_amt = db_record.get("paid_amount")
                db_paid_bool = db_record.get("paid", False)
                
                if db_paid_amt is not None:
                    paid_amount = commission_owed if db_paid_bool else float(db_paid_amt)
                else:
                    paid_amount = commission_owed if db_paid_bool else 0.0
                
                paid_amount = min(paid_amount, commission_owed)
                paid_amount = max(0.0, paid_amount)
                
                is_paid = paid_amount >= commission_owed
            is_partial = 0.0 < paid_amount < commission_owed
            
            total_paid += paid_amount
            total_pending += (commission_owed - paid_amount)
            
            breakdown_list = []
            sorted_keys = sorted(data["breakdown"].keys(), key=lambda k: data["breakdown"][k]["price"], reverse=True)
            for k in sorted_keys:
                bd_item = data["breakdown"][k]
                comm_info = f" | Comm: {bd_item['commission_unit'] * bd_item['count']:.2f}€" if bd_item['commission_unit'] > 0 else ""
                breakdown_list.append(f"{bd_item['count']}x {bd_item['rate_name']} ({bd_item['price']:.2f}€){comm_info}")
                
            report_data.append({
                "event_id": ev_id,
                "event_name": ev_name,
                "event_date": ev_date,
                "promoter_id": p_id,
                "promoter_name": data["name"],
                "amount": sales_amount,
                "commission": commission_owed,
                "net_due": commission_owed,
                "paid_amount": paid_amount,
                "paid": is_paid,
                "partial": is_partial,
                "paid_at": db_record.get("paid_at", ""),
                "breakdown": breakdown_list,
                "event_date_raw": ev_date_raw or 0
            })
            
    report_data.sort(key=lambda x: (x["paid"], -x["event_date_raw"]))
    
    return {
        "items": report_data,
        "total_sales": total_sales,
        "total_commission_owed": total_commission_owed,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }

def gather_promoter_profile(promoter_id, start_date=None, end_date=None):
    db = load_db()
    custom_commissions = load_commissions()
    
    users = get_fourvenues_data("users")
    users_dict = {
        u["_id"]: f"{u['profile']['name']} {u['profile']['last_name']}".strip() or u.get("email")
        for u in users
    }
    
    promoter_name = users_dict.get(promoter_id, "Direct Sale / No Promoter")
    
    if not start_date:
        current_year = datetime.now().year
        start_date = f"{current_year}-01-01"
    if not end_date:
        end_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
    events = get_fourvenues_data(f"events?start={start_date}&end={end_date}")
    
    event_tickets_map = get_all_event_tickets(events)
    
    total_tickets = 0
    total_revenue = 0.0
    total_commission = 0.0
    total_no_shows = 0
    total_paid_out = 0.0
    
    event_history = []
    
    for event in events:
        ev_id = event["_id"]
        ev_name = event["name"]
        ev_date_raw = event.get("date")
        
        if ev_date_raw:
            try:
                ev_date = datetime.fromtimestamp(ev_date_raw, tz=ZoneInfo("Europe/Madrid") if ZoneInfo else None).strftime("%d/%m/%Y")
                ev_month_key = datetime.fromtimestamp(ev_date_raw, tz=ZoneInfo("Europe/Madrid") if ZoneInfo else None).strftime("%B %Y") # e.g. July 2026
            except Exception:
                ev_date = str(ev_date_raw)
                ev_month_key = "Unknown Month"
        else:
            ev_date = "N/A"
            ev_month_key = "Unknown Month"
            
        tickets = event_tickets_map.get(ev_id, [])
        
        event_tickets = 0
        event_no_shows = 0
        
        event_cash_revenue = 0.0
        event_cash_comm = 0.0
        event_online_comm = 0.0
        
        for t in tickets:
            if t.get("status") == "cancelled":
                continue
                
            ref_id = t.get("referral_id")
            if (ref_id or "unknown") == promoter_id:
                price = float(t.get("price", 0))
                sale_type = "online" if t.get("payment_id") or t.get("sale_type") == "online" else "cash"
                
                event_tickets += 1
                
                # Check if it's a no-show
                if t.get("enter", 0) == 0 and t.get("status") == "activated":
                    event_no_shows += 1
                
                # Commission
                comm = 0.0
                if promoter_name.lower() not in NO_COMMISSION_PROMOTERS:
                    comm = calculate_ticket_commission(t.get("rate_name", "Unknown Rate"), price, t.get("rate_slug", "unknown-slug"), custom_commissions, sale_type=sale_type, promoter_name=promoter_name)
                    
                    if sale_type == "online" and t.get("enter", 0) != 1:
                        comm = 0.0
                
                if sale_type == "cash":
                    event_cash_revenue += price
                    event_cash_comm += comm
                else:
                    event_online_comm += comm
                    
        if event_tickets > 0:
            db_cash_key = f"{ev_id}_{promoter_id}"
            db_online_key = f"online_{ev_id}_{promoter_id}"
            
            cash_rec = db.get(db_cash_key, {})
            online_rec = db.get(db_online_key, {})
            
            cash_net_due = max(0.0, event_cash_revenue - event_cash_comm)
            
            # Cash tracking
            cash_returned = 0.0
            db_returned_amt = cash_rec.get("returned_amount")
            db_returned_bool = cash_rec.get("returned", False)
            
            if db_returned_amt is not None:
                if db_returned_amt == -1.0:
                    cash_returned = cash_net_due if db_returned_bool else 0.0
                else:
                    cash_returned = float(db_returned_amt)
            else:
                cash_returned = cash_net_due if db_returned_bool else 0.0
                
            cash_returned = min(cash_returned, cash_net_due)
            cash_returned = max(0.0, cash_returned)
            
            cash_pending = max(0.0, cash_net_due - cash_returned)
            
            # Online tracking
            online_paid = 0.0
            if online_rec.get("paid_amount") is not None and online_rec.get("paid_amount") > 0:
                online_paid = online_rec["paid_amount"]
            elif online_rec.get("paid") or promoter_name.lower() in NO_COMMISSION_PROMOTERS:
                online_paid = event_online_comm
                
            online_pending = max(0.0, event_online_comm - online_paid)
            
            score = round(((event_tickets - event_no_shows) / event_tickets) * 100, 1)
            
            total_tickets += event_tickets
            total_no_shows += event_no_shows
            
            event_history.append({
                "event_id": ev_id,
                "promoter_id": promoter_id,
                "event_date": ev_date,
                "month_key": ev_month_key,
                "event_name": ev_name,
                "tickets": event_tickets,
                "no_shows": event_no_shows,
                "score": score,
                "cash_net_due": cash_net_due,
                "cash_returned": cash_returned,
                "cash_pending": cash_pending,
                "online_comm": event_online_comm,
                "online_paid": online_paid,
                "online_pending": online_pending,
                "event_date_raw": ev_date_raw or 0
            })
            
    # Sort history descending by date 
    event_history.sort(key=lambda x: -x["event_date_raw"])
    
    # Group by month
    monthly_history = {}
    for ev in event_history:
        mk = ev["month_key"]
        if mk not in monthly_history:
            monthly_history[mk] = []
        monthly_history[mk].append(ev)
    
    # Create final array of months for ordered rendering with month totals
    history_grouped = []
    for mk, events in monthly_history.items():
        month_revenue = sum(ev.get("cash_revenue", 0.0) + ev.get("online_revenue", 0.0) for ev in events)
        month_cash_pending = sum(ev.get("cash_pending", 0.0) for ev in events)
        month_online_pending = sum(ev.get("online_pending", 0.0) for ev in events)
        history_grouped.append({
            "month": mk,
            "month_revenue": month_revenue,
            "month_cash_pending": month_cash_pending,
            "month_online_pending": month_online_pending,
            "events": events
        })
    
    avg_score = round(((total_tickets - total_no_shows) / total_tickets) * 100, 1) if total_tickets > 0 else 0.0
    
    # Overall balances across all events
    total_cash_pending = sum(ev["cash_pending"] for ev in event_history)
    total_online_pending = sum(ev["online_pending"] for ev in event_history)
    
    return {
        "promoter_name": promoter_name,
        "total_tickets": total_tickets,
        "total_revenue": total_revenue,
        "total_cash_pending": total_cash_pending,
        "total_online_pending": total_online_pending,
        "avg_score": avg_score,
        "history_grouped": history_grouped
    }

def build_email_body(report):
    # CSS styled HTML email with premium branding matching La French
    rows = ""
    for item in report["items"]:
        if item["returned"]:
            status_badge = '<span style="background-color: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase;">Returned</span>'
        elif item["partial"]:
            status_badge = '<span style="background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase;">Partial</span>'
        else:
            status_badge = '<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase;">Pending</span>'
            
        cash_display = f"""
        <div style="font-weight: 600; color: #111827;">Gross: {item['amount']:.2f}€</div>
        """
        if item["commission"] > 0:
            cash_display += f"""
            <div style="font-size: 11px; color: #b45309; margin-top: 1px;">Comm: -{item['commission']:.2f}€</div>
            <div style="font-size: 12px; font-weight: 600; color: #1e3a8a; margin-top: 2px; border-top: 1px solid #e5e7eb; padding-top: 2px;">Net Due: {item['net_due']:.2f}€</div>
            """
        else:
            cash_display += f"""
            <div style="font-size: 12px; font-weight: 600; color: #1e3a8a; margin-top: 2px;">Net Due: {item['net_due']:.2f}€</div>
            """
            
        if item["returned"]:
            pass  # fully paid
        elif item["partial"]:
            cash_display += f"""
            <div style="font-size: 11px; color: #059669; margin-top: 2px; font-weight: 500;">Recv: {item['returned_amount']:.2f}€</div>
            <div style="font-size: 11px; color: #dc2626; font-weight: 500;">Owed: {item['net_due'] - item['returned_amount']:.2f}€</div>
            """
        else:
            cash_display += f"""
            <div style="font-size: 11px; color: #dc2626; margin-top: 2px; font-weight: 500;">Owed: {item['net_due']:.2f}€</div>
            """
            
        breakdown_html = "<br>".join([f'<span style="color: #6b7280; font-size: 11px;">{bd}</span>' for bd in item["breakdown"]])
        rows += f"""
        <tr style="border-bottom: 1px solid #e5e7eb; vertical-align: top;">
            <td style="padding: 12px 8px; font-size: 14px; color: #374151;">{item['event_date']}</td>
            <td style="padding: 12px 8px; font-size: 14px; font-weight: 500; color: #111827;">{item['event_name']}</td>
            <td style="padding: 12px 8px; font-size: 14px; color: #4b5563;">
                <span style="font-weight: 500; color: #111827;">{item['promoter_name']}</span>
                <div style="margin-top: 4px;">{breakdown_html}</div>
            </td>
            <td style="padding: 12px 8px; font-size: 13px; text-align: right; color: #111827; white-space: nowrap;">{cash_display}</td>
            <td style="padding: 12px 8px; text-align: center; white-space: nowrap;">{status_badge}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>La French - Daily Cash Report</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
            <!-- Header -->
            <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LA FRENCH BARCELONA</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Daily Cash Promoter Report • {report['timestamp']}</p>
                </td>
            </tr>
            <!-- Stats -->
            <tr>
                <td style="padding: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="25%" style="text-align: center; padding: 10px; background-color: #f9fafb; border-radius: 8px 0 0 8px; border: 1px solid #e5e7eb; border-right: none;">
                                <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Gross Collected</div>
                                <div style="font-size: 16px; font-weight: 800; color: #111827; margin-top: 4px;">{report['total_gathered']:.2f}€</div>
                            </td>
                            <td width="25%" style="text-align: center; padding: 10px; background-color: #fffbeb; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; border-right: none;">
                                <div style="font-size: 10px; font-weight: 700; color: #b45309; text-transform: uppercase;">Commissions</div>
                                <div style="font-size: 16px; font-weight: 800; color: #b45309; margin-top: 4px;">{report['total_commission']:.2f}€</div>
                            </td>
                            <td width="25%" style="text-align: center; padding: 10px; background-color: #ecfdf5; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                                <div style="font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase;">Returned</div>
                                <div style="font-size: 16px; font-weight: 800; color: #065f46; margin-top: 4px;">{report['total_returned']:.2f}€</div>
                            </td>
                            <td width="25%" style="text-align: center; padding: 10px; background-color: #fef2f2; border-radius: 0 8px 8px 0; border: 1px solid #e5e7eb; border-left: none;">
                                <div style="font-size: 10px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Pending</div>
                                <div style="font-size: 16px; font-weight: 800; color: #991b1b; margin-top: 4px;">{report['total_pending']:.2f}€</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <!-- Breakdown Table -->
            <tr>
                <td style="padding: 0 24px 20px 24px;">
                    <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">Promoter Breakdown</h2>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
                                <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; width: 15%;">Date</th>
                                <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; width: 35%;">Event</th>
                                <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; width: 25%;">Promoter</th>
                                <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; text-align: right; width: 15%;">Cash Summary</th>
                                <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; text-align: center; width: 10%;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows if rows else '<tr><td colspan="5" style="padding: 20px; text-align: center; font-size: 14px; color: #6b7280;">No promoter cash registered for current events.</td></tr>'}
                        </tbody>
                    </table>
                </td>
            </tr>
            <!-- Call to Action -->
            <tr>
                <td style="padding: 10px 24px 30px 24px; text-align: center;">
                    <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">Open the tracking sheet to mark pending cash as returned, check details, or add manual adjustments.</p>
                    <a href="{DASHBOARD_URL}" target="_blank" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">Open Tracking Sheet Dashboard</a>
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                    This email is automated. To change the schedule, update the launchd service on the host machine.<br>
                    © 2026 La French Barcelona. All rights reserved.
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html

def send_email(html_content, report_summary):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("\n[WARNING] Email not sent: SMTP_USERNAME or SMTP_PASSWORD is not configured in .env.")
        print("Generated HTML report output printed below:\n")
        print("="*60)
        print(f"Summary: Gathered={report_summary['total_gathered']}€, Returned={report_summary['total_returned']}€, Pending={report_summary['total_pending']}€")
        print("="*60)
        return False
        
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"La French Cash Report - {report_summary['total_pending']:.2f}€ Pending"
        msg['From'] = SMTP_USERNAME
        msg['To'] = RECIPIENT_EMAIL
        
        msg.attach(MIMEText("Please enable HTML to view the Cash Report summary.", 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, int(SMTP_PORT))
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, RECIPIENT_EMAIL, msg.as_string())
        server.quit()
        print("Daily Cash Report email sent successfully!")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def gather_event_profile(event_id, event_name="Unknown Event", event_date="Unknown Date"):
    users = get_fourvenues_data("users")
    users_dict = {
        u["_id"]: f"{u['profile']['name']} {u['profile']['last_name']}".strip() or u.get("email")
        for u in users
    }
    
    tickets = get_fourvenues_data(f"tickets/?event_id={event_id}")
    
    total_tickets = 0
    total_revenue = 0.0
    actual_net_revenue = 0.0
    expected_net_revenue = 0.0
    total_entered = 0
    
    ticket_types = {}
    promoters = {}
    timeline_day_dict = {}
    timeline_hour_dict = {}
    
    for t in tickets:
        if t.get("status") == "cancelled":
            continue
            
        price = float(t.get("price", 0))
        is_entered = (t.get("enter", 0) == 1)
        
        rate_name = t.get("rate_name", "").upper()
        event_upper = event_name.upper()
        is_fanzone = ("FANZONE" in event_upper or "FAN ZONE" in event_upper or "FAN ZONE" in rate_name)
        
        is_villarroel_fanzone = ("FRANCE - ESPAGNE FAN ZONE FIRA VILLARROEL" in event_upper)
        if is_villarroel_fanzone and price == 10.0:
            act_net = 10.0
            exp_net = 10.0
        elif is_villarroel_fanzone and price == 15.0:
            act_net = 8.0
            exp_net = 8.0
        elif price == 10.0:
            act_net = 3.0 if is_entered else price
            exp_net = (price * 0.15) + (3.0 * 0.85)
        elif price == 0.0 and is_fanzone:
            act_net = 3.0 if is_entered else 0.0
            exp_net = (0.0 * 0.15) + (3.0 * 0.85)
        else:
            # For 7€ tickets, since we give 3€ and receive 3€, the net revenue is exactly 7€
            act_net = price
            exp_net = price
            
        total_tickets += 1
        total_revenue += price
        actual_net_revenue += act_net
        expected_net_revenue += exp_net
        
        created_at = t.get("created_at")
        time_full, day = parse_fourvenues_time(created_at)
        
        if day != "Unknown":
            if day not in timeline_day_dict:
                timeline_day_dict[day] = {"sales": 0, "revenue": 0.0}
            timeline_day_dict[day]["sales"] += 1
            timeline_day_dict[day]["revenue"] += price
            
            if " " in time_full:
                hour = time_full.split(" ")[1].split(":")[0] + ":00"
                if hour not in timeline_hour_dict:
                    timeline_hour_dict[hour] = {"sales": 0, "revenue": 0.0}
                timeline_hour_dict[hour]["sales"] += 1
                timeline_hour_dict[hour]["revenue"] += price
        
        is_entered = (t.get("enter", 0) == 1)
        if is_entered:
            total_entered += 1
            
        rate_name = t.get("rate_name", "Unknown Rate")
        if rate_name not in ticket_types:
            ticket_types[rate_name] = {"sold": 0, "revenue": 0.0, "actual_net_revenue": 0.0, "expected_net_revenue": 0.0}
        ticket_types[rate_name]["sold"] += 1
        ticket_types[rate_name]["revenue"] += price
        ticket_types[rate_name]["actual_net_revenue"] += act_net
        ticket_types[rate_name]["expected_net_revenue"] += exp_net
        
        referral_id = t.get("referral_id")
        promoter_id = referral_id or "unknown"
        if promoter_id not in users_dict:
            promoter_id = "unknown"
        promoter_name = users_dict.get(promoter_id, "Direct Sale / No Promoter")
        
        if promoter_name not in promoters:
            promoters[promoter_name] = {"sold": 0, "revenue": 0.0}
        promoters[promoter_name]["sold"] += 1
        promoters[promoter_name]["revenue"] += price

    no_show_rate = 0.0
    if total_tickets > 0:
        no_show_rate = round(((total_tickets - total_entered) / total_tickets) * 100, 1)

    is_future = (total_entered == 0 and total_tickets > 0)
    
    # Sort ticket types by revenue descending
    ticket_breakdown = [
        {
            "name": k, 
            "sold": v["sold"], 
            "revenue": v["revenue"],
            "net_revenue": v["expected_net_revenue"] if is_future else v["actual_net_revenue"]
        }
        for k, v in ticket_types.items()
    ]
    ticket_breakdown.sort(key=lambda x: x["revenue"], reverse=True)
    
    # Sort promoters by revenue descending
    promoter_breakdown = [
        {"name": k, "sold": v["sold"], "revenue": v["revenue"]}
        for k, v in promoters.items()
    ]
    promoter_breakdown.sort(key=lambda x: x["revenue"], reverse=True)

    timeline_day = [
        {"date": k, "sales": v["sales"], "revenue": v["revenue"]}
        for k, v in sorted(timeline_day_dict.items())
    ]
    
    timeline_hour = [
        {"hour": k, "sales": v["sales"], "revenue": v["revenue"]}
        for k, v in sorted(timeline_hour_dict.items())
    ]

    total_net_revenue = expected_net_revenue if is_future else actual_net_revenue

    return {
        "event_name": event_name,
        "event_date": event_date,
        "total_tickets": total_tickets,
        "total_revenue": total_revenue,
        "total_net_revenue": total_net_revenue,
        "total_entered": total_entered,
        "no_show_rate": no_show_rate,
        "ticket_breakdown": ticket_breakdown,
        "promoter_breakdown": promoter_breakdown,
        "timeline_day": timeline_day,
        "timeline_hour": timeline_hour
    }

def gather_sales_history(start_date=None, end_date=None):
    """
    Fetches all individual ticket sales within the given date range.
    """
    # To get tickets sold between start_date and end_date, 
    # we need events that could potentially contain these sales.
    # We fetch events from the start of the year (or earlier) to future.
    if not start_date:
        current_year = datetime.now().year
        start_date = f"{current_year}-01-01"
    if not end_date:
        end_date = f"{datetime.now().year}-12-31"
        
    fetch_start = "2024-01-01" # Broad fetch to ensure we catch all tickets
    fetch_end = (datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=365)).strftime("%Y-%m-%d")
    events = get_fourvenues_data(f"events?start={fetch_start}&end={fetch_end}")
    
    users = get_fourvenues_data("users")
    users_dict = {
        u["_id"]: f"{u['profile']['name']} {u['profile']['last_name']}".strip() or u.get("email")
        for u in users
    }
    
    event_tickets_map = get_all_event_tickets(events)
    sales = []
    
    for event in events:
        event_id = event["_id"]
        event_name = event.get("name", "Unknown Event")
        event_date_raw = event.get("date")
        
        event_date_str = "Unknown"
        if event_date_raw:
            event_date_str = datetime.fromtimestamp(event_date_raw, tz=ZoneInfo("Europe/Madrid") if ZoneInfo else None).strftime("%Y-%m-%d")
            
        tickets = event_tickets_map.get(event_id)
        if not tickets:
            continue
            
        for t in tickets:
            created_at = t.get("created_at")
            if not created_at:
                continue
                
            sale_time, day_str = parse_fourvenues_time(created_at)
            
            if start_date and day_str < start_date:
                continue
            if end_date and day_str > end_date:
                continue
                
            promoter_id = t.get("referral_id") or "unknown"
            promoter_name = users_dict.get(promoter_id, "Direct Sale / No Promoter")
            payment_method = "Online" if t.get("payment_id") else "Cash"
            price = float(t.get("price", 0))
            status = t.get("status", "activated")
            
            sales.append({
                "sale_date": sale_time,
                "event_id": event_id,
                "event_date": event_date_str,
                "event_name": event_name,
                "promoter_id": promoter_id,
                "promoter_name": promoter_name,
                "payment_method": payment_method,
                "price": price,
                "status": status
            })
            
    # Sort sales newest first
    sales.sort(key=lambda x: x["sale_date"], reverse=True)
    return sales

def gather_events_performance(start_date=None, end_date=None):
    """
    Fetches events and calculates performance stats (tickets, revenue, entrances) for each.
    """
    if not start_date:
        current_year = datetime.now().year
        start_date = f"{current_year}-01-01"
    if not end_date:
        end_date = f"{datetime.now().year}-12-31"
        
    # We fetch a bit wider to capture all events
    fetch_end = (datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=365)).strftime("%Y-%m-%d")
    events = get_fourvenues_data(f"events?start={start_date}&end={fetch_end}")
    
    event_tickets_map = get_all_event_tickets(events)
    
    events_stats = []
    for event in events:
        event_id = event["_id"]
        event_name = event.get("name", "Unknown Event")
        event_date_raw = event.get("date")
        
        event_date_str = "Unknown"
        if event_date_raw:
            event_date_str = datetime.fromtimestamp(event_date_raw, tz=ZoneInfo("Europe/Madrid") if ZoneInfo else None).strftime("%Y-%m-%d")
            
        # Filter by event date
        if event_date_str != "Unknown":
            if start_date and event_date_str < start_date:
                continue
            if end_date and event_date_str > end_date:
                continue
                
        tickets = event_tickets_map.get(event_id, [])
        
        total_tickets = 0
        total_revenue = 0.0
        total_entered = 0
        
        for t in tickets:
            if t.get("status") == "cancelled":
                continue
            
            total_tickets += 1
            total_revenue += float(t.get("price", 0))
            if t.get("enter", 0) == 1:
                total_entered += 1
                
        no_show_rate = 0.0
        if total_tickets > 0:
            no_show_rate = round(((total_tickets - total_entered) / total_tickets) * 100, 2)
            
        events_stats.append({
            "event_id": event_id,
            "event_name": event_name,
            "event_date": event_date_str,
            "total_tickets": total_tickets,
            "total_revenue": total_revenue,
            "total_entered": total_entered,
            "no_show_rate": no_show_rate
        })
        
    return events_stats


if __name__ == "__main__":
    print("Generating daily cash report...")
    report = gather_cash_report()
    html = build_email_body(report)
    send_email(html, report)

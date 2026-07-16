import os
import json
from flask import Flask, jsonify, request, send_from_directory
from email_sender import (gather_cash_report, build_email_body, send_email, DB_PATH, 
                          gather_performance_report, gather_online_report, gather_promoter_profile,
                          gather_sales_history, gather_events_performance)
from datetime import datetime, timedelta

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

# Initialize Flask app
# We configure it to serve static files from the 'frontend' folder
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

def load_db():
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_db(data):
    try:
        with open(DB_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving to DB: {e}")
        return False

# Serve index.html on root route
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


# API: Get compiled promoter cash status
@app.route('/api/data', methods=['GET'])
def get_data():
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        report = gather_cash_report(start_date=start, end_date=end)
        return jsonify({"success": True, "data": report})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Get compiled promoter performance metrics
@app.route('/api/performance', methods=['GET'])
def get_performance():
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        report = gather_performance_report(start_date=start, end_date=end)
        return jsonify({"success": True, "data": report})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Get compiled event performance metrics
@app.route('/api/events/performance', methods=['GET'])
def get_events_performance():
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        report = gather_events_performance(start_date=start, end_date=end)
        return jsonify({"success": True, "data": report})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Get full sales history
@app.route('/api/sales', methods=['GET'])
def get_sales_history():
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        sales = gather_sales_history(start_date=start, end_date=end)
        return jsonify({"success": True, "data": sales})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Get promoter profile and history
@app.route('/api/promoter/<promoter_id>', methods=['GET'])
def get_promoter_profile(promoter_id):
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        report = gather_promoter_profile(promoter_id, start_date=start, end_date=end)
        return jsonify({"success": True, "data": report})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Toggle cash returned state
@app.route('/api/toggle', methods=['POST'])
def toggle_returned():
    req_data = request.json or {}
    event_id = req_data.get("event_id")
    promoter_id = req_data.get("promoter_id")
    
    returned_amount = req_data.get("returned_amount")
    returned_bool = req_data.get("returned")
    
    if not event_id or not promoter_id:
        return jsonify({"success": False, "error": "Missing event_id or promoter_id"}), 400
        
    db = load_db()
    db_key = f"{event_id}_{promoter_id}"
    
    if returned_amount is not None:
        try:
            amt = float(returned_amount)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid returned_amount value"}), 400
            
        db[db_key] = {
            "returned_amount": amt,
            "returned": False,  # Will be calculated dynamically in gather_cash_report
            "returned_at": datetime.now().isoformat() if amt > 0 else ""
        }
    else:
        # Fallback to boolean toggle
        is_ret = bool(returned_bool)
        db[db_key] = {
            "returned": is_ret,
            "returned_at": datetime.now().isoformat() if is_ret else "",
            "returned_amount": -1.0  # Sentinel indicating we should evaluate full amount/zero
        }
        
    if save_db(db):
        try:
            report = gather_cash_report()
            return jsonify({"success": True, "data": report})
        except Exception as e:
            return jsonify({"success": True, "message": "Saved, but failed to reload report", "error": str(e)})
    else:
        return jsonify({"success": False, "error": "Failed to save data"}), 500

# API: Get compiled promoter online sales tracking
@app.route('/api/online-data', methods=['GET'])
def get_online_data():
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        report = gather_online_report(start_date=start, end_date=end)
        return jsonify({"success": True, "data": report})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Toggle online commission paid state
@app.route('/api/toggle-online', methods=['POST'])
def toggle_online_paid():
    req_data = request.json or {}
    event_id = req_data.get("event_id")
    promoter_id = req_data.get("promoter_id")
    
    paid_amount = req_data.get("paid_amount")
    paid_bool = req_data.get("paid")
    
    if not event_id or not promoter_id:
        return jsonify({"success": False, "error": "Missing event_id or promoter_id"}), 400
        
    db = load_db()
    db_key = f"online_{event_id}_{promoter_id}"
    
    if paid_amount is not None:
        try:
            amt = float(paid_amount)
        except ValueError:
            return jsonify({"success": False, "error": "Invalid paid_amount value"}), 400
            
        db[db_key] = {
            "paid_amount": amt,
            "paid": False,  # Evaluated dynamically in gather_online_report
            "paid_at": datetime.now().isoformat() if amt > 0 else ""
        }
    else:
        is_paid = bool(paid_bool)
        db[db_key] = {
            "paid": is_paid,
            "paid_at": datetime.now().isoformat() if is_paid else "",
            "paid_amount": -1.0
        }
        
    if save_db(db):
        try:
            report = gather_online_report()
            return jsonify({"success": True, "data": report})
        except Exception as e:
            return jsonify({"success": True, "message": "Saved, but failed to reload report", "error": str(e)})
    else:
        return jsonify({"success": False, "error": "Failed to save data"}), 500

@app.route('/api/toggle-online-batch', methods=['POST'])
def toggle_online_batch():
    try:
        from email_sender import load_db, save_db
        db = load_db()
        req_data = request.json
        if not req_data or "updates" not in req_data:
            return jsonify({"success": False, "error": "Missing updates list"}), 400
            
        for update in req_data["updates"]:
            event_id = update.get("event_id")
            promoter_id = update.get("promoter_id")
            paid_amount = update.get("paid_amount")
            
            db_key = f"online_{event_id}_{promoter_id}"
            db[db_key] = {
                "paid_amount": float(paid_amount),
                "paid": False,
                "paid_at": datetime.now().isoformat()
            }
            
        if save_db(db):
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "error": "Failed to save db"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Get Event CRM Profile
@app.route('/api/event/<event_id>', methods=['GET'])
def get_event_profile(event_id):
    try:
        from email_sender import gather_event_profile
        
        event_name = request.args.get('name', 'Unknown Event')
        event_date = request.args.get('date', 'Unknown Date')
        
        profile = gather_event_profile(event_id, event_name, event_date)
        return jsonify({"success": True, "data": profile})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Trigger manual email
@app.route('/api/send-email', methods=['POST'])
def manual_email():
    try:
        from email_sender import run_full_report
        run_full_report()
        return jsonify({"success": True, "message": "Email sent successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

import re
import requests

@app.route('/api/scrape', methods=['GET'])
def scrape_url():
    url = request.args.get('url')
    if not url:
        return jsonify({"success": False, "error": "No URL provided"}), 400
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        resp = requests.get(url, headers=headers, timeout=10)
        
        # Strip script and style tags completely
        text = re.sub(r'<style.*?>.*?</style>', ' ', resp.text, flags=re.IGNORECASE|re.DOTALL)
        text = re.sub(r'<script.*?>.*?</script>', ' ', text, flags=re.IGNORECASE|re.DOTALL)
        # Strip remaining HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        # Collapse whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Return first 6000 chars to save tokens
        return jsonify({"success": True, "data": text[:6000]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Get wallet balance
@app.route('/api/wallet', methods=['GET'])
def get_wallet():
    try:
        from email_sender import get_fourvenues_data
        data = get_fourvenues_data("wallet-movements/", return_none_on_error=True)
        if data and isinstance(data, list) and len(data) > 0:
            balance = data[0].get("final_amount", 0.0)
            return jsonify({"success": True, "balance": balance})
        else:
            return jsonify({"success": False, "error": "No wallet data found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Get unique rates list with commissions
@app.route('/api/rates', methods=['GET'])
def get_rates():
    try:
        from email_sender import get_fourvenues_data, load_commissions, calculate_ticket_commission, NO_COMMISSION_PROMOTERS
        
        # Get events for specified date range (or default)
        start_date = request.args.get('start') or (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = request.args.get('end') or (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        events = get_fourvenues_data(f"events?start={start_date}&end={end_date}")
        
        custom_commissions = load_commissions()
        
        unique_rates = {}
        for event in events:
            ev_id = event["_id"]
            ev_name = event["name"]
            ev_date_raw = event.get("date")
            
            if ev_date_raw:
                try:
                    ev_date = datetime.fromtimestamp(ev_date_raw, tz=ZoneInfo("Europe/Madrid") if ZoneInfo else None).strftime("%d/%m/%Y")
                except Exception:
                    ev_date = str(ev_date_raw)
            else:
                ev_date = "N/A"
                
            tickets = get_fourvenues_data(f"tickets/?event_id={ev_id}")
            for t in tickets:
                price = float(t.get("price", 0))
                payment_id = t.get("payment_id")
                
                rate_name = t.get("rate_name", "Unknown Rate")
                rate_slug = t.get("rate_slug", "unknown-slug")
                rate_id = t.get("rate_id", "unknown-rate-id")
                
                key = f"{ev_id}_{rate_slug}"
                if key not in unique_rates:
                    comm_cash = calculate_ticket_commission(rate_name, price, rate_slug, custom_commissions, sale_type="cash")
                    comm_online = calculate_ticket_commission(rate_name, price, rate_slug, custom_commissions, sale_type="online")
                    unique_rates[key] = {
                        "event_id": ev_id,
                        "event_name": ev_name,
                        "event_date": ev_date,
                        "rate_id": rate_id,
                        "rate_name": rate_name,
                        "rate_slug": rate_slug,
                        "price": price,
                        "commission_cash": comm_cash,
                        "commission_online": comm_online,
                        "event_date_raw": ev_date_raw or 0
                    }
                        
        rates_list = list(unique_rates.values())
        rates_list.sort(key=lambda x: (-x["event_date_raw"], x["rate_name"]))
        
        return jsonify({"success": True, "rates": rates_list})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# API: Save custom commission for a ticket rate
@app.route('/api/commissions', methods=['POST'])
def save_rate_commissions():
    try:
        from email_sender import load_commissions, save_commissions
        
        req_data = request.json or {}
        rate_slug = req_data.get("rate_slug")
        commission_cash = req_data.get("commission_cash")
        commission_online = req_data.get("commission_online")
        
        if not rate_slug:
            return jsonify({"success": False, "error": "Missing rate_slug"}), 400
            
        try:
            cash_float = float(commission_cash)
            online_float = float(commission_online)
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Invalid commission values"}), 400
            
        commissions = load_commissions()
        commissions[rate_slug] = {
            "cash": cash_float,
            "online": online_float
        }
        
        if save_commissions(commissions):
            return jsonify({"success": True, "message": f"Commissions for {rate_slug} saved successfully!"})
        else:
            return jsonify({"success": False, "error": "Failed to save commissions"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    print(f"Starting La French cash tracking server on http://localhost:{port}...")
    app.run(host='0.0.0.0', port=port, debug=True)

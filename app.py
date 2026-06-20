# RENDER DEPLOYMENT
# Environment variables to set in Render dashboard:
# NVIDIA_API_KEY = your key from build.nvidia.com
# SECRET_KEY = any random string
# FLASK_ENV = production
# Start command: gunicorn app:app
# Python version: 3.11

import os
import json
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY')

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
RESTAURANTS_FILE = os.path.join(DATA_DIR, 'restaurants.json')
SUBMISSIONS_FILE = os.path.join(DATA_DIR, 'submissions.json')
WAITLIST_FILE = os.path.join(DATA_DIR, 'waitlist.json')


def load_restaurants():
    with open(RESTAURANTS_FILE, 'r') as f:
        return json.load(f)


def save_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)


def load_json(filepath, default=None):
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            return json.load(f)
    return default or []


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/restaurants')
def restaurants():
    return render_template('restaurants.html')


@app.route('/join')
def join():
    return render_template('join.html')


@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/api/restaurants')
def api_restaurants():
    return jsonify(load_restaurants())


@app.route('/api/location', methods=['POST'])
def api_location():
    data = request.get_json()
    lat = data.get('lat')
    lng = data.get('lng')
    
    if lat is None or lng is None:
        return jsonify({'error': 'lat and lng required'}), 400
    
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}"
    headers = {"User-Agent": "VOLT-App"}
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        geo = resp.json()
        
        address = geo.get('address', {})
        area = address.get('suburb') or address.get('town') or address.get('city') or address.get('neighbourhood') or 'your area'
        postcode = address.get('postcode', '')
        
        return jsonify({'area': area, 'postcode': postcode})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.get_json()
    user_message = data.get('message', '')
    area = data.get('area', '')
    postcode = data.get('postcode', '')
    
    if not NVIDIA_API_KEY:
        return jsonify({'error': 'NVIDIA_API_KEY not configured'}), 500
    
    restaurants = load_restaurants()
    restaurant_data = json.dumps(restaurants, indent=2)
    
    location_context = f"The user is located near: {area}, {postcode}." if area else "The user's location is not known yet."
    
    system_prompt = f"""You are the VOLT assistant. VOLT is a platform that helps customers find independent local restaurants and order directly from them — with no platform commission. You help users find the right restaurant based on their mood, budget, area, and preferences.

You have access to the current list of VOLT restaurants. Always be friendly, concise, and helpful.

If the user's location is known, prioritise restaurants in or near their area.

If someone asks about a restaurant not in the list, tell them VOLT is growing and they can join the waitlist.

Never recommend Deliveroo, Uber Eats or Just Eat — always encourage direct ordering through VOLT.

{location_context}

Here is the current restaurant data: {restaurant_data}"""
    
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Accept": "application/json"
    }
    
    payload = {
        "model": "minimaxai/minimax-m3",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "max_tokens": 8192,
        "temperature": 1.00,
        "top_p": 0.95,
        "stream": False
    }
    
    try:
        resp = requests.post(invoke_url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        reply = resp.json()["choices"][0]["message"]["content"]
        return jsonify({'reply': reply})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/join', methods=['POST'])
def api_join():
    data = request.get_json()
    required = ['name', 'cuisine', 'area', 'order_link', 'contact_name', 'contact']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    submissions = load_json(SUBMISSIONS_FILE, [])
    submissions.append({
        'name': data['name'],
        'cuisine': data['cuisine'],
        'area': data['area'],
        'postcode': data.get('postcode', ''),
        'order_link': data['order_link'],
        'deal': data.get('deal', ''),
        'contact_name': data['contact_name'],
        'contact': data['contact'],
        'submitted_at': json.loads(json.dumps(__import__('datetime').datetime.now().isoformat()))
    })
    save_json(SUBMISSIONS_FILE, submissions)
    
    return jsonify({'message': "You're in. We'll review your listing and confirm on WhatsApp within 24 hours. Welcome to VOLT."})


@app.route('/api/waitlist', methods=['POST'])
def api_waitlist():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    area = data.get('area', '')
    
    if not email or '@' not in email:
        return jsonify({'error': 'Valid email required'}), 400
    
    waitlist = load_json(WAITLIST_FILE, [])
    if not any(e['email'] == email for e in waitlist):
        waitlist.append({'email': email, 'area': area})
        save_json(WAITLIST_FILE, waitlist)
    
    area_text = f" near {area}" if area else ""
    return jsonify({'message': f"You're on the list. We'll message you when restaurants{area_text} join VOLT."})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
      

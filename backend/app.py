from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, os, math, random, jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib
from email.message import EmailMessage
import razorpay
from dotenv import load_dotenv

# Load env from env.txt or .env
load_dotenv("env.txt")
load_dotenv("backend/env.txt")

razorpay_client = razorpay.Client(auth=(os.environ.get("RAZORPAY_KEY_ID", "rzp_test_dummy"), os.environ.get("RAZORPAY_KEY_SECRET", "dummy_secret")))

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

SECRET_KEY = os.environ.get("SECRET_KEY", "VELORA_SECRET_KEY_2026")
DB_PATH = "velora.db"

# ---------------- DB ----------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    # Users table
    db.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        password TEXT,
        otp TEXT,
        aadhaar_no TEXT,
        role TEXT DEFAULT 'user',
        is_driver_verified INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        driver_rating_sum REAL DEFAULT 0,
        driver_rating_count INTEGER DEFAULT 0,
        user_rating_sum REAL DEFAULT 0,
        user_rating_count INTEGER DEFAULT 0,
        avatar TEXT
    )
    ''')

    # Rides table
    db.execute('''
    CREATE TABLE IF NOT EXISTS rides (
        id INTEGER PRIMARY KEY,
        driver_id INTEGER,
        car_name TEXT,
        car_photo TEXT,
        car_year INTEGER,
        from_loc TEXT,
        to_loc TEXT,
        start_lat REAL,
        start_lng REAL,
        end_lat REAL,
        end_lng REAL,
        price REAL,
        seats INTEGER,
        total_seats INTEGER,
        ride_date TEXT,
        departure TEXT,
        arrival TEXT,
        ride_type TEXT DEFAULT 'Go',
        status TEXT DEFAULT 'pending',
        live_lat REAL,
        live_lng REAL,
        FOREIGN KEY(driver_id) REFERENCES users(id)
    )
    ''')
    
    # Bookings table
    db.execute('''
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY,
        ride_id INTEGER,
        user_id INTEGER,
        seats_booked INTEGER,
        payment_status TEXT DEFAULT 'pending',
        payment_id TEXT,
        FOREIGN KEY(ride_id) REFERENCES rides(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    ''')

    # Cars master table
    db.execute('''
    CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY,
        model TEXT UNIQUE
    )
    ''')
    
    # Pricing configs
    db.execute('''
    CREATE TABLE IF NOT EXISTS configs (
        key TEXT PRIMARY KEY,
        value REAL
    )
    ''')
    
    # Seed initial data
    if db.execute("SELECT COUNT(*) FROM cars").fetchone()[0] == 0:
        models = ["Tesla Model S", "Tesla Model 3", "Audi Q7", "BMW X5", "Mercedes S-Class", "Toyota Innova Crysta", "Honda City"]
        for m in models:
            db.execute("INSERT INTO cars (model) VALUES (?)", (m,))
            
    # Default configs
    configs = [
        ("base_rate", 12.0),
        ("surge_factor", 1.0),
        ("prime_mult", 1.5),
        ("xl_mult", 2.0)
    ]
    for k, v in configs:
        db.execute("INSERT OR IGNORE INTO configs (key, value) VALUES (?, ?)", (k, v))

    db.commit()

# ---------------- SMS/EMAIL OTP ----------------
def send_otp(identifier, otp):
    # Twilio logic
    twilio_sid = os.environ.get("TWILIO_SID")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
    twilio_phone = os.environ.get("TWILIO_PHONE")
    
    success = False
    if twilio_sid and twilio_token and twilio_phone and identifier.startswith("+"):
        try:
            from twilio.rest import Client
            client = Client(twilio_sid, twilio_token)
            client.messages.create(
                body=f"Your Velora verification code is {otp}",
                from_=twilio_phone,
                to=identifier
            )
            success = True
        except: pass
        
    # Email logic
    email_user = os.environ.get("SMTP_EMAIL")
    email_pass = os.environ.get("SMTP_PASSWORD")
    if email_user and email_pass and "@" in identifier:
        try:
            msg = EmailMessage()
            msg.set_content(f"Your Velora verification code is: {otp}")
            msg["Subject"] = "Velora Verification"
            msg["From"] = email_user
            msg["To"] = identifier
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(email_user, email_pass)
                server.send_message(msg)
            success = True
        except: pass
        
    if not success:
        print(f"[DEVELOPER MOCK] OTP for {identifier} is: {otp}")
    return success

# ---------------- JWT ----------------
def generate_token(user_id):
    return jwt.encode({
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }, SECRET_KEY, algorithm="HS256")

def verify_token(token):
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return data["user_id"]
    except:
        return None

# ---------------- API ROUTES ----------------

@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    db = get_db()
    identifier = data.get("identifier")
    password = data.get("password")
    name = data.get("name")
    aadhaar = data.get("aadhaar_no")
    role = data.get("role", "user")

    hashed = generate_password_hash(password)
    otp = str(random.randint(100000, 999999))
    
    email = identifier if "@" in identifier else None
    phone = identifier if not email else None

    try:
        db.execute(
            "INSERT INTO users (name, email, phone, password, otp, aadhaar_no, role) VALUES (?,?,?,?,?,?,?)",
            (name, email, phone, hashed, otp, aadhaar, role)
        )
        db.commit()
        sent = send_otp(identifier, otp)
        return {"success": True, "requires_otp": True, "identifier": identifier, "otp_delivered": sent, "otp_fallback": otp}
    except sqlite3.IntegrityError:
        return {"error": "User already exists"}, 400

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    identifier = data.get("identifier")
    password = data.get("password")
    db = get_db()
    
    user = db.execute("SELECT * FROM users WHERE email=? OR phone=?", (identifier, identifier)).fetchone()
    if not user or not check_password_hash(user["password"], password):
        return {"error": "Invalid credentials"}, 401

    if user["is_banned"]:
        return {"error": "Account suspended"}, 403

    otp = str(random.randint(100000, 999999))
    db.execute("UPDATE users SET otp=? WHERE id=?", (otp, user["id"]))
    db.commit()
    
    sent = send_otp(identifier, otp)
    return {"success": True, "requires_otp": True, "identifier": identifier, "otp_delivered": sent, "otp_fallback": otp}

@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json
    identifier = data.get("identifier")
    otp = data.get("otp")
    db = get_db()
    
    user = db.execute("SELECT * FROM users WHERE (email=? OR phone=?) AND otp=?", (identifier, identifier, otp)).fetchone()
    if user:
        token = generate_token(user["id"])
        u_dict = dict(user)
        if "password" in u_dict: del u_dict["password"]
        return {"success": True, "token": token, "user": u_dict}
    return {"error": "Invalid OTP"}, 401

@app.route("/api/rides", methods=["GET", "POST"])
def rides():
    db = get_db()
    if request.method == "POST":
        data = request.json
        db.execute("""
            INSERT INTO rides (driver_id, car_name, car_photo, car_year, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, price, seats, total_seats, ride_date, departure, ride_type)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            data.get("driver_id"), data.get("car_name"), data.get("car_photo"), data.get("car_year"),
            data.get("from_loc"), data.get("to_loc"), data.get("start_lat"), data.get("start_lng"),
            data.get("end_lat"), data.get("end_lng"), data.get("price"), data.get("seats"), data.get("seats"),
            data.get("ride_date"), data.get("departure"), data.get("ride_type")
        ))
        db.commit()
        return {"success": True}
    else:
        rides_list = db.execute("""
            SELECT r.*, u.name as driver_name, u.driver_rating_sum, u.driver_rating_count, u.avatar as driver_avatar
            FROM rides r JOIN users u ON r.driver_id = u.id
            WHERE r.status = 'pending' AND r.seats > 0
        """).fetchall()
        return jsonify([dict(r) for r in rides_list])

@app.route("/api/rides/estimate", methods=["POST"])
def estimate():
    data = request.json
    s_lat, s_lng = float(data.get("start_lat", 0)), float(data.get("start_lng", 0))
    e_lat, e_lng = float(data.get("end_lat", 0)), float(data.get("end_lng", 0))
    
    # Haversine
    dist = 6371 * math.acos(
        math.cos(math.radians(s_lat)) * math.cos(math.radians(e_lat)) *
        math.cos(math.radians(e_lng - s_lng)) +
        math.sin(math.radians(s_lat)) * math.sin(math.radians(e_lat))
    )
    
    db = get_db()
    cfg = {r["key"]: r["value"] for r in db.execute("SELECT * FROM configs").fetchall()}
    
    base = cfg.get("base_rate", 10.0)
    surge = cfg.get("surge_factor", 1.0)
    
    mult = 1.0
    rtype = data.get("ride_type", "Go")
    if rtype == "Prime": mult = cfg.get("prime_mult", 1.5)
    elif rtype == "XL": mult = cfg.get("xl_mult", 2.0)
    
    # Add age factor
    year = int(data.get("car_used_years", 0))
    age_mult = 1.0 if year < 3 else (0.9 if year < 6 else 0.8)
    
    price = dist * base * surge * mult * age_mult
    return {"success": True, "distance": round(dist, 2), "estimated_price": round(max(50, price), 2)}

@app.route("/api/cars", methods=["GET"])
def get_cars():
    db = get_db()
    return jsonify([dict(r) for r in db.execute("SELECT * FROM cars").fetchall()])

@app.route("/api/user/verify-driver", methods=["POST"])
def verify_driver():
    db = get_db()
    uid = request.json.get("user_id")
    db.execute("UPDATE users SET is_driver_verified=1 WHERE id=?", (uid,))
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    u_dict = dict(user)
    if "password" in u_dict: del u_dict["password"]
    return {"success": True, "user": u_dict}

# --- Dev Endpoints ---
@app.route("/api/dev/stats", methods=["GET"])
def dev_stats():
    db = get_db()
    total_users = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    active_rides = db.execute("SELECT COUNT(*) FROM rides WHERE status='pending'").fetchone()[0]
    total_revenue = db.execute("SELECT SUM(price) FROM rides WHERE status='completed'").fetchone()[0] or 0
    return {"users": total_users, "rides": active_rides, "revenue": total_revenue}

@app.route("/api/dev/users", methods=["GET"])
def dev_users():
    db = get_db()
    users = db.execute("SELECT * FROM users").fetchall()
    return jsonify([dict(u) for u in users])

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
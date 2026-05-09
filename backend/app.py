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
    db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT UNIQUE, password TEXT, otp TEXT, aadhaar_no TEXT, role TEXT DEFAULT 'user', is_driver_verified INTEGER DEFAULT 0, is_banned INTEGER DEFAULT 0, driver_rating_sum REAL DEFAULT 0, driver_rating_count INTEGER DEFAULT 0, user_rating_sum REAL DEFAULT 0, user_rating_count INTEGER DEFAULT 0, avatar TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS rides (id INTEGER PRIMARY KEY, driver_id INTEGER, car_name TEXT, car_year INTEGER, from_loc TEXT, to_loc TEXT, start_lat REAL, start_lng REAL, end_lat REAL, end_lng REAL, price REAL, seats INTEGER, total_seats INTEGER, ride_date TEXT, departure TEXT, ride_type TEXT DEFAULT 'Go', status TEXT DEFAULT 'pending', FOREIGN KEY(driver_id) REFERENCES users(id))")
    db.execute("CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY, ride_id INTEGER, user_id INTEGER, seats_booked INTEGER, status TEXT DEFAULT 'confirmed', FOREIGN KEY(ride_id) REFERENCES rides(id), FOREIGN KEY(user_id) REFERENCES users(id))")
    db.execute("CREATE TABLE IF NOT EXISTS cars (id INTEGER PRIMARY KEY, model TEXT UNIQUE)")
    if db.execute("SELECT COUNT(*) FROM cars").fetchone()[0] == 0:
        for m in ["Tesla Model S", "Tesla Model 3", "Audi Q7", "BMW X5", "Mercedes S-Class", "Toyota Innova", "Honda City"]:
            db.execute("INSERT INTO cars (model) VALUES (?)", (m,))
    db.commit()

# ---------------- Helpers ----------------
def send_otp(identifier, otp):
    # Mocking for now, but configured for real if env vars exist
    print(f"[VELORA] OTP for {identifier}: {otp}")
    return True

def generate_token(user_id):
    return jwt.encode({"user_id": user_id, "exp": datetime.utcnow() + timedelta(days=7)}, SECRET_KEY, algorithm="HS256")

# ---------------- API ----------------
@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    db = get_db()
    hashed = generate_password_hash(data["password"])
    otp = str(random.randint(100000, 999999))
    try:
        db.execute("INSERT INTO users (name, email, phone, password, otp, aadhaar_no) VALUES (?,?,?,?,?,?)",
                  (data["name"], data.get("email"), data.get("phone"), hashed, otp, data.get("aadhaar_no")))
        db.commit()
        send_otp(data.get("email") or data.get("phone"), otp)
        return {"success": True, "requires_otp": True, "identifier": data.get("email") or data.get("phone"), "otp_fallback": otp}
    except: return {"error": "User already exists"}, 400

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email=? OR phone=?", (data["identifier"], data["identifier"])).fetchone()
    if not user or not check_password_hash(user["password"], data["password"]):
        return {"error": "Invalid credentials"}, 401
    otp = str(random.randint(100000, 999999))
    db.execute("UPDATE users SET otp=? WHERE id=?", (otp, user["id"]))
    db.commit()
    send_otp(data["identifier"], otp)
    return {"success": True, "requires_otp": True, "identifier": data["identifier"], "otp_fallback": otp}

@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE (email=? OR phone=?) AND otp=?", (data["identifier"], data["identifier"], data["otp"])).fetchone()
    if user:
        u = dict(user); del u["password"]
        return {"success": True, "token": generate_token(user["id"]), "user": u}
    return {"error": "Invalid OTP"}, 401

@app.route("/api/rides", methods=["GET", "POST"])
def manage_rides():
    db = get_db()
    if request.method == "POST":
        data = request.json
        db.execute("INSERT INTO rides (driver_id, car_name, car_year, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, price, seats, total_seats, ride_date, departure, ride_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                  (data["driver_id"], data["car_name"], data["car_year"], data["from_loc"], data["to_loc"], data["start_lat"], data["start_lng"], data["end_lat"], data["end_lng"], data["price"], data["seats"], data["seats"], data["ride_date"], data["departure"], data["ride_type"]))
        db.commit()
        return {"success": True}
    else:
        # Search functionality
        from_loc = request.args.get("from", "").lower()
        to_loc = request.args.get("to", "").lower()
        date = request.args.get("date", "")
        
        query = "SELECT r.*, u.name as driver_name, u.avatar as driver_avatar FROM rides r JOIN users u ON r.driver_id = u.id WHERE r.seats > 0"
        params = []
        if from_loc:
            query += " AND LOWER(r.from_loc) LIKE ?"
            params.append(f"%{from_loc}%")
        if to_loc:
            query += " AND LOWER(r.to_loc) LIKE ?"
            params.append(f"%{to_loc}%")
        if date:
            query += " AND r.ride_date = ?"
            params.append(date)
            
        rides = db.execute(query, params).fetchall()
        return jsonify([dict(r) for r in rides])

@app.route("/api/rides/book", methods=["POST"])
def book_ride():
    data = request.json
    db = get_db()
    ride = db.execute("SELECT seats FROM rides WHERE id=?", (data["ride_id"],)).fetchone()
    if not ride or ride["seats"] < data["seats_booked"]:
        return {"error": "Not enough seats available"}, 400
    
    db.execute("INSERT INTO bookings (ride_id, user_id, seats_booked) VALUES (?,?,?)",
              (data["ride_id"], data["user_id"], data["seats_booked"]))
    db.execute("UPDATE rides SET seats = seats - ? WHERE id=?", (data["seats_booked"], data["ride_id"]))
    db.commit()
    return {"success": True}

@app.route("/api/user/activity", methods=["POST"])
def get_activity():
    uid = request.json.get("user_id")
    db = get_db()
    offered = db.execute("SELECT * FROM rides WHERE driver_id=?", (uid,)).fetchall()
    booked = db.execute("SELECT r.*, b.seats_booked FROM bookings b JOIN rides r ON b.ride_id = r.id WHERE b.user_id=?", (uid,)).fetchall()
    return {"offered": [dict(r) for r in offered], "booked": [dict(r) for r in booked]}

@app.route("/api/cars", methods=["GET"])
def get_cars():
    db = get_db()
    return jsonify([dict(r) for r in db.execute("SELECT * FROM cars").fetchall()])

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
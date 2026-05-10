from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, os, math, random, jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv("env.txt")
load_dotenv("backend/env.txt")

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

SECRET_KEY = os.environ.get("SECRET_KEY", "VELORA_SECRET_KEY_2026")
DB_PATH = "velora.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'rider', is_driver_verified INTEGER DEFAULT 0, verification_status TEXT DEFAULT 'none', wallet_balance REAL DEFAULT 1500.0, avatar TEXT, created_at TEXT, rating REAL DEFAULT 5.0, docs_path TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS rides (id INTEGER PRIMARY KEY, driver_id INTEGER, car_name TEXT, car_year INTEGER, from_loc TEXT, to_loc TEXT, start_lat REAL, start_lng REAL, end_lat REAL, end_lng REAL, price REAL, seats INTEGER, total_seats INTEGER, ride_date TEXT, departure TEXT, ride_type TEXT DEFAULT 'Go', status TEXT DEFAULT 'pending', FOREIGN KEY(driver_id) REFERENCES users(id))")
    db.execute("CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY, ride_id INTEGER, user_id INTEGER, seats_booked INTEGER, fare_paid REAL, status TEXT DEFAULT 'confirmed', booked_at TEXT, FOREIGN KEY(ride_id) REFERENCES rides(id), FOREIGN KEY(user_id) REFERENCES users(id))")
    db.execute("CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, key TEXT UNIQUE, value TEXT)")
    db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('base_km_rate', '12.0')")
    db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('surge_multiplier', '1.0')")
    db.commit()

# --- Auth ---
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email=? OR phone=?", (data["identifier"], data["identifier"])).fetchone()
    if not user or not check_password_hash(user["password"], data["password"]): return {"error": "Invalid credentials"}, 401
    return {"success": True, "user": dict(user)} # Simplify for testing 404

@app.route("/api/profile/history/<int:user_id>")
def get_history(user_id):
    db = get_db()
    rider_h = db.execute("SELECT b.*, r.from_loc, r.to_loc, r.car_name, u.name as driver_name FROM bookings b JOIN rides r ON b.ride_id = r.id JOIN users u ON r.driver_id = u.id WHERE b.user_id=?", (user_id,)).fetchall()
    return jsonify({"rider": [dict(h) for h in rider_h]})

@app.route("/api/rides", methods=["GET", "POST"])
def manage_rides():
    db = get_db()
    if request.method == "POST":
        data = request.json
        db.execute("INSERT INTO rides (driver_id, car_name, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, price, seats, ride_date, departure) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                  (data["driver_id"], data["car_name"], data["from_loc"], data["to_loc"], data["start_lat"], data["start_lng"], data["end_lat"], data["end_lng"], data["price"], data["seats"], data["ride_date"], data["departure"]))
        db.commit(); return {"success": True}
    rides = db.execute("SELECT r.*, u.name as driver_name, u.rating FROM rides r JOIN users u ON r.driver_id = u.id WHERE u.is_driver_verified=1").fetchall()
    return jsonify([dict(r) for r in rides])

@app.route("/api/rides/book", methods=["POST"])
def book_ride():
    data = request.json
    db = get_db()
    db.execute("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id=?", (data["fare"], data["user_id"]))
    db.execute("INSERT INTO bookings (ride_id, user_id, seats_booked, fare_paid, booked_at) VALUES (?,?,?,?,?)",
              (data["ride_id"], data["user_id"], 1, data["fare"], datetime.now().strftime("%Y-%m-%d %H:%M")))
    db.commit(); return {"success": True}

# --- SPA Support ---
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    if path.startswith("api/"):
        return {"error": "Not Found"}, 404
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    return app.send_static_file("index.html")

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
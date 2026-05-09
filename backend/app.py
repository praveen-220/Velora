from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, os, math, random, jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib
from email.message import EmailMessage
import razorpay

razorpay_client = razorpay.Client(auth=(os.environ.get("RAZORPAY_KEY_ID", "rzp_test_dummy"), os.environ.get("RAZORPAY_KEY_SECRET", "dummy_secret")))

app = Flask(__name__)
CORS(app)

SECRET_KEY = "VELORA_SECRET"

DB_PATH = "velora.db"

# ---------------- DB ----------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    db.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        password TEXT,
        otp TEXT,
        aadhaar_no TEXT,
        role TEXT DEFAULT 'user',
        is_driver_verified INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        driver_rating_sum REAL DEFAULT 0,
        driver_rating_count INTEGER DEFAULT 0,
        user_rating_sum REAL DEFAULT 0,
        user_rating_count INTEGER DEFAULT 0
    )
    ''')

    db.execute('''
    CREATE TABLE IF NOT EXISTS rides (
        id INTEGER PRIMARY KEY,
        driver_id INTEGER,
        car_name TEXT,
        car_photo TEXT,
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
        ride_type TEXT,
        status TEXT DEFAULT 'pending',
        live_lat REAL,
        live_lng REAL
    )
    ''')
    
    try:
        db.execute("ALTER TABLE rides ADD COLUMN live_lat REAL")
        db.execute("ALTER TABLE rides ADD COLUMN live_lng REAL")
    except:
        pass

    db.execute('''
    CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY,
        model TEXT UNIQUE
    )
    ''')
    db.commit()

    if db.execute("SELECT COUNT(*) FROM cars").fetchone()[0] == 0:
        for model in ["Tesla Model 3", "Audi Q5", "BMW 3 Series", "Honda Civic", "Toyota Camry"]:
            db.execute("INSERT OR IGNORE INTO cars (model) VALUES (?)", (model,))
        db.commit()

# ---------------- EMAIL OTP ----------------
def send_otp_email(to_email, otp):
    if not to_email or "@" not in to_email: return False
    try:
        msg = EmailMessage()
        msg.set_content(f"Your Velora verification code is: {otp}")
        msg["Subject"] = "Velora Verification Code"
        msg["From"] = os.environ.get("EMAIL_USER", "velora@example.com")
        msg["To"] = to_email

        email_user = os.environ.get("EMAIL_USER")
        email_pass = os.environ.get("EMAIL_PASS")
        if email_user and email_pass:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(email_user, email_pass)
                server.send_message(msg)
            return True
        else:
            print(f"[MOCK EMAIL] To: {to_email} | OTP: {otp}")
            return False
    except Exception as e:
        print("Failed to send email:", e)
        return False


# ---------------- JWT ----------------
def generate_token(user_id):
    return jwt.encode({
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

def verify_token(token):
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return data["user_id"]
    except:
        return None

# ---------------- Middleware ----------------
def auth_required(f):
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Token missing"}), 401
            
        token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        
        user_id = verify_token(token)
        if not user_id:
            return jsonify({"error": "Invalid token"}), 403
        
        request.user_id = user_id
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# ---------------- Utils ----------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    return R * math.acos(
        math.cos(math.radians(lat1)) *
        math.cos(math.radians(lat2)) *
        math.cos(math.radians(lon2 - lon1)) +
        math.sin(math.radians(lat1)) *
        math.sin(math.radians(lat2))
    )

# ---------------- AUTH ----------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    db = get_db()

    hashed = generate_password_hash(data["password"])

    otp = str(random.randint(100000, 999999))
    
    email = data.get("email", "")
    phone = data.get("phone_no", data.get("phone", ""))
    identifier = email or phone

    db.execute(
        "INSERT INTO users (name,email,phone,password,otp,aadhaar_no,role) VALUES (?,?,?,?,?,?,?)",
        (data.get("name", ""), email, phone, hashed, otp, data.get("aadhaar_no", ""), data.get("role", "user"))
    )
    db.commit()
    
    email_sent = send_otp_email(email, otp)

    return {"success": True, "otp_fallback": otp, "requires_otp": True, "identifier": identifier, "otp_delivered": email_sent}




@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    db = get_db()
    identifier = data.get("identifier", "")

    user = db.execute(
        "SELECT * FROM users WHERE email=? OR phone=?",
        (identifier, identifier)
    ).fetchone()

    if not user:
        return {"error": "User not found"}, 404

    if not check_password_hash(user["password"], data["password"]):
        return {"error": "Wrong password"}, 401

    otp = str(random.randint(100000, 999999))
    db.execute("UPDATE users SET otp=? WHERE id=?", (otp, user["id"]))
    db.commit()

    email_sent = send_otp_email(user["email"], otp)

    return {"success": True, "otp_fallback": otp, "requires_otp": True, "identifier": identifier, "otp_delivered": email_sent}


@app.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json
    db = get_db()
    identifier = data.get("identifier")
    otp = data.get("otp")
    
    user = db.execute("SELECT * FROM users WHERE (email=? OR phone=?) AND otp=?", 
                      (identifier, identifier, otp)).fetchone()
    
    if user:
        token = generate_token(user["id"])
        user_dict = dict(user)
        del user_dict["password"]
        return {"success": True, "token": token, "user": user_dict}
    return {"error": "Invalid OTP"}, 401


# ---------------- RIDES ----------------
@app.route("/api/rides", methods=["GET", "POST"])
def manage_rides():
    if request.method == "POST":
        data = request.json
        db = get_db()
        
        db.execute(
            """INSERT INTO rides 
            (driver_id, car_name, car_photo, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, price, seats, total_seats, ride_date, departure, arrival, ride_type) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                data.get("driver_id"), data.get("car_name"), data.get("car_photo"),
                data.get("from_loc"), data.get("to_loc"), 
                float(data.get("start_lat", 0)), float(data.get("start_lng", 0)),
                float(data.get("end_lat", 0)), float(data.get("end_lng", 0)),
                float(data.get("price", 50)), int(data.get("seats", 4)), int(data.get("seats", 4)),
                data.get("ride_date"), data.get("departure"), data.get("arrival"), data.get("ride_type", "Go")
            )
        )
        db.commit()
        return {"success": True}
    else:
        db = get_db()
        rides = db.execute("""
            SELECT r.*, u.name as driver_name 
            FROM rides r 
            JOIN users u ON r.driver_id = u.id
            WHERE r.status != 'completed'
        """).fetchall()
        
        rides_list = []
        for r in rides:
            rd = dict(r)
            rd["car_details"] = f"{rd.get('car_name', 'Vehicle')}"
            rd["available_seats"] = rd.get("seats", 4)
            rides_list.append(rd)
            
        return jsonify(rides_list)


# ---------------- PRICE ----------------
@app.route("/api/rides/estimate", methods=["POST"])
def estimate():
    data = request.json

    dist = haversine(
        float(data.get("start_lat", 0)), float(data.get("start_lng", 0)),
        float(data.get("end_lat", 0)), float(data.get("end_lng", 0))
    )

    price = max(50, dist * 10)

    return {"success": True, "distance": dist, "estimated_price": round(price, 2)}

# ---------------- CARS ----------------
@app.route("/api/cars", methods=["GET"])
def get_cars():
    db = get_db()
    cars = db.execute("SELECT * FROM cars").fetchall()
    return jsonify([dict(c) for c in cars])

@app.route("/api/dev/cars", methods=["POST"])
def add_car():
    data = request.json
    db = get_db()
    model = data.get("model")
    if model:
        db.execute("INSERT OR IGNORE INTO cars (model) VALUES (?)", (model,))
        db.commit()
        return {"success": True}
    return {"error": "Model missing"}, 400

# ---------------- PAYMENTS ----------------
@app.route("/api/rides/<int:ride_id>/create_order", methods=["POST"])
def create_order(ride_id):
    data = request.json
    amount = data.get("amount", 0)
    try:
        order = razorpay_client.order.create({
            "amount": int(amount * 100),
            "currency": "INR",
            "receipt": f"receipt_ride_{ride_id}"
        })
        return {"success": True, "order_id": order["id"]}
    except Exception as e:
        return {"success": True, "order_id": f"mock_order_{random.randint(1000,9999)}"}

@app.route("/api/rides/<int:ride_id>/confirm_payment", methods=["POST"])
def confirm_payment(ride_id):
    data = request.json
    db = get_db()
    seats_booked = int(data.get("seats", 1))
    
    ride = db.execute("SELECT * FROM rides WHERE id=?", (ride_id,)).fetchone()
    if not ride:
        return {"error": "Ride not found"}, 404
        
    new_seats = max(0, ride["seats"] - seats_booked)
    db.execute("UPDATE rides SET seats=? WHERE id=?", (new_seats, ride_id))
    db.commit()
    
    return {"success": True}

# ---------------- USER/DRIVER ----------------
@app.route("/api/user/verify-driver", methods=["POST"])
def verify_driver():
    data = request.json
    db = get_db()
    user_id = data.get("user_id")
    db.execute("UPDATE users SET is_driver_verified=1 WHERE id=?", (user_id,))
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    user_dict = dict(user)
    if "password" in user_dict: del user_dict["password"]
    return {"success": True, "user": user_dict}

@app.route("/api/rides/my-offered", methods=["POST"])
def get_my_offered():
    data = request.json
    driver_id = data.get("driver_id")
    db = get_db()
    rides = db.execute("SELECT * FROM rides WHERE driver_id=?", (driver_id,)).fetchall()
    res = []
    for r in rides:
        rd = dict(r)
        rd["passengers"] = [] # Mocked for now
        rd["total_seats"] = rd.get("seats", 4)
        rd["available_seats"] = rd.get("seats", 4)
        rd["ride_date"] = "Today"
        res.append(rd)
    return jsonify(res)

# ---------------- DEV PORTAL ----------------
dev_config = {
    "base_rate": 10,
    "surge_factor": 1.0,
    "go_multiplier": 1.0,
    "prime_multiplier": 1.6,
    "xl_multiplier": 2.2,
    "maintenance_mode": 0
}

@app.route("/api/dev/config", methods=["GET", "POST"])
def manage_dev_config():
    global dev_config
    if request.method == "POST":
        data = request.json
        for k, v in data.items():
            if k in dev_config:
                dev_config[k] = float(v)
        return {"success": True}
    return jsonify(dev_config)

@app.route("/api/dev/all-rides", methods=["GET"])
def dev_all_rides():
    db = get_db()
    rides = db.execute("SELECT * FROM rides").fetchall()
    return jsonify([dict(r) for r in rides])

@app.route("/api/dev/demand-data", methods=["GET"])
def dev_demand_data():
    return jsonify([
        {"lat": 28.6139, "lng": 77.2090, "intensity": 0.8},
        {"lat": 19.0760, "lng": 72.8777, "intensity": 0.9}
    ])

@app.route("/api/dev/stats/summary", methods=["GET"])
def dev_stats():
    return jsonify({
        "categories": [
            {"type": "Go", "revenue": 50000},
            {"type": "Prime", "revenue": 30000},
            {"type": "XL", "revenue": 20000}
        ],
        "growth": [
            {"date": "Mon", "revenue": 1000},
            {"date": "Tue", "revenue": 1500},
            {"date": "Wed", "revenue": 2000},
            {"date": "Thu", "revenue": 1800},
            {"date": "Fri", "revenue": 3000}
        ]
    })

@app.route("/api/dev/pending-drivers", methods=["GET"])
def pending_drivers():
    db = get_db()
    users = db.execute("SELECT * FROM users WHERE is_driver_verified = 0 AND role != 'developer'").fetchall()
    return jsonify([dict(u) for u in users])

@app.route("/api/dev/pending-devs", methods=["GET"])
def pending_devs():
    db = get_db()
    users = db.execute("SELECT * FROM users WHERE role = 'developer' AND is_driver_verified = 0").fetchall()
    return jsonify([dict(u) for u in users])

@app.route("/api/dev/verify-dev", methods=["POST"])
def dev_verify_dev():
    data = request.json
    db = get_db()
    db.execute("UPDATE users SET is_driver_verified = 1 WHERE id=?", (data.get("id"),))
    db.commit()
    return {"success": True}

@app.route("/api/dev/verify-driver", methods=["POST"])
def dev_verify_driver():
    data = request.json
    db = get_db()
    status = data.get("status", 1)
    db.execute("UPDATE users SET is_driver_verified = ? WHERE id=?", (1 if status==1 else 0, data.get("id")))
    db.commit()
    return {"success": True}

@app.route("/api/dev/users/list", methods=["GET"])
def dev_users_list():
    db = get_db()
    users = db.execute("SELECT * FROM users").fetchall()
    return jsonify([dict(u) for u in users])

@app.route("/api/dev/users/toggle-ban", methods=["POST"])
def toggle_ban():
    data = request.json
    db = get_db()
    user = db.execute("SELECT is_banned FROM users WHERE id=?", (data.get("id"),)).fetchone()
    if user:
        new_status = 0 if user["is_banned"] else 1
        db.execute("UPDATE users SET is_banned = ? WHERE id=?", (new_status, data.get("id")))
        db.commit()
    return {"success": True}

@app.route("/api/dev/update-ride-price", methods=["POST"])
def update_ride_price():
    data = request.json
    db = get_db()
    db.execute("UPDATE rides SET price = ? WHERE id=?", (float(data.get("price")), data.get("ride_id")))
    db.commit()
    return {"success": True}

@app.route("/api/rides/<int:ride_id>/update-location", methods=["POST"])
def update_location(ride_id):
    data = request.json
    db = get_db()
    lat = data.get("lat")
    lng = data.get("lng")
    status = data.get("status", "active")
    
    if lat and lng:
        try:
            db.execute("UPDATE rides SET live_lat=?, live_lng=?, status=? WHERE id=?", (lat, lng, status, ride_id))
        except:
            pass
    else:
        db.execute("UPDATE rides SET status=? WHERE id=?", (status, ride_id))
        
    db.commit()
    return {"success": True}

# ---------------- MAIN ----------------
@app.route("/api/rides/<int:ride_id>/rate", methods=["POST"])
def rate_ride(ride_id):
    data = request.json
    db = get_db()
    
    rating = float(data.get("rating", 5))
    
    ride = db.execute("SELECT * FROM rides WHERE id=?", (ride_id,)).fetchone()
    if not ride:
        return {"error": "Ride not found"}, 404
        
    driver_id = ride["driver_id"]
    
    db.execute(
        "UPDATE users SET driver_rating_sum = driver_rating_sum + ?, driver_rating_count = driver_rating_count + 1 WHERE id=?",
        (rating, driver_id)
    )
    db.commit()
    
    return {"success": True}

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
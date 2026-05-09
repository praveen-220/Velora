import sqlite3
from werkzeug.security import generate_password_hash

DB_PATH = 'velora.db'

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    hashed_pass = generate_password_hash("pass123")
    
    # Create Users with Roles
    users = [
        ("Admin User", "admin@veora.com", "+1000000000", hashed_pass, "admin"),
        ("Alex Rivera", "alex@veora.com", "+919876543210", hashed_pass, "driver"),
        ("Sarah Chen", "sarah@veora.com", "+918888888888", hashed_pass, "driver"),
        ("Praveen Rider", "praveen@veora.com", "+917777777777", hashed_pass, "rider")
    ]
    
    for name, email, phone, pw, role in users:
        c.execute("INSERT OR IGNORE INTO users (name, email, phone, password, role, is_driver_verified, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  (name, email, phone, pw, role, 1 if role == 'driver' else 0, f"https://i.pravatar.cc/150?u={email}"))
    
    driver_alex = c.execute("SELECT id FROM users WHERE email='alex@veora.com'").fetchone()[0]
    driver_sarah = c.execute("SELECT id FROM users WHERE email='sarah@veora.com'").fetchone()[0]
    
    # Create Initial Rides
    rides = [
        (driver_alex, "Tesla Model S", 2024, "Indie Park", "Tech City", 28.6139, 77.2090, 28.5355, 77.3910, 450.0, "Prime"),
        (driver_sarah, "Audi Q7", 2023, "Sector 62", "Cyber Hub", 28.6273, 77.3725, 28.4950, 77.0890, 320.0, "XL")
    ]
    
    for d_id, car, year, start, end, sLat, sLng, eLat, eLng, price, rType in rides:
        c.execute('''
            INSERT INTO rides (driver_id, car_name, car_year, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, price, seats, total_seats, ride_date, departure, ride_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (d_id, car, year, start, end, sLat, sLng, eLat, eLng, price, 4, 4, "2026-05-10", "10:30", rType))
    
    conn.commit()
    conn.close()
    print("Veora Platform Seeded successfully with all roles.")

if __name__ == "__main__":
    seed()

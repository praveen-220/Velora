import sqlite3
from werkzeug.security import generate_password_hash

DB_PATH = 'velora.db'

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Create a Driver
    hashed_pass = generate_password_hash("pass123")
    c.execute("INSERT OR IGNORE INTO users (name, email, phone, password, role, is_driver_verified, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)",
              ("Alex Rivera", "alex@velora.com", "+919876543210", hashed_pass, "user", 1, "https://i.pravatar.cc/150?u=alex"))
    
    c.execute("INSERT OR IGNORE INTO users (name, email, phone, password, role, is_driver_verified, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)",
              ("Sarah Chen", "sarah@velora.com", "+918888888888", hashed_pass, "user", 1, "https://i.pravatar.cc/150?u=sarah"))

    driver_id_alex = c.execute("SELECT id FROM users WHERE email='alex@velora.com'").fetchone()[0]
    driver_id_sarah = c.execute("SELECT id FROM users WHERE email='sarah@velora.com'").fetchone()[0]
    
    # 2. Create some Rides
    rides = [
        (driver_id_alex, "Tesla Model S", 2024, "Indie Park", "Tech City", 28.6139, 77.2090, 28.5355, 77.3910, 450.0, "Prime"),
        (driver_id_sarah, "Audi Q5", 2023, "Sector 62", "Cyber Hub", 28.6273, 77.3725, 28.4950, 77.0890, 320.0, "XL"),
        (driver_id_alex, "BMW 3 Series", 2024, "Airport T3", "Connaught Place", 28.5562, 77.1000, 28.6327, 77.2197, 280.0, "Go")
    ]
    
    # Clear existing rides for a clean demo
    c.execute("DELETE FROM rides")
    
    for d_id, car, year, start, end, sLat, sLng, eLat, eLng, price, rType in rides:
        c.execute('''
            INSERT INTO rides (driver_id, car_name, car_year, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, live_lat, live_lng, ride_date, departure, price, seats, total_seats, ride_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            d_id, car, year, start, end,
            sLat, sLng, eLat, eLng,
            sLat, sLng,
            "2026-05-10", "10:30", price, 4, 4, rType
        ))
    
    conn.commit()
    conn.close()
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed()

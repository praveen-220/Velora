import sqlite3

DB_PATH = 'backend/velora.db'

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Create a Driver
    # (Note: phone_no and aadhaar_no are new)
    c.execute("INSERT OR IGNORE INTO users (name, email, phone_no, password, role, is_driver_verified, is_phone_verified, is_aadhaar_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              ("Alex Rivera", "alex@velora.com", "+919876543210", "pass123", "user", 1, 1, 1))
    driver_id = c.execute("SELECT id FROM users WHERE email='alex@velora.com'").fetchone()[0]
    
    # 2. Create some Rides
    rides = [
        ("Tesla Model S", "Indie Park", "Tech City", 28.6139, 77.2090, 28.5355, 77.3910, "10:30"),
        ("Audi Q5", "Sector 62", "Cyber Hub", 28.6273, 77.3725, 28.4950, 77.0890, "09:00"),
        ("BMW 3 Series", "Airport T3", "Connaught Place", 28.5562, 77.1000, 28.6327, 77.2197, "14:15")
    ]
    
    for car, start, end, sLat, sLng, eLat, eLng, depTime in rides:
        c.execute('''
            INSERT INTO rides (driver_id, car_details, car_year, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, live_lat, live_lng, ride_date, departure, price, total_seats, available_seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            driver_id, car, 2024, start, end,
            sLat, sLng, eLat, eLng,
            sLat, sLng, # Initial live position is start
            "2026-04-19", depTime, 450.0, 4, 4
        ))
    
    conn.commit()
    conn.close()
    print("Database seeded with Developer-ready data.")

if __name__ == "__main__":
    seed()

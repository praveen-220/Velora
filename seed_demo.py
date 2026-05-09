import sqlite3
from werkzeug.security import generate_password_hash

DB_PATH = 'velora.db'

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Clear existing data
    c.execute("DELETE FROM bookings")
    c.execute("DELETE FROM rides")
    c.execute("DELETE FROM users")
    
    hashed_pass = generate_password_hash("pass123")
    
    # 1. Create Diversified Users
    users = [
        ("Alex Rivera", "alex@velora.com", "+919876543210", "https://i.pravatar.cc/150?u=alex"),
        ("Sarah Chen", "sarah@velora.com", "+918888888888", "https://i.pravatar.cc/150?u=sarah"),
        ("Vikram Singh", "vikram@velora.com", "+917777777777", "https://i.pravatar.cc/150?u=vikram"),
        ("Priya Sharma", "priya@velora.com", "+916666666666", "https://i.pravatar.cc/150?u=priya")
    ]
    
    for name, email, phone, avatar in users:
        c.execute("INSERT INTO users (name, email, phone, password, role, is_driver_verified, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  (name, email, phone, hashed_pass, "user", 1, avatar))
    
    u_ids = [r[0] for r in c.execute("SELECT id FROM users").fetchall()]
    
    # 2. Create Realistic Rides
    rides = [
        (u_ids[0], "Tesla Model S", 2024, "Indie Park", "Tech City", 28.6139, 77.2090, 28.5355, 77.3910, 450.0, "Go"),
        (u_ids[1], "Audi Q5", 2023, "Sector 62", "Cyber Hub", 28.6273, 77.3725, 28.4950, 77.0890, 320.0, "XL"),
        (u_ids[2], "BMW 3 Series", 2024, "Airport T3", "Connaught Place", 28.5562, 77.1000, 28.6327, 77.2197, 280.0, "Prime"),
        (u_ids[3], "Mumbai", "Pune", 19.0760, 72.8777, 18.5204, 73.8567, 600.0, "Go"),
        (u_ids[0], "Delhi", "Jaipur", 28.6139, 77.2090, 26.9124, 75.7873, 850.0, "Go"),
        (u_ids[1], "Bangalore", "Mysore", 12.9716, 77.5946, 12.2958, 76.6394, 400.0, "XL")
    ]
    
    # Note: The first 3 rides have specific car data, the others are simple for the list
    for r in rides:
        if len(r) == 11: # Detailed ride
            d_id, car, year, start_loc, end_loc, sLat, sLng, eLat, eLng, price, rType = r
            c.execute('''
                INSERT INTO rides (driver_id, car_name, car_year, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, live_lat, live_lng, ride_date, departure, price, seats, total_seats, ride_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (d_id, car, year, start_loc, end_loc, sLat, sLng, eLat, eLng, sLat, sLng, "2026-05-10", "10:30", price, 4, 4, rType))
        else: # Simple ride for city routes
            d_id, start_loc, end_loc, sLat, sLng, eLat, eLng, price, rType = r
            c.execute('''
                INSERT INTO rides (driver_id, car_name, car_year, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, live_lat, live_lng, ride_date, departure, price, seats, total_seats, ride_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (d_id, "Toyota Innova", 2022, start_loc, end_loc, sLat, sLng, eLat, eLng, sLat, sLng, "2026-05-10", "08:00", price, 6, 6, rType))
    
    conn.commit()
    conn.close()
    print("Database seeded with realistic multi-route data.")

if __name__ == "__main__":
    seed()

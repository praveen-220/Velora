import sqlite3
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

DB_PATH = 'velora.db'

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    hashed_pass = generate_password_hash("Praveen@600")
    
    # 1. Admin / Master User
    c.execute("INSERT OR REPLACE INTO users (name, email, password, role, is_driver_verified, wallet_balance) VALUES (?, ?, ?, ?, ?, ?)",
              ("Praveen Admin", "praveenhoratti2@gmail.com", hashed_pass, "admin", 1, 5000.0))
    
    # 2. Verified Driver
    c.execute("INSERT OR REPLACE INTO users (id, name, email, password, role, is_driver_verified, rating) VALUES (?, ?, ?, ?, ?, ?, ?)",
              (10, "Captain Vikram", "vikram@velora.com", hashed_pass, "driver", 1, 4.9))
    
    # 3. Add a Ride
    c.execute("DELETE FROM rides")
    c.execute('''
        INSERT INTO rides (id, driver_id, car_name, car_year, from_loc, to_loc, start_lat, start_lng, end_lat, end_lng, price, seats, total_seats, ride_date, departure)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (100, 10, "Tesla Model S", 2024, "Mumbai Airport", "Gateway of India", 19.0895, 72.8656, 18.9220, 72.8347, 450, 4, 4, "2026-05-10", "10:30"))
    
    # 4. Add a Past Booking for the Admin
    admin_id = c.execute("SELECT id FROM users WHERE email='praveenhoratti2@gmail.com'").fetchone()[0]
    c.execute("DELETE FROM bookings")
    c.execute('''
        INSERT INTO bookings (ride_id, user_id, seats_booked, fare_paid, status, booked_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (100, admin_id, 1, 450.0, 'completed', '2026-05-08 14:20'))
    
    conn.commit()
    conn.close()
    print("Uber Experience Seeded: Admin has ₹5000 and 1 past trip.")

if __name__ == "__main__":
    seed()

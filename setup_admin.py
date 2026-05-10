import sqlite3
from werkzeug.security import generate_password_hash

DB_PATH = 'velora.db'

def seed_admin():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # User Details
    name = "Praveen"
    email = "praveenhoratti2@gmail.com"
    password = "Praveen@600"
    role = "admin"
    
    hashed_pass = generate_password_hash(password)
    
    # Insert or Update the user
    c.execute("SELECT id FROM users WHERE email=?", (email,))
    user = c.fetchone()
    
    if user:
        c.execute("UPDATE users SET name=?, password=?, role=? WHERE email=?", (name, hashed_pass, role, email))
        print(f"Updated existing user {email} to Admin.")
    else:
        c.execute("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
                  (name, email, "+910000000000", hashed_pass, role))
        print(f"Created new Admin account for {name} ({email}).")
    
    conn.commit()
    conn.close()
    print("Admin account setup complete.")

if __name__ == "__main__":
    seed_admin()

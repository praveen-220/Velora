import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'velora.db')
conn = sqlite3.connect(db_path)
conn.execute("UPDATE system_config SET value=0 WHERE key='maintenance_mode'")
conn.commit()
print("Maintenance mode disabled successfully.")
conn.close()

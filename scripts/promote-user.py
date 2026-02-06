
import psycopg2

PG_CONFIG = {
    'dbname': 'sae_unified',
    'user': 'dokploy',
    'password': 'amukds4wi9001583845717ad2',
    'host': 'localhost',
    'port': 5432
}

try:
    con = psycopg2.connect(**PG_CONFIG)
    cur = con.cursor()
    
    print("🚀 Promoting user1@gmail.com to ADMIN...")
    cur.execute("UPDATE users SET role = 'ADMIN' WHERE email = 'user1@gmail.com'")
    con.commit()
    
    # Verify
    cur.execute("SELECT email, role FROM users WHERE email = 'user1@gmail.com'")
    row = cur.fetchone()
    print(f"✅ User {row[0]} is now {row[1]}")
    
    con.close()
except Exception as e:
    print(e)

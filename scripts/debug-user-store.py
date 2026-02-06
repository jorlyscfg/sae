
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
    
    cur.execute("""
        SELECT u.email, u."storeId", s.name 
        FROM users u 
        JOIN stores s ON u."storeId" = s.id 
        WHERE u.email = 'user1@gmail.com';
    """)
    
    row = cur.fetchone()
    print(f"User: {row[0]}")
    print(f"Store ID: {row[1]}")
    print(f"Store Name: {row[2]}")
    
    con.close()
except Exception as e:
    print(e)

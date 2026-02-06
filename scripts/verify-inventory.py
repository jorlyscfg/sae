import psycopg2
import os

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
    
    print("✅ Conectado a Postgres.")
    
    # Check distribution
    cur.execute("""
        SELECT s.name, count(p.id) 
        FROM products p 
        JOIN stores s ON p."storeId" = s.id 
        GROUP BY s.name;
    """)
    rows = cur.fetchall()
    
    print("\n--- INVENTORY DISTRIBUTION BY STORE ---")
    for row in rows:
        print(f"Store: {row[0]:<20} | Items: {row[1]}")
        
    # Show samples from BODEGA
    print("\n--- SAMPLES FROM 'BODEGA' ---")
    cur.execute("""
        SELECT p.sku, p.description, p.stock, s.name 
        FROM products p 
        JOIN stores s ON p."storeId" = s.id 
        WHERE s.name LIKE '%BODEGA%' 
        LIMIT 5;
    """)
    samples = cur.fetchall()
    for s in samples:
        print(f"[{s[3]}] SKU: {s[0]} | Stock: {s[2]} | {s[1]}")

    con.close()

except Exception as e:
    print(f"Error: {e}")

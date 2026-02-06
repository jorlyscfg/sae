
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
    
    print("--- STORES ---")
    cur.execute("SELECT id, name FROM stores")
    stores = {row[0]: row[1] for row in cur.fetchall()}
    for sid, name in stores.items():
        print(f"[{sid}] {name}")
        
    print("\n--- CUSTOMERS (Bodega/Corazon) ---")
    cur.execute("""
        SELECT id, "razonSocial", "storeId" 
        FROM customers 
        WHERE "razonSocial" LIKE '%BODEGA%' OR "razonSocial" LIKE '%CORAZON%'
    """)
    for row in cur.fetchall():
        cid, name, sid = row
        print(f"[{cid}] {name} (Belongs to: {stores.get(sid, sid)})")
        
        # Check if ID match
        if cid in stores:
             print(f"   ✅ MATCH: Customer ID exists as Store!")
        else:
             print(f"   ⚠️ MISMATCH: This customer is NOT a store yet.")

    con.close()
except Exception as e:
    print(e)

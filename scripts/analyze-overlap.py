
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
    
    # 1. Get Store IDs
    cur.execute("SELECT id, name FROM stores")
    stores = {row[1]: row[0] for row in cur.fetchall()}
    
    print("--- STORES ---")
    for name, sid in stores.items():
        print(f"{name}: {sid}")

    default_id = stores.get('Tienda Principal')
    if not default_id:
        print("Tienda Principal not found.")
        exit()

    # 2. Count items in Tienda Principal
    cur.execute("SELECT count(*) FROM products WHERE \"storeId\" = %s", (default_id,))
    total_default = cur.fetchone()[0]
    print(f"\nItems in Tienda Principal: {total_default}")

    # 3. Check Overlap
    # How many of these SKUs exist in OTHER stores?
    cur.execute("""
        SELECT count(DISTINCT p1.sku)
        FROM products p1
        JOIN products p2 ON p1.sku = p2.sku AND p2."storeId" != p1."storeId"
        WHERE p1."storeId" = %s
    """, (default_id,))
    
    overlap = cur.fetchone()[0]
    print(f"Items in Tienda Principal that also exist in Branches: {overlap}")
    
    # 4. Sample non-overlapping?
    # Maybe some items are ONLY in Tienda Principal (Global but not in specific warehouse?)
    if total_default > overlap:
        diff = total_default - overlap
        print(f"\nThere are {diff} items ONLY in Tienda Principal (not in Bodega/Corazon).")
        cur.execute("""
            SELECT p1.sku, p1.description 
            FROM products p1
            LEFT JOIN products p2 ON p1.sku = p2.sku AND p2."storeId" != p1."storeId"
            WHERE p1."storeId" = %s AND p2.id IS NULL
            LIMIT 5
        """, (default_id,))
        for row in cur.fetchall():
            print(f"- {row[0]}: {row[1]}")

    con.close()

except Exception as e:
    print(f"Error: {e}")

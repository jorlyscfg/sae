
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
    
    print("🔌 Conectado a Postgres.")
    
    # 1. Get Main Store ID
    cur.execute("SELECT id FROM stores WHERE name = 'Tienda Principal' LIMIT 1")
    row = cur.fetchone()
    if not row:
        print("❌ Tienda Principal not found.")
        exit()
    default_id = row[0]
    
    print(f"🏭 ID Tienda Principal: {default_id}")
    
    # 2. Count before
    cur.execute("SELECT count(*) FROM products WHERE \"storeId\" = %s", (default_id,))
    count_before = cur.fetchone()[0]
    print(f"📉 Items iniciales en Principal: {count_before}")

    # 3. DELETE Redundant items
    # Delete from Principal IF SKU exists in ANY OTHER store
    print("🧹 Eliminando duplicados...")
    
    delete_query = """
        DELETE FROM products 
        WHERE "storeId" = %s 
        AND sku IN (
            SELECT p2.sku 
            FROM products p2 
            WHERE p2."storeId" != %s
        )
    """
    
    cur.execute(delete_query, (default_id, default_id))
    deleted_count = cur.rowcount
    con.commit()
    
    print(f"✅ Se eliminaron {deleted_count} items redundantes de Tienda Principal.")
    
    # 4. Count after
    cur.execute("SELECT count(*) FROM products WHERE \"storeId\" = %s", (default_id,))
    count_after = cur.fetchone()[0]
    print(f"📉 Items restantes en Principal (Huérfanos): {count_after}")
    
    con.close()

except Exception as e:
    print(f"❌ Error: {e}")

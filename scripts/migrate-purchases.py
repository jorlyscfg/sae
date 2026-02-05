import fdb
import psycopg2
from psycopg2.extras import execute_values
import uuid
import datetime

# Configuración Firebird
FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8' 
}

# Configuración Postgres
PG_CONFIG = {
    'dbname': 'sae_unified',
    'user': 'dokploy',
    'password': 'amukds4wi9001583845717ad2',
    'host': 'localhost',
    'port': 5432
}

def migrate_purchases():
    print("🔌 [Purchases] Conectando a BDs...")
    try:
        con_fb = fdb.connect(**FB_CONFIG)
        cur_fb = con_fb.cursor()
        con_pg = psycopg2.connect(**PG_CONFIG)
        cur_pg = con_pg.cursor()
        print("✅ Conexiones exitosas.")
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return

    # 1. Obtener Default Store y User
    cur_pg.execute("SELECT id FROM stores WHERE id = 'default-store' LIMIT 1")
    store_row = cur_pg.fetchone()
    store_id = store_row[0] if store_row else 'default-store'
    
    cur_pg.execute("SELECT id FROM users WHERE email='user1@gmail.com' LIMIT 1")
    user_row = cur_pg.fetchone()
    user_id = user_row[0] if user_row else None

    # Cache Users and Suppliers to avoid FK errors?
    # Suppliers are mapped by RFC or ID? 
    # In migrate-suppliers.py we used uuidv4 but mapped somewhat.
    # We need to lookup supplier by Firebird CLAVE (which we didn't store exactly, or did we?)
    # In migrate-suppliers.py: rfc = raw_rfc. 
    # Does COMPC01 have CVE_CLPV (Clave Proveedor)? Yes.
    # We need to map CVE_CLPV -> Supplier ID in Postgres.
    # Assumption: Suppliers migrated using RFC as unique key? No, script used random UUID.
    # Issue: We can't easily link back unless we stored the legacy ID.
    # Solution: Add 'legacyId' to Supplier? Or look up by RFC?
    # COMPC01 -> CVE_CLPV -> PROV01 -> RFC -> Supplier(rfc).
    # This is safer.

    # 2. Leer Purchases (COMPC01) joined with PROV01 to get RFC
    print("📦 Leyendo COMPC01...")
    # CVE_DOC, CVE_CLPV, FECHA_DOC, IMPORTE
    query_header = """
        SELECT 
            c.CVE_DOC, c.CVE_CLPV, c.FECHA_DOC, c.IMPORTE,
            p.RFC
        FROM COMPC01 c
        LEFT JOIN PROV01 p ON c.CVE_CLPV = p.CLAVE
    """
    try:
        cur_fb.execute(query_header)
        rows_header = cur_fb.fetchall()
        print(f"📊 Encontradas {len(rows_header)} compras en Firebird.")
    except Exception as e:
        print(f"❌ Error en query COMPC01: {e}")
        return

    # 3. Leer Purchase Items (PAR_COMPC01)
    print("📦 Leyendo PAR_COMPC01...")
    # CVE_DOC, CVE_ART, CANT, COST (Cost), TOT_PARTIDA (Total Partida)
    query_items = """
        SELECT CVE_DOC, CVE_ART, CANT, COST, TOT_PARTIDA
        FROM PAR_COMPC01
    """
    items_map = {} # CVE_DOC -> List of items
    try:
        cur_fb.execute(query_items)
        rows_items = cur_fb.fetchall()
        for item in rows_items:
            doc_id = str(item[0]).strip()
            if doc_id not in items_map:
                items_map[doc_id] = []
            items_map[doc_id].append(item)
        print(f"📊 Encontradas {len(rows_items)} partidas de compra.")
    except Exception as e:
        print(f"❌ Error en query PAR_COMPC01: {e}")
        # Proceed without items? No.
        pass

    # 4. Prepare Postgres Inserts
    purchases_sql = """
        INSERT INTO purchases (
            id, "supplierId", "storeId", "userId", fecha, status, total, subtotal, "updatedAt"
        ) VALUES %s
    """
    
    items_sql = """
        INSERT INTO purchase_items (
            id, "purchaseId", "sku", cantidad, costo, importe, descripcion
        ) VALUES %s
    """

    purchases_data = [] # List of tuples
    items_data = [] # List of tuples
    
    # Pre-fetch existing Suppliers map: RFC -> ID
    cur_pg.execute('SELECT rfc, id FROM suppliers WHERE "storeId" = %s', (store_id,))
    supplier_rfc_map = {row[0].replace(" ", "").strip(): row[1] for row in cur_pg.fetchall() if row[0]}
    
    # Pre-fetch existing Products map: SKU -> ID
    cur_pg.execute('SELECT sku, id FROM products WHERE "storeId" = %s', (store_id,))
    product_sku_map = {row[0].strip(): row[1] for row in cur_pg.fetchall() if row[0]}

    loop_c = 0
    for row in rows_header:
        cve_doc = str(row[0]).strip()
        cve_clpv = str(row[1]).strip()
        supplier_rfc = str(row[4]).replace(" ", "").strip() if row[4] else 'XAXX010101000'
        
        # Reconstruct the composite RFC used in suppliers migration
        lookup_rfc = f"{supplier_rfc}_{cve_clpv}"
        
        fecha = row[2] # DateTime
        total = row[3] if row[3] is not None else 0.0
        
        # Link Supplier
        supplier_id = supplier_rfc_map.get(lookup_rfc)
        
        # If supplier not found, skip or create dummy? 
        # For now, skip if no supplier (orphan purchase)
        if not supplier_id:
            if loop_c < 10: # Print first 10 errors
                 print(f"⚠️ Proveedor no encontrado para compra {cve_doc} (Lookup: {lookup_rfc})")
                 loop_c += 1
            continue

        purchase_uuid = str(uuid.uuid4())
        
        purchases_data.append((
            purchase_uuid,
            supplier_id,
            store_id,
            user_id,
            fecha,
            'COMPLETED', # Status
            total,
            total, # Subtotal assumed same as total if tax unknown
            datetime.datetime.now()
        ))
        
        # Items
        if cve_doc in items_map:
            for item in items_map[cve_doc]:
                sku = str(item[1]).strip()
                cant = item[2] if item[2] is not None else 0
                cost = item[3] if item[3] is not None else 0.0
                total_partida = item[4] if item[4] is not None else 0.0
                
                product_id = product_sku_map.get(sku)
                if not product_id:
                    continue # Skip item if product not found
                
                items_data.append((
                    str(uuid.uuid4()),
                    purchase_uuid,
                    sku,
                    cant,
                    cost,
                    total_partida,
                    "Importado de Firebird"
                ))

    # Execute Batch
    if purchases_data:
        print(f"🚀 Insertando {len(purchases_data)} compras...")
        try:
            execute_values(cur_pg, purchases_sql, purchases_data)
            if items_data:
                print(f"🚀 Insertando {len(items_data)} partidas...")
                execute_values(cur_pg, items_sql, items_data)
            con_pg.commit()
            print("✅ Migración de compras exitosa.")
        except Exception as e:
            print(f"❌ Error insertando compras: {e}")
            con_pg.rollback()
    else:
        print("⚠️ No hay compras válidas para insertar.")

    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    migrate_purchases()

import fdb
import psycopg2
from psycopg2.extras import execute_values
import os
import uuid
import datetime
from decimal import Decimal

# Configuración Firebird (Proven working from migrate-suppliers.py)
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

def migrate():
    print("🔌 Conectando a Firebird...")
    try:
        con_fb = fdb.connect(**FB_CONFIG)
        cur_fb = con_fb.cursor()
        print("✅ Conectado a Firebird.")
    except Exception as e:
        print(f"❌ Error conectando a Firebird: {e}")
        return

    print("🔌 Conectando a Postgres...")
    try:
        con_pg = psycopg2.connect(**PG_CONFIG)
        cur_pg = con_pg.cursor()
        print("✅ Conectado a Postgres.")
    except Exception as e:
        print(f"❌ Error conectando a Postgres: {e}")
        con_fb.close()
        return

    # 1. Fetch Warehouse Customer UUIDs
    # We need the UUIDs for customers "BODEGA" and "CORAZON" to link the stock correctly.
    print("🏢 Obteniendo IDs de Clientes para Almacenes...")
    
    # Map Firebird Warehouse ID (int) -> Customer Search Term (string)
    # 1 -> BODEGA (Customer 1)
    # 2 -> CORAZON (Customer 2)
    warehouse_map = {
        1: 'BODEGA',
        2: 'CORAZON' 
    }
    
    # Store the Postgres UUIDs for these stores
    store_uuids = {}

    for wh_id, search_term in warehouse_map.items():
        # Searching by RFC-like match or Name is tricky if migration changed things.
        # But we know they were migrated. Let's try finding by Name (razonSocial) using ILIKE
        cur_pg.execute("""
            SELECT id FROM customers 
            WHERE "razonSocial" ILIKE %s 
            LIMIT 1
        """, (f'%{search_term}%',))
        
        row = cur_pg.fetchone()
        if row:
            store_uuids[wh_id] = row[0]
            print(f"   ✅ Almacén {wh_id} ({search_term}) -> UUID {row[0]}")
            
            # Ensure Store exists for FK constraint
            cur_pg.execute("SELECT id FROM stores WHERE id = %s", (row[0],))
            if not cur_pg.fetchone():
                print(f"   🔧 Creando Store para {search_term}...")
                cur_pg.execute("""
                    INSERT INTO stores (id, name, "createdAt", "updatedAt")
                    VALUES (%s, %s, NOW(), NOW())
                """, (row[0], search_term))
                con_pg.commit()

        else:
            print(f"   ⚠️ NO SE ENCONTRÓ CLIENTE PARA ALMACÉN {wh_id} ({search_term})")
            # Fallback? Maybe skip or log error. For now, we skip migration for this warehouse.

    # 1.5 Get Default User
    cur_pg.execute("SELECT id FROM users WHERE email='user1@gmail.com' LIMIT 1")
    user_row = cur_pg.fetchone()
    user_id = user_row[0] if user_row else None


    # 2. Query Firebird
    # We join INVE01 (Details) with MULT01 (Stock per Warehouse)
    # We filter by the warehouses we care about (1 and 2)
    print("📦 Leyendo MULT01 + INVE01...")
    query = """
        SELECT 
            m.CVE_ALM,
            i.CVE_ART, i.DESCR, i.LIN_PROD, 
            m.EXIST, -- Stock from MULT01 specific to warehouse
            p.PRECIO, 
            i.FCH_ULTVTA, i.FCH_ULTCOM,
            i.COSTO_PROM, i.ULT_COSTO, i.UNI_MED, i.PESO, 
            m.STOCK_MIN, m.STOCK_MAX -- Min/Max also from MULT01
        FROM MULT01 m
        JOIN INVE01 i ON m.CVE_ART = i.CVE_ART
        LEFT JOIN PRECIO_X_PROD01 p ON i.CVE_ART = p.CVE_ART AND p.CVE_PRECIO = 1
        WHERE m.CVE_ALM IN (1, 2)
    """
    
    try:
        cur_fb.execute(query)
        rows = cur_fb.fetchall()
        print(f"📊 Encontrados {len(rows)} registros de inventario desglosado.")
    except Exception as e:
        print(f"❌ Error leyendo DB Firebird: {e}")
        con_fb.close()
        con_pg.close()
        return

    print("🚀 Insertando en Postgres...")
    
    upsert_sql = """
        INSERT INTO products (
            id, sku, description, line, stock, price, "lastSync", 
            "storeId", "userId", "lastSale", "lastPurchase",
            "costoPromedio", "costoUltimo", "unidadMedida", peso, "stockMin", "stockMax"
        )
        VALUES %s
        ON CONFLICT ("storeId", sku) DO UPDATE SET
            description = EXCLUDED.description,
            line = EXCLUDED.line,
            stock = EXCLUDED.stock,
            price = EXCLUDED.price,
            "lastSale" = EXCLUDED."lastSale",
            "lastPurchase" = EXCLUDED."lastPurchase",
            "costoPromedio" = EXCLUDED."costoPromedio",
            "costoUltimo" = EXCLUDED."costoUltimo",
            "unidadMedida" = EXCLUDED."unidadMedida",
            peso = EXCLUDED.peso,
            "stockMin" = EXCLUDED."stockMin",
            "stockMax" = EXCLUDED."stockMax",
            "lastSync" = NOW();
    """

    data_to_insert = []
    
    for row in rows:
        wh_id = int(row[0])
        
        # Check if we have a valid Postgres Store UUID for this warehouse
        if wh_id not in store_uuids:
            continue
            
        target_store_id = store_uuids[wh_id]

        sku = row[1].strip() if row[1] else None
        if not sku: continue
        
        descr = row[2].strip() if row[2] else 'Sin Descripción'
        line = row[3].strip() if row[3] else None
        
        stock = row[4] if row[4] is not None else 0.0 # From MULT01
        
        price = row[5] if row[5] is not None else 0.0
        
        last_sale = row[6] # DateTime or None
        last_purchase = row[7] # DateTime or None
        
        costo_prom = row[8] if row[8] is not None else 0.0
        ult_costo = row[9] if row[9] is not None else 0.0
        uni_med = str(row[10]).strip() if row[10] else 'PZA'
        peso = row[11] if row[11] is not None else 0.0
        
        stock_min = row[12] if row[12] is not None else 0.0 # From MULT01
        stock_max = row[13] if row[13] is not None else 0.0 # From MULT01

        data_to_insert.append((
            str(uuid.uuid4()), 
            sku, 
            descr, 
            line, 
            stock, 
            price, 
            datetime.datetime.now(), 
            target_store_id, # Asssigned to specific Customer-Store
            user_id,
            last_sale,
            last_purchase,
            costo_prom,
            ult_costo,
            uni_med,
            peso,
            stock_min,
            stock_max
        ))

    if data_to_insert:
        try:
            execute_values(cur_pg, upsert_sql, data_to_insert)
            con_pg.commit()
            print(f"✅ Migración exitosa de {len(data_to_insert)} registros distribuidos en almacenes.")
        except Exception as e:
            print(f"❌ Error insertando en Postgres: {e}")
            con_pg.rollback()
    else:
        print("⚠️ No hay datos válidos para insertar (quizás faltan los clientes destino).")

    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    migrate()

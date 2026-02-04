import fdb
import psycopg2
from psycopg2.extras import execute_values
import os
from decimal import Decimal

# Configuración Firebird
FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8' 
}

# Configuración Postgres
PG_CONFIG = {
    'dbname': 'aspel_dashboard',
    'user': 'postgres',
    'password': 'password123',
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

    print("📦 Leyendo INVE01...")
    try:
        # Joining with PRECIO_X_PROD01 for price (CVE_PRECIO = 1 usually public price)
        # Added FCH_ULTVTA (Last Sale) and FCH_ULTCOM (Last Purchase)
        # Added COSTO_PROM, ULT_COSTO, UNI_MED, PESO, STOCK_MIN, STOCK_MAX
        query = """
            SELECT 
                i.CVE_ART, i.DESCR, i.LIN_PROD, i.EXIST, p.PRECIO, 
                i.FCH_ULTVTA, i.FCH_ULTCOM,
                i.COSTO_PROM, i.ULT_COSTO, i.UNI_MED, i.PESO, i.STOCK_MIN, i.STOCK_MAX
            FROM INVE01 i
            LEFT JOIN PRECIO_X_PROD01 p ON i.CVE_ART = p.CVE_ART AND p.CVE_PRECIO = 1
        """
        cur_fb.execute(query)
        rows = cur_fb.fetchall()
        print(f"📊 Encontrados {len(rows)} productos con precio, fechas y datos extendidos.")
    except Exception as e:
        print(f"❌ Error leyendo INVE01: {e}")
        con_fb.close()
        con_pg.close()
        return

    # 0. Obtener Default Store y User
    print("🏢 Obteniendo Store/User por defecto...")
    cur_pg.execute("SELECT id FROM stores WHERE id = 'default-store' LIMIT 1")
    store_row = cur_pg.fetchone()
    store_id = store_row[0] if store_row else 'default-store'
    
    cur_pg.execute("SELECT id FROM users WHERE email='user1@gmail.com' LIMIT 1")
    user_row = cur_pg.fetchone()
    user_id = user_row[0] if user_row else None

    import uuid

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
        sku = row[0].strip() if row[0] else None
        if not sku: continue
        
        descr = row[1].strip() if row[1] else 'Sin Descripción'
        line = row[2].strip() if row[2] else None
        stock = row[3] if row[3] is not None else 0.0
        price = row[4] if row[4] is not None else 0.0
        
        last_sale = row[5] # DateTime or None
        last_purchase = row[6] # DateTime or None
        
        costo_prom = row[7] if row[7] is not None else 0.0
        ult_costo = row[8] if row[8] is not None else 0.0
        uni_med = str(row[9]).strip() if row[9] else 'PZA'
        peso = row[10] if row[10] is not None else 0.0
        stock_min = row[11] if row[11] is not None else 0.0
        stock_max = row[12] if row[12] is not None else 0.0

        import datetime
        data_to_insert.append((
            str(uuid.uuid4()), 
            sku, 
            descr, 
            line, 
            stock, 
            price, 
            datetime.datetime.now(), 
            store_id, 
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

    try:
        execute_values(cur_pg, upsert_sql, data_to_insert)
        con_pg.commit()
        print(f"✅ Migración exitosa de {len(data_to_insert)} registros.")
    except Exception as e:
        print(f"❌ Error insertando en Postgres: {e}")
        con_pg.rollback()

    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    migrate()

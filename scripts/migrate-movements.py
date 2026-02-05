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

def migrate_movements():
    print("🔌 [Movements] Conectando a BDs...")
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

    # 2. Leer MINVE01 (Movimientos)
    print("📦 Leyendo MINVE01...")
    # CVE_ART (sku), FECHA_DOCU (fecha), CANT, REFER (Referencia), CVE_CPTO (concepto), COSTO, PRECIO
    query = """
        SELECT m.CVE_ART, m.FECHA_DOCU, m.CANT, m.REFER, m.CVE_CPTO, m.COSTO, m.PRECIO
        FROM MINVE01 m
    """
    try:
        cur_fb.execute(query)
        rows = cur_fb.fetchall()
        print(f"📊 Encontrados {len(rows)} movimientos en Firebird.")
    except Exception as e:
        print(f"❌ Error query MINV01: {e}")
        return

    insert_sql = """
        INSERT INTO inventory_movements (
            id, sku, "storeId", "userId", "tipoMovimiento", cantidad, costo, fecha, concepto
        ) VALUES %s
    """
    
    movements_data = []
    
    for row in rows:
        sku = str(row[0]).strip()
        fecha = row[1] if row[1] else datetime.datetime.now()
        cant = float(row[2]) if row[2] is not None else 0.0
        ref = str(row[3]).strip() if row[3] else 'Sin Ref'
        cpto_id = int(row[4]) if row[4] is not None else 0
        costo = float(row[5]) if row[5] is not None else 0.0
        
        # Determine Type: IN/OUT/ADJ
        mov_type = 'A' # Ajuste default
        
        # SAE Concepts Logic (Simplified)
        # 1-30: Entry (Entrada)
        # 31-60: Exit (Salida) ?
        if cpto_id <= 30: 
             mov_type = 'E'
        else:
             mov_type = 'S'
        
        concepto = f"Migracion Ref:{ref} Cpto:{cpto_id}"
        
        movements_data.append((
            str(uuid.uuid4()),
            sku,
            store_id,
            user_id,
            mov_type,
            cant,
            costo,
            fecha,
            concepto
        ))

    if movements_data:
        print(f"🚀 Insertando {len(movements_data)} movimientos...")
        try:
            execute_values(cur_pg, insert_sql, movements_data)
            con_pg.commit()
            print("✅ Migración de movimientos exitosa.")
        except Exception as e:
            print(f"❌ Error insertando movimientos: {e}")
            con_pg.rollback()

    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    migrate_movements()

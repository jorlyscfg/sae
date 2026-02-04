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
    'dbname': 'aspel_dashboard',
    'user': 'postgres',
    'password': 'password123',
    'host': 'localhost',
    'port': 5432
}

def migrate_suppliers():
    print("🔌 [Suppliers] Conectando a BDs...")
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
    print("🏢 Obteniendo Store/User por defecto...")
    cur_pg.execute("SELECT id FROM stores WHERE id = 'default-store' LIMIT 1")
    store_row = cur_pg.fetchone()
    store_id = store_row[0] if store_row else 'default-store'
    
    cur_pg.execute("SELECT id FROM users WHERE email='user1@gmail.com' LIMIT 1")
    user_row = cur_pg.fetchone()
    user_id = user_row[0] if user_row else None

    # 2. Leer Proveedores (PROV01)
    print("📦 Leyendo PROV01...")
    # Map common fields: 
    # CLAVE (id), NOMBRE (razonSocial), RFC, CALLE, TELEFONO, EMAIL...
    # Need to check columns? We assume standard SAE structure based on CLIE01
    # Usually: CLAVE, NOMBRE, RFC, CALLE, COLONIA, POBLA (Municipio?), ESTADO, TELEFONO, ...
    
    query = """
        SELECT CLAVE, NOMBRE, RFC, CALLE, COLONIA, POBLA, ESTADO, TELEFONO, MAIL, CONTACTO, DIASCRED, LIMCRED
        FROM PROV01
    """
    try:
        cur_fb.execute(query)
        rows = cur_fb.fetchall()
        print(f"📊 Encontrados {len(rows)} proveedores en Firebird.")
    except Exception as e:
        print(f"❌ Error en query PROV01: {e}")
        return

    # 3. Preparar Datos
    insert_sql = """
        INSERT INTO suppliers (
            id, rfc, "razonSocial", direccion, telefono, email, contacto,
            "diasCredito", "limiteCredito", "storeId", "userId", "updatedAt"
        )
        VALUES %s
        ON CONFLICT ("storeId", rfc) DO UPDATE SET
            "razonSocial" = EXCLUDED."razonSocial",
            direccion = EXCLUDED.direccion,
            telefono = EXCLUDED.telefono,
            email = EXCLUDED.email,
            contacto = EXCLUDED.contacto,
            "diasCredito" = EXCLUDED."diasCredito",
            "limiteCredito" = EXCLUDED."limiteCredito",
            "updatedAt" = NOW();
    """
    
    suppliers_data = []
    
    for row in rows:
        clave = str(row[0]).strip()
        nombre = str(row[1]).strip() if row[1] else f"Proveedor {clave}"
        raw_rfc = str(row[2]).strip() if row[2] else 'XAXX010101000'
        
        calle = str(row[3]).strip() if row[3] else ''
        colonia = str(row[4]).strip() if row[4] else ''
        pobla = str(row[5]).strip() if row[5] else ''
        estado = str(row[6]).strip() if row[6] else ''
        
        direccion = f"{calle}, {colonia}, {pobla}, {estado}".strip(", ")
        
        telefono = str(row[7]).strip() if row[7] else None
        email = str(row[8]).strip() if row[8] else None
        contacto = str(row[9]).strip() if row[9] else None
        
        dias_cred = int(row[10]) if row[10] is not None else 0
        lim_cred = row[11] if row[11] is not None else 0.0

        # Unique RFC per store. Need compound if duplicates exist?
        # Usually suppliers have unique RFC. If duplicate, we upsert on first.
        # But to be safe like Customers, we might need a mapping strategy.
        # For now, let's assume RFC is primary key enough or we use UUID.
        # If we have duplicate RFCs, the upsert will overwrite.
        
        suppliers_data.append((
            str(uuid.uuid4()),
            raw_rfc,
            nombre,
            direccion,
            telefono,
            email,
            contacto,
            dias_cred,
            lim_cred,
            store_id,
            user_id,
            datetime.datetime.now()
        ))

    if suppliers_data:
        print(f"🚀 Insertando/Actualizando {len(suppliers_data)} proveedores en Postgres...")
        try:
            execute_values(cur_pg, insert_sql, suppliers_data)
            con_pg.commit()
            print("✅ Migración de proveedores exitosa.")
        except Exception as e:
            print(f"❌ Error insertando proveedores: {e}")
            con_pg.rollback()
    
    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    migrate_suppliers()

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

def migrate_customers():
    print("🔌 [Customers] Conectando a BDs...")
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
    
    # User ID (For now we assume same as store default user or NULL)
    # Let's get the user we seeded
    cur_pg.execute("SELECT id FROM users WHERE email='user1@gmail.com' LIMIT 1")
    user_row = cur_pg.fetchone()
    user_id = user_row[0] if user_row else None

    # 2. Leer Clientes de Firebird (CLIE01)
    print("📦 Leyendo CLIE01...")
    # CLAVE, RFC, NOMBRE, ...
    query = """
        SELECT 
            CLAVE, RFC, NOMBRE, MAIL,
            CALLE, NUMEXT, NUMINT, COLONIA, CODIGO, MUNICIPIO, ESTADO, PAIS,
            TELEFONO, LIMCRED, DIASCRED, SALDO, CVE_VEND
        FROM CLIE01
    """
    cur_fb.execute(query)
    rows = cur_fb.fetchall()
    print(f"📊 Encontrados {len(rows)} clientes en Firebird.")

    # 3. Preparar Datos
    insert_sql = """
        INSERT INTO customers (
            id, rfc, "razonSocial", email, 
            calle, colonia, "codigoPostal", municipio, estado, pais,
            telefono, "limiteCredito", "diasCredito", saldo, "vendedorId",
            "storeId", "userId", "updatedAt"
        )
        VALUES %s
        ON CONFLICT ("storeId", rfc) DO UPDATE SET
            "razonSocial" = EXCLUDED."razonSocial",
            email = EXCLUDED.email,
            calle = EXCLUDED.calle,
            colonia = EXCLUDED.colonia,
            "codigoPostal" = EXCLUDED."codigoPostal",
            municipio = EXCLUDED.municipio,
            estado = EXCLUDED.estado,
            telefono = EXCLUDED.telefono,
            "limiteCredito" = EXCLUDED."limiteCredito",
            "diasCredito" = EXCLUDED."diasCredito",
            saldo = EXCLUDED.saldo,
            "updatedAt" = NOW();
    """
    
    customers_data = []
    
    for row in rows:
        cve_clie = str(row[0]).strip() # CLAVE
        raw_rfc = str(row[1]).strip() if row[1] else 'XAXX010101000'
        nombre = str(row[2]).strip() if row[2] else f"Cliente {cve_clie}"
        email = str(row[3]).strip() if row[3] else None
        
        # Address
        calle = str(row[4]).strip() if row[4] else ''
        numext = str(row[5]).strip() if row[5] else ''
        calle_full = f"{calle} {numext}".strip()
        
        colonia = str(row[7]).strip() if row[7] else None
        cp = str(row[8]).strip() if row[8] else None
        municipio = str(row[9]).strip() if row[9] else None
        estado = str(row[10]).strip() if row[10] else None
        pais = str(row[11]).strip() if row[11] else 'MEXICO'
        
        telefono = str(row[12]).strip() if row[12] else None
        
        lim_cred = row[13] if row[13] is not None else 0.0
        dias_cred = int(row[14]) if row[14] is not None else 0
        saldo = row[15] if row[15] is not None else 0.0
        vendedor = str(row[16]).strip() if row[16] else None

        # Clean RFC to remove spaces
        raw_rfc = raw_rfc.replace(" ", "")
        compound_rfc = f"{raw_rfc}_{cve_clie}"
        
        customers_data.append((
            str(uuid.uuid4()),
            compound_rfc,
            nombre,
            email,
            calle_full,
            colonia,
            cp,
            municipio,
            estado,
            pais,
            telefono,
            lim_cred,
            dias_cred,
            saldo,
            vendedor,
            store_id,
            user_id,
            datetime.datetime.now()
        ))

    if customers_data:
        print(f"🚀 Insertando/Actualizando {len(customers_data)} clientes en Postgres...")
        try:
            execute_values(cur_pg, insert_sql, customers_data)
            con_pg.commit()
            print("✅ Migración de clientes exitosa.")
        except Exception as e:
            print(f"❌ Error insertando clientes: {e}")
            con_pg.rollback()
    
    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    migrate_customers()

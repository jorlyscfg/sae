
import fdb
import psycopg2
from psycopg2.extras import execute_values
import uuid
import datetime
from decimal import Decimal

# Configuración Firebird (Legacy)
FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8' 
}

# Configuración Postgres (New App)
PG_CONFIG = {
    'dbname': 'aspel_dashboard',
    'user': 'postgres',
    'password': 'password123',
    'host': 'localhost',
    'port': 5432
}

def migrate_cxc():
    print("🔌 [CxC] Conectando a BDs...")
    try:
        con_fb = fdb.connect(**FB_CONFIG)
        cur_fb = con_fb.cursor()
        con_pg = psycopg2.connect(**PG_CONFIG)
        cur_pg = con_pg.cursor()
        print("✅ Conexiones exitosas.")
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return

    # 1. Obtener Mapa de Clientes (RFC -> ID)
    print("🔍 Cargando mapa de clientes...")
    cur_pg.execute("SELECT substring(rfc from '.*_([0-9A-Z]+)$'), id FROM customers")
    customer_map = {row[0]: row[1] for row in cur_pg.fetchall() if row[0]}
    
    # 2. Leer Maestro de Cuentas (CUEN_M01) - Cargos Iniciales
    print("📦 Leer CUEN_M01 (Agrupando por REFER + CLIENTE)...")
    cur_fb.execute("""
        SELECT REFER, CVE_CLIE, NO_FACTURA, FECHA_APLI, FECHA_VENC, IMPORTE, SIGNO
        FROM CUEN_M01
        WHERE SIGNO = 1
    """)
    m_rows = cur_fb.fetchall()
    
    # Estructura: (cve_clie, refer) -> {data}
    accounts = {}
    
    for row in m_rows:
        refer = str(row[0]).strip()
        cve_clie = str(row[1]).strip()
        cust_id = customer_map.get(cve_clie)
        if not cust_id: continue
        
        comp_key = (cve_clie, refer)
        importe = float(row[5])
        
        if comp_key not in accounts:
            accounts[comp_key] = {
                'cust_id': cust_id,
                'folio': str(row[2]).strip() if row[2] else refer,
                'fecha_emision': row[3],
                'fecha_venc': row[4],
                'importe_original': 0.0,
                'pagos': 0.0
            }
        
        # Acumular Cargos (si existen duplicados)
        accounts[comp_key]['importe_original'] += importe
        
    print(f"   -> {len(accounts)} cuentas únicas consolidadas.")
    
    # 3. Leer Detalle (CUEN_DET01) - Pagos y Abonos
    print("📦 Leyendo CUEN_DET01 (Pagos)...")
    cur_fb.execute("SELECT REFER, CVE_CLIE, IMPORTE, SIGNO FROM CUEN_DET01 WHERE SIGNO = -1")
    d_rows = cur_fb.fetchall()
    
    for row in d_rows:
        refer = str(row[0]).strip()
        cve_clie = str(row[1]).strip()
        importe = float(row[2])
        
        comp_key = (cve_clie, refer)
        
        if comp_key in accounts:
            accounts[comp_key]['pagos'] += importe

    # 0. Obtener Default Store
    cur_pg.execute("SELECT id FROM stores WHERE id = 'default-store' LIMIT 1")
    store_row = cur_pg.fetchone()
    store_id = store_row[0] if store_row else 'default-store'

    # 4. Filtrar y Preparar Inserción
    insert_query = """
        INSERT INTO receivables (id, "customerId", folio, "fechaEmision", "fechaVencimiento", "importeOriginal", saldo, estatus, "updatedAt", "storeId", "userId")
        VALUES %s
    """
    
    receivables_data = []
    now = datetime.datetime.now()
    
    print("⚙️ Calculando saldos...")
    debug_limit = 5
    for comp_key, data in accounts.items():
        original = data['importe_original']
        pagos = data['pagos']
        saldo = original - pagos
        
        estatus = 'PAGADO'
        if saldo > 0.1:
            estatus = 'PENDIENTE'
            if data['fecha_venc'] and data['fecha_venc'] < datetime.date.today():
                 estatus = 'VENCIDO'
        
        # Importamos TODO para tener historial
        receivables_data.append((
            str(uuid.uuid4()),
            data['cust_id'],
            data['folio'],
            data['fecha_emision'],
            data['fecha_venc'],
            original,
            saldo,
            estatus,
            now,
            store_id,
            None
        ))

    if receivables_data:
        print(f"🚀 Insertando {len(receivables_data)} registros de historial CxC...")
        execute_values(cur_pg, insert_query, receivables_data)
        con_pg.commit()
    
    print(f"🏁 Migración Finalizada. {len(receivables_data)} importados.")

    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    migrate_cxc()

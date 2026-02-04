import fdb
import psycopg2
from psycopg2.extras import execute_values
import uuid
import datetime
from decimal import Decimal
import os

# Configuración Firebird (Vía Puerto Mapeado 3052)
FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8' 
}

# Configuración Postgres (Localhost)
PG_CONFIG = {
    'dbname': 'aspel_dashboard',
    'user': 'postgres',
    'password': 'password123',
    'host': 'localhost',
    'port': 5432
}

def migrate():
    print("🔌 [Sync] Conectando a BDs...")
    try:
        con_fb = fdb.connect(**FB_CONFIG)
        cur_fb = con_fb.cursor()
        con_pg = psycopg2.connect(**PG_CONFIG)
        cur_pg = con_pg.cursor()
        print("✅ Conexiones exitosas.")
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return

    # 0. Obtener Default Store y User
    print("🏢 Obteniendo Store/User por defecto...")
    cur_pg.execute("SELECT id FROM stores WHERE id = 'default-store' LIMIT 1")
    store_row = cur_pg.fetchone()
    store_id = store_row[0] if store_row else 'default-store'

    # 0.1 Limpieza Previa
    print("Sweep: Limpiando facturas previas para recarga limpia...")
    cur_pg.execute("TRUNCATE invoice_items, invoices CASCADE")
    con_pg.commit()

    # 2. Mapa Clientes
    print("🔍 Cargando mapa de clientes...")
    cur_pg.execute("SELECT substring(rfc from '.*_([0-9A-Z]+)$'), id FROM customers")
    customer_map = {row[0]: row[1] for row in cur_pg.fetchall() if row[0]}

    # 3. DOCUMENTOS (FACTF01 y FACTV01)
    invoice_doc_map = {} # CVE_DOC -> UUID (internal)
    
    def migrate_docs(table_name, is_fiscal, status_label):
        print(f"📦 Migrando {table_name} ({status_label}) con montos corregidos...")
        try:
            query = f"""
                SELECT CVE_DOC, UUID, SERIE, FOLIO, FECHA_DOC, CAN_TOT, IMPORTE, CVE_CLPV, TIP_DOC
                FROM {table_name}
            """
            cur_fb.execute(query)
            rows = cur_fb.fetchall()
            
            insert_inv = """
                INSERT INTO invoices (id, uuid, serie, folio, "fechaEmision", total, subtotal, "customerId", "tipoComprobante", "xmlPath", "isFiscal", status, "storeId", "userId")
                VALUES %s
            """
            
            inv_data = []
            for row in rows:
                cve_doc = str(row[0]).strip()
                uuid_sat = str(row[1]).strip() if row[1] else f"TEMP-{cve_doc}-{table_name}"
                serie = str(row[2]).strip() if row[2] else None
                folio = str(row[3]).strip() if row[3] is not None else None
                fecha = row[4]
                subtotal = row[5] if row[5] is not None else 0.0
                total = row[6] if row[6] is not None else subtotal
                cve_clpv = str(row[7]).strip()
                tip_doc = str(row[8]).strip() if row[8] else 'I'
                
                cust_id = customer_map.get(cve_clpv)
                if not cust_id: continue
                
                new_id = str(uuid.uuid4())
                invoice_doc_map[cve_doc] = new_id
                
                xml_path = f"{uuid_sat}.xml" if is_fiscal else None
                tipo = 'I'
                if tip_doc in ['D', 'E']: tipo = 'E'
                
                # Default User ID is hardcoded for now or fetched, we'll use null for user if not critical, but schema might require it? schema says userId String? (nullable)
                # But storeId is required.
                
                inv_data.append((new_id, uuid_sat, serie, folio, fecha, total, subtotal, cust_id, tipo, xml_path, is_fiscal, status_label, store_id, None))
            
            if inv_data:
                execute_values(cur_pg, insert_inv, inv_data)
                con_pg.commit()
                print(f"✅ {len(inv_data)} registros de {table_name} corregidos.")
        except Exception as e:
            print(f"❌ Error en {table_name}: {e}")
            con_pg.rollback()

    migrate_docs("FACTF01", True, "Facturado")
    migrate_docs("FACTV01", False, "Nota de Venta")

    # 4. PARTIDAS
    def migrate_items(table_name):
        print(f"📦 Migrando PARTIDAS de {table_name}...")
        try:
            query = f"""
                SELECT p.CVE_DOC, p.CVE_ART, p.CANT, p.PREC, p.TOT_PARTIDA, i.DESCR, p.UNI_VENTA
                FROM {table_name} p
                LEFT JOIN INVE01 i ON p.CVE_ART = i.CVE_ART
            """
            cur_fb.execute(query)
            rows = cur_fb.fetchall()
            
            insert_items = """
                INSERT INTO invoice_items (id, "invoiceId", descripcion, cantidad, "valorUnitario", importe, unidad)
                VALUES %s
            """
            
            items_data = []
            for row in rows:
                cve_doc = str(row[0]).strip()
                inv_id = invoice_doc_map.get(cve_doc)
                if not inv_id: continue
                
                sku = str(row[1]).strip() if row[1] else ''
                cant = row[2] if row[2] is not None else 0.0
                prec = row[3] if row[3] is not None else 0.0
                tot = row[4] if row[4] is not None else 0.0
                descr = f"({sku}) {str(row[5]).strip()}" if row[5] else sku
                uni = str(row[6]).strip() if row[6] else 'PZA'
                
                items_data.append((str(uuid.uuid4()), inv_id, descr, cant, prec, tot, uni))
            
            if items_data:
                execute_values(cur_pg, insert_items, items_data)
                con_pg.commit()
                print(f"✅ {len(items_data)} partidas de {table_name} migradas.")
        except Exception as e:
            print(f"❌ Error en partidas de {table_name}: {e}")
            con_pg.rollback()

    migrate_items("PAR_FACTF01")
    migrate_items("PAR_FACTV01")

    con_fb.close()
    con_pg.close()
    print("🏁 Sincronización de Montos Finalizada.")

if __name__ == "__main__":
    migrate()

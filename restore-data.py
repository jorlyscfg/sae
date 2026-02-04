import fdb
import psycopg2
from psycopg2.extras import execute_values
import uuid
import datetime
from decimal import Decimal

# Configuración Firebird (Local en el contenedor)
FB_CONFIG = {
    'dsn': 'localhost/3050:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': 'masterkey',
    'charset': 'UTF8' 
}

# Configuración Postgres (Servicio Docker)
PG_CONFIG = {
    'dbname': 'aspel_dashboard',
    'user': 'postgres',
    'password': 'password123',
    'host': 'localhost',
    'port': 5432
}

def migrate():
    print("🔌 [Full] Conectando a BDs...")
    try:
        con_fb = fdb.connect(**FB_CONFIG)
        cur_fb = con_fb.cursor()
        con_pg = psycopg2.connect(**PG_CONFIG)
        cur_pg = con_pg.cursor()
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return

    # 1. CLIENTES
    print("📦 Migrando CLIENTES (CLIE01)...")
    customer_map = {} # CVE_CLIE -> UUID
    try:
        cur_fb.execute("SELECT CLAVE, RFC, NOMBRE, EMAILPRED FROM CLIE01 WHERE STATUS <> 'B'")
        rows = cur_fb.fetchall()
        
        upsert_sql = """
            INSERT INTO customers (id, rfc, "razonSocial", email, "createdAt", "updatedAt")
            VALUES %s
            ON CONFLICT (rfc) DO UPDATE SET
                "razonSocial" = EXCLUDED."razonSocial",
                email = EXCLUDED.email,
                "updatedAt" = NOW()
            RETURNING rfc, id;
        """
        
        data = []
        rows_map = {} # rfc -> clave_firebird
        
        for row in rows:
            clave = row[0].strip()
            rfc = row[1].strip() if row[1] else f"XAXX010101000_{clave}" # Fallback RFC
            nombre = row[2].strip() if row[2] else 'Sin Nombre'
            email = row[3].strip() if row[3] else None
            
            # Limpiar RFC raros
            rfc = rfc.replace("-", "").replace(" ", "").upper()
            
            new_id = str(uuid.uuid4())
            data.append((new_id, rfc, nombre, email, datetime.datetime.now(), datetime.datetime.now()))
            rows_map[rfc] = clave

        if data:
            execute_values(cur_pg, upsert_sql, data)
            # Recuperar IDs reales (creados o actualizados)
            # Nota: execute_values no soporta fetch RETURNING bien con conflictos en todas las versiones,
            # así que haremos un fetch posterior para construir el mapa.
            con_pg.commit()
            
            cur_pg.execute('SELECT rfc, id FROM customers')
            pg_customers = cur_pg.fetchall()
            
            # Mapear RFC -> UUID Postgres
            rfc_to_uuid = {r[0]: r[1] for r in pg_customers}
            
            # Construir mapa CLAVE_FIREBIRD -> UUID_POSTGRES
            for rfc, clave_fb in rows_map.items():
                if rfc in rfc_to_uuid:
                    customer_map[clave_fb] = rfc_to_uuid[rfc]
                    
            print(f"✅ Migrados {len(data)} clientes.")
        else:
            print("⚠️ No hay clientes para migrar.")

    except Exception as e:
        print(f"❌ Error en clientes: {e}")
        con_pg.rollback()


    # 2. FACTURAS (FACTF01)
    print("📦 Migrando FACTURAS (FACTF01)...")
    invoice_doc_map = {} # CVE_DOC -> UUID string
    try:
        # Re-hacer query con impuestos
        query_v2 = """
            SELECT CVE_DOC, UUID, SERIE, FOLIO, FECHA_DOC, IMPORTE, IMP_TOT4, CVE_CLPV, TIP_DOC
            FROM FACTF01
            WHERE UUID IS NOT NULL AND UUID <> ''
        """
        # Notas: IMPORTE es subtotal. IMP_TOT4 suele ser el total final en Aspel.
        
        upsert_invoice = """
            INSERT INTO invoices (id, uuid, serie, folio, "fechaEmision", total, subtotal, "customerId", "tipoComprobante", "xmlPath")
            VALUES %s
            ON CONFLICT (uuid) DO NOTHING
        """

        inv_data = []

        cur_fb.execute(query_v2)
        rows_v2 = cur_fb.fetchall()
        
        for row in rows_v2:
            cve_doc = str(row[0]).strip() if row[0] is not None else '' # Fix
            uuid_sat = str(row[1]).strip() if row[1] is not None else '' # Fix
            serie = str(row[2]).strip() if row[2] else None # Fix
            folio = str(row[3]).strip() if row[3] is not None else None 
            fecha = row[4] if row[4] else datetime.datetime.now()
            subtotal = row[5] if row[5] else 0.0
            total = row[6] if row[6] else subtotal 
            cve_clpv = str(row[7]).strip() if row[7] is not None else '' # Fix: CVE_CLPV might be int
            tip_doc = str(row[8]).strip() if row[8] else 'I' # Fix
            
            if not uuid_sat: continue
            
            # Mapear Tipo Comprobante
            tipo = 'I'
            if tip_doc == 'D': tipo = 'E'
            
            # Buscar ID Cliente Postgres
            customer_id = customer_map.get(cve_clpv)
            
            if not customer_id:
                # Si no existe, asociar a un cliente "Genérico" o saltar
                # Saltaremos por integridad
                continue
                
            # ID interno de factura = UUID generado o el UUID del SAT si es válido uuid v4?
            # Usaremos un nuevo UUID v4 para ID interno, y guardamos UUID SAT en campo uuid
            new_inv_id = str(uuid.uuid4())
            
            # Guardar mapping para partidas
            invoice_doc_map[cve_doc] = new_inv_id
            
            # Path XML (placeholder)
            xml_path = f"{uuid_sat}.xml"
            
            inv_data.append((new_inv_id, uuid_sat, serie, folio, fecha, total, subtotal, customer_id, tipo, xml_path))
            
        if inv_data:
            execute_values(cur_pg, upsert_invoice, inv_data)
            con_pg.commit()
            print(f"✅ Migradas {len(inv_data)} facturas.")
        else:
            print("⚠️ No hay facturas para migrar.")

    except Exception as e:
        print(f"❌ Error en facturas: {e}")
        con_pg.rollback()


    # 3. PARTIDAS (PAR_FACTF01)
    print("📦 Migrando PARTIDAS...")
    try:
        # Join con INVE01 para obtener descripcion
        query_items = """
            SELECT p.CVE_DOC, p.CVE_ART, p.CANT, p.PREC, p.TOT_PARTIDA, i.DESCR, p.UNI_VENTA
            FROM PAR_FACTF01 p
            LEFT JOIN INVE01 i ON p.CVE_ART = i.CVE_ART
        """
        cur_fb.execute(query_items)
        rows_items = cur_fb.fetchall()
        
        upsert_items = """
            INSERT INTO invoice_items (id, "invoiceId", descripcion, cantidad, "valorUnitario", importe, unidad)
            VALUES %s
        """
        
        items_data = []
        
        for row in rows_items:
            cve_doc = str(row[0]).strip() if row[0] is not None else '' # Fix
            cve_art = str(row[1]).strip() if row[1] else '' # Fix
            cant = row[2] if row[2] else 0.0
            prec = row[3] if row[3] else 0.0
            importe = row[4] if row[4] else 0.0
            descr = str(row[5]).strip() if row[5] else 'Sin descripción' # Fix
            unidad = str(row[6]).strip() if row[6] else 'PZA' # Fix
            
            # Buscar Invoice ID
            invoice_id = invoice_doc_map.get(cve_doc)
            if not invoice_id:
                continue
                
            new_item_id = str(uuid.uuid4())
            
            # Nota: No estamos linkeando productId directamente en BD (InvoiceItem no tiene relation field a Product en schema actual??)
            # Schema: InvoiceItem tiene: descripcion, etc. NO tiene productId. 
            # El link visual se hace por matching de texto/sku en el frontend/backend app.
            
            items_data.append((new_item_id, invoice_id, descr, cant, prec, importe, unidad))
            
        if items_data:
            execute_values(cur_pg, upsert_items, items_data)
            con_pg.commit()
            print(f"✅ Migradas {len(items_data)} partidas.")
        else:
            print("⚠️ No hay partidas.")

    except Exception as e:
        print(f"❌ Error en partidas: {e}")
        con_pg.rollback()

    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    migrate()

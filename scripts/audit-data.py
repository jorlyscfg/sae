import fdb
import psycopg2
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

def audit():
    print("🔍 [Audit] Iniciando Auditoría de Datos...")
    try:
        con_fb = fdb.connect(**FB_CONFIG)
        cur_fb = con_fb.cursor()
        con_pg = psycopg2.connect(**PG_CONFIG)
        cur_pg = con_pg.cursor()
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return

    results = []

    # 1. CLIENTES
    cur_fb.execute("SELECT COUNT(*) FROM CLIE01")
    fb_customers = cur_fb.fetchone()[0]
    cur_pg.execute("SELECT COUNT(*) FROM customers")
    pg_customers = cur_pg.fetchone()[0]
    results.append(("Clientes (Conteo)", fb_customers, pg_customers))

    # 2. PRODUCTOS
    cur_fb.execute("SELECT COUNT(*) FROM INVE01")
    fb_products = cur_fb.fetchone()[0]
    cur_pg.execute("SELECT COUNT(*) FROM products")
    pg_products = cur_pg.fetchone()[0]
    results.append(("Productos (Conteo)", fb_products, pg_products))

    cur_fb.execute("SELECT SUM(EXIST) FROM INVE01")
    fb_stock = cur_fb.fetchone()[0] or 0
    cur_pg.execute("SELECT SUM(stock) FROM products")
    pg_stock = float(cur_pg.fetchone()[0] or 0)
    results.append(("Stock Total (Suma)", round(fb_stock, 2), round(pg_stock, 2)))

    # 3. DOCUMENTOS (F + V)
    cur_fb.execute("SELECT COUNT(*) FROM FACTF01")
    fb_factf_count = cur_fb.fetchone()[0]
    cur_fb.execute("SELECT COUNT(*) FROM FACTV01")
    fb_factv_count = cur_fb.fetchone()[0]
    fb_total_docs = fb_factf_count + fb_factv_count

    cur_pg.execute("SELECT COUNT(*) FROM invoices")
    pg_total_docs = cur_pg.fetchone()[0]
    results.append(("Documentos Totales (F+V)", fb_total_docs, pg_total_docs))

    # Totales Financieros
    cur_fb.execute("SELECT SUM(CAN_TOT), SUM(IMPORTE) FROM FACTF01")
    fb_f_sub, fb_f_tot = cur_fb.fetchone()
    cur_fb.execute("SELECT SUM(CAN_TOT), SUM(IMPORTE) FROM FACTV01")
    fb_v_sub, fb_v_tot = cur_fb.fetchone()
    
    fb_sum_sub = (fb_f_sub or 0) + (fb_v_sub or 0)
    fb_sum_tot = (fb_f_tot or 0) + (fb_v_tot or 0)

    cur_pg.execute("SELECT SUM(subtotal), SUM(total) FROM invoices")
    pg_sum_sub, pg_sum_tot = cur_pg.fetchone()
    
    results.append(("Subtotal Total (Suma $)", round(fb_sum_sub, 2), round(float(pg_sum_sub or 0), 2)))
    results.append(("Total Global (Suma $)", round(fb_sum_tot, 2), round(float(pg_sum_tot or 0), 2)))

    # 4. PARTIDAS
    cur_fb.execute("SELECT COUNT(*) FROM PAR_FACTF01")
    fb_items_f = cur_fb.fetchone()[0]
    cur_fb.execute("SELECT COUNT(*) FROM PAR_FACTV01")
    fb_items_v = cur_fb.fetchone()[0]
    fb_total_items = fb_items_f + fb_items_v

    cur_pg.execute("SELECT COUNT(*) FROM invoice_items")
    pg_total_items = cur_pg.fetchone()[0]
    results.append(("Partidas Totales (Suma)", fb_total_items, pg_total_items))

    print("\n📊 RESULTADOS DE LA COMPARACIÓN:")
    print(f"{'Métrica':<30} | {'Firebird':>15} | {'Postgres':>15} | {'Estado'}")
    print("-" * 80)
    
    discrepancies = 0
    for title, fb_val, pg_val in results:
        match = "✅ OK" if fb_val == pg_val else "❌ ERROR"
        if fb_val != pg_val: discrepancies += 1
        print(f"{title:<30} | {str(fb_val):>15} | {str(pg_val):>15} | {match}")

    print("-" * 80)
    if discrepancies == 0:
        print("\n🏆 INTEGRIDAD TOTAL: Los datos coinciden al 100%.")
    else:
        print(f"\n⚠️ SE DETECTARON {discrepancies} DISCREPANCIAS.")

    con_fb.close()
    con_pg.close()

if __name__ == "__main__":
    audit()

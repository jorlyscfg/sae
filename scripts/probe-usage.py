
import fdb
import os

# Configuración Firebird (Vía Puerto Mapeado 3052)
FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8'
}

TABLES_TO_PROBE = {
    'PROV01': 'Proveedores',
    'COMP01': 'Compras/Recepciones',
    'CUEN_DET01': 'Ctas por Cobrar (Detalle)',
    'CUEN_M01': 'Ctas por Cobrar (Saldos)',
    'PAGOS01': 'Pagos de Clientes',
    'VEND01': 'Vendedores',
    'PED01': 'Pedidos',
    'COTS01': 'Cotizaciones',
    'MINVE01': 'Movimientos al Inventario'
}

def probe():
    print("🔌 [Probe] Conectando a Base de Datos Legacy...")
    try:
        con_fb = fdb.connect(**FB_CONFIG)
        cur_fb = con_fb.cursor()
        print("✅ Conexión exitosa.")
    except Exception as e:
        print(f"❌ Error conectando: {e}")
        return

    print("\n📊 INFORME DE USO DE MÓDULOS (Legacy Data):")
    print(f"{'TABLA':<15} | {'MÓDULO':<30} | {'REGISTROS':<10} | {'ESTADO':<10}")
    print("-" * 75)

    for table, description in TABLES_TO_PROBE.items():
        try:
            cur_fb.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur_fb.fetchone()[0]
            status = "⚠️ VACÍO" if count == 0 else "✅ ACTIVO"
            print(f"{table:<15} | {description:<30} | {count:<10} | {status:<10}")
        except Exception as e:
            print(f"{table:<15} | {description:<30} | {'ERROR':<10} | ❌ NO EXISTE")

    con_fb.close()
    print("\n🏁 Sondeo finalizado.")

if __name__ == "__main__":
    probe()

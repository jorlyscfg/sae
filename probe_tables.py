import fdb

FB_CONFIG = {
    'dsn': 'localhost/3050:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': 'masterkey',
    'charset': 'UTF8' 
}

def probe():
    try:
        con = fdb.connect(**FB_CONFIG)
        cur = con.cursor()
        
        tables = ['CLIE01', 'FACT01', 'PAR_FACT01']
        
        for table in tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"✅ Tabla {table} existe. Registros: {count}")
                
                # Obtener columnas
                cur.execute(f"SELECT FIRST 1 * FROM {table}")
                desc = [d[0] for d in cur.description]
                print(f"   Columnas: {desc[:5]}...") # Mostrar primeras 5
                
            except Exception as e:
                print(f"❌ Tabla {table} error: {e}")
                
        con.close()
    except Exception as e:
        print(f"❌ Error general: {e}")

if __name__ == "__main__":
    probe()

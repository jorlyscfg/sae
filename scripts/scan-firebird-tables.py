import fdb
import datetime

FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8' 
}

def scan_database():
    print("🔍 Escaneando base de datos Firebird...")
    try:
        con = fdb.connect(**FB_CONFIG)
        cur = con.cursor()
        
        # Get all user tables
        cur.execute("SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG=0")
        tables = [row[0].strip() for row in cur.fetchall()]
        
        print(f"📋 Encontradas {len(tables)} tablas definidas.")
        print("\n📊 Tablas con Datos (Registros > 0):")
        print("-" * 60)
        print(f"{'Tabla':<30} | {'Registros':>10}")
        print("-" * 60)
        
        non_empty_tables = []
        
        for table in tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                if count > 0:
                    print(f"{table:<30} | {count:>10}")
                    non_empty_tables.append((table, count))
            except Exception as e:
                # Some tables might be views or weird system states
                pass
                
        print("-" * 60)
        print(f"Total: {len(non_empty_tables)} tablas contienen datos.")
        
        con.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    scan_database()

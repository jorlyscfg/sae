
import fdb
import os

FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8'
}

def probe_status():
    print(f"🔌 Probing COLUMNS in CLIE01...")
    try:
        con = fdb.connect(**FB_CONFIG)
        cur = con.cursor()
        
        cur.execute("SELECT * FROM PRECIO_X_PROD01")
        rows = cur.fetchall()
        
        print(f"✅ Tables:")
        for row in rows:
            print(f"- {row[0].strip()}")
            
        con.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    probe_status()

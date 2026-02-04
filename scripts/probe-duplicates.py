
import fdb
import os

FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8' 
}

def probe_duplicates():
    print("🔌 Checking for duplicates in CUEN_M01...")
    try:
        con = fdb.connect(**FB_CONFIG)
        cur = con.cursor()
        
        cur.execute("SELECT COUNT(*) FROM CUEN_M01")
        total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(DISTINCT CVE_FOLIO) FROM CUEN_M01")
        distinct_folio = cur.fetchone()[0]
        
        print(f"✅ Total Rows: {total}")
        print(f"✅ Distinct CVE_FOLIO: {distinct_folio}")
        
        if total != distinct_folio:
            print("⚠️ DUPLICATES FOUND!")
        else:
            print("INFO: CVE_FOLIO is unique.")

        con.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    probe_duplicates()

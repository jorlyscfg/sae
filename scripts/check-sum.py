
import fdb

# Configuración Firebird
FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8' 
}

try:
    con = fdb.connect(**FB_CONFIG)
    cur = con.cursor()
    
    # Check ACTE01
    sku = 'ACTE01'
    
    # 1. Get Total from INVE01
    cur.execute(f"SELECT EXIST FROM INVE01 WHERE CVE_ART = '{sku}'")
    row = cur.fetchone()
    total_inve = row[0] if row else 0
    
    # 2. Get Sum from MULT01
    cur.execute(f"SELECT SUM(EXIST) FROM MULT01 WHERE CVE_ART = '{sku}'")
    row = cur.fetchone()
    sum_mult = row[0] if row else 0
    
    print(f"SKU: {sku}")
    print(f"INVE01 (Global): {total_inve}")
    print(f"MULT01 (Sum): {sum_mult}")
    
    if abs(total_inve - sum_mult) < 0.01:
        print("✅ CONFIRMED: Main Store is just the aggregate sum.")
    else:
        print("⚠️ MISMATCH: Main Store is distinct?")

    con.close()
except Exception as e:
    print(e)

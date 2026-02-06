
import fdb
import json

# Correct Config from migrate-suppliers.py
FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8' 
}

try:
    con = fdb.connect(**FB_CONFIG)
    cur = con.cursor()
except Exception as e:
    print(f"Connection failed: {e}")
    exit(1)

def list_tables():
    cur.execute("SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0")
    tables = [row[0].strip() for row in cur.fetchall()]
    return tables

def get_columns(table):
    cur.execute(f"SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = '{table}' ORDER BY RDB$FIELD_POSITION")
    columns = [row[0].strip() for row in cur.fetchall()]
    return columns

def sample_data(table, limit=5):
    try:
        cur.execute(f"SELECT FIRST {limit} * FROM {table}")
        rows = cur.fetchall()
        return [str(row) for row in rows]
    except Exception as e:
        return [f"Error: {e}"]

print("--- TABLES ---")
tables = list_tables()
print(sorted(tables))

print("\n--- INVENTORY COLUMNS (INVE01) ---")
print(get_columns('INVE01'))

print("\n--- CUSTOMER COLUMNS (CLIE01) ---")
print(get_columns('CLIE01'))

print("\n--- CHECKING CLNI00 IN MULT01 ---")
try:
    cur.execute("SELECT * FROM MULT01 WHERE CVE_ART = 'CLNI00'")
    rows = cur.fetchall()
    print(f"Rows in MULT01 for CLNI00: {len(rows)}")
    print(rows)
except Exception as e:
    print(e)


# Check for specific interesting tables
interesting_patterns = ['MULT', 'ALM', 'SUC', 'EXIST']
found_interesting = []
for t in tables:
    for p in interesting_patterns:
        if p in t:
            found_interesting.append(t)

print("\n--- INTERESTING TABLES FOUND ---")
print(found_interesting)

for t in found_interesting:
    print(f"\n--- COLUMNS FOR {t} ---")
    print(get_columns(t))
    print(f"\n--- SAMPLE DATA FOR {t} ---")
    print(sample_data(t))

con.close()

import fdb
import sys

FB_CONFIG = {
    'dsn': 'localhost/3052:/firebird/data/RESTORED.fdb',
    'user': 'SYSDBA',
    'password': '0aa1668ba4b405f70e60',
    'charset': 'UTF8'
}

def list_columns(table_name):
    print(f"🔌 Columnas de {table_name}:")
    try:
        con = fdb.connect(**FB_CONFIG)
        cur = con.cursor()
        
        query = """
            SELECT R.RDB$FIELD_NAME
            FROM RDB$RELATION_FIELDS R
            WHERE R.RDB$RELATION_NAME = ?
            ORDER BY R.RDB$FIELD_POSITION
        """
        cur.execute(query, (table_name,))
        rows = cur.fetchall()
        
        for row in rows:
            print(f"- {row[0].strip()}")
            
        con.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 list-columns.py TABLE_NAME")
    else:
        list_columns(sys.argv[1].upper())

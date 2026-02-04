import os
import re
import psycopg2
from datetime import datetime
import uuid

# Configuración Postgres
PG_CONFIG = {
    'dbname': 'aspel_dashboard',
    'user': 'postgres',
    'password': 'password123',
    'host': 'localhost',
    'port': 5432
}

BITACORA_DIR = '/development/aspel-dany/Bitacora'

def parse_line(line):
    # Formato: <14>Feb  6 19:45:57 DESKTOP-R0QQ6B4 orig="Aspel-SAE 6.00" usr="ADMINISTRADOR" mod="11" opc="86" op="1" msg="Se agregó la compra [0000000871]" nivel="Intermedio"
    
    # Intentar extraer fecha (Asumiendo año actual si no viene, pero los archivos tienen fecha en el nombre)
    patterns = [
        r'orig="([^"]+)"',
        r'usr="([^"]+)"',
        r'mod="([^"]+)"',
        r'msg="([^"]+)"'
    ]
    
    msg_match = re.search(r'msg="([^"]+)"', line)
    if not msg_match: return None
    
    msg = msg_match.group(1)
    
    # Extraer timestamp aproximado de la línea (mismo mes/día)
    # Feb  6 19:45:57
    time_match = re.search(r'([A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})', line)
    return {
        'msg': msg,
        'time_str': time_match.group(1) if time_match else None,
        'usr': re.search(r'usr="([^"]+)"', line).group(1) if re.search(r'usr="([^"]+)"', line) else 'Sistema'
    }

def migrate_logs():
    print("🚀 Iniciando migración de bitácoras históricas...")
    
    try:
        conn = psycopg2.connect(**PG_CONFIG)
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ Error DB: {e}")
        return

    files = [f for f in os.listdir(BITACORA_DIR) if f.endswith('.log')]
    print(f"📂 Encontrados {len(files)} archivos de log.")

    total_inserted = 0
    
    for filename in sorted(files):
        # Extraer año del nombre: Aspel-SAE 6.00_1_06-02-2025.log
        year_match = re.search(r'(\d{2})-(\d{2})-(\d{4})', filename)
        if not year_match: continue
        
        full_date_prefix = year_match.group(3) # 2025
        
        filepath = os.path.join(BITACORA_DIR, filename)
        
        with open(filepath, 'r', encoding='latin-1') as f:
            lines = f.readlines()
            
        data_to_insert = []
        for line in lines:
            parsed = parse_line(line)
            if not parsed: continue
            
            # Reconstruir timestamp (Next.js prefiere ISO)
            # parsed['time_str'] es "Feb  6 19:45:57"
            try:
                # Convertir Feb 6 2025 -> datetime
                dt = datetime.strptime(f"{parsed['time_str']} {full_date_prefix}", "%b %d %H:%M:%S %Y")
            except:
                dt = datetime.now()

            data_to_insert.append((
                str(uuid.uuid4()),
                'system',
                'LEGACY',
                None,
                f"[{parsed['usr']}] {parsed['msg']}",
                dt
            ))

        if data_to_insert:
            sql = """
                INSERT INTO audit_logs (id, module, action, "entityId", description, timestamp)
                VALUES %s
                ON CONFLICT DO NOTHING
            """
            from psycopg2.extras import execute_values
            execute_values(cur, sql, data_to_insert)
            conn.commit()
            total_inserted += len(data_to_insert)
            print(f"✅ {filename}: {len(data_to_insert)} registros.")

    print(f"🏁 Finalizado. Total registros insertados: {total_inserted}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    migrate_logs()

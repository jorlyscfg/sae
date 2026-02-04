import fdb
import sys

def probe_ada():
    print("🔍 Conectando a ADA.FDB vía Bridge (Puerto 3051)...")
    try:
        # Usamos la contraseña extraída de los logs del contenedor temp_fb25_bridge
        # La contraseña es dinámica, si falla intentaremos masterkey
        passwords = ['77780a42', 'masterkey']
        conn = None
        for pwd in passwords:
            try:
                conn = fdb.connect(
                    dsn='localhost:3051:/firebird/data/ADA.FDB',
                    user='SYSDBA',
                    password=pwd,
                    charset='WIN1252'
                )
                print(f"✅ Conectado con éxito!")
                break
            except Exception as e:
                print(f"❌ Fallo con password '{pwd}': {e}")
                
        if not conn:
            print("🚫 No se pudo establecer conexión con ninguna contraseña.")
            return

        cur = conn.cursor()
        
        # Listar todas las tablas de usuario
        cur.execute("SELECT TRIM(RDB$RELATION_NAME) FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG=0")
        tables = [r[0] for r in cur.fetchall()]
        
        print(f"\n📊 Reporte de Tablas en ADA.FDB ({len(tables)} tablas):")
        print("-" * 50)
        
        for table in sorted(tables):
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                if count > 0:
                    print(f"🚀 {table:30} | {count:6} registros")
                else:
                    print(f"   {table:30} |      0 registros")
            except Exception as e:
                print(f"⚠️ {table:30} | Error: {e}")
        
        print("-" * 50)
        
        # Si encontramos registros en DATOSCFD, mostramos una muestra
        if 'DATOSCFD' in tables:
            cur.execute("SELECT COUNT(*) FROM DATOSCFD")
            if cur.fetchone()[0] > 0:
                print("\n👀 Muestra de DATOSCFD:")
                cur.execute("SELECT FIRST 5 UUID, SERIE, FOLIO, NOMBRE_RECEPTOR FROM DATOSCFD")
                for row in cur.fetchall():
                    print(f"  - {row[0]} | {row[1]}{row[2]} | {row[3]}")

        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error general: {e}")

if __name__ == "__main__":
    probe_ada()

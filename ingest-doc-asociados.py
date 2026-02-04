import os
import xml.etree.ElementTree as ET
import psycopg2
from decimal import Decimal
import datetime
import uuid
import hashlib

# Configuración Postgres
PG_CONFIG = {
    'dbname': 'aspel_dashboard',
    'user': 'postgres',
    'password': 'password123',
    'host': 'localhost',
    'port': 5432
}

SEARCH_DIRS = [
    '/development/aspel-dany/DocAsociados',
    '/development/aspel-dany/CFDs',
    '/development/aspel-dany/ConfDAC'
]

def get_xml_hash(filepath):
    """Genera un hash del contenido para detectar archivos idénticos en diferentes carpetas."""
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def parse_xml_metadata(filepath):
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        # Namespaces comunes
        ns_map = {
            'cfdi3': 'http://www.sat.gob.mx/cfd/3',
            'cfdi2': 'http://www.sat.gob.mx/cfd/2',
            'tfd': 'http://www.sat.gob.mx/TimbreFiscalDigital'
        }
        
        # Eliminar el namespace del tag para procesar más fácil
        tag_local = root.tag.split('}')[-1]
        if tag_local != 'Comprobante': return None
        
        attr = root.attrib
        folio = attr.get('folio')
        serie = attr.get('serie')
        fecha_str = attr.get('fecha')
        total = attr.get('total', '0')
        version = attr.get('version')
        
        # Emisor / Receptor (pueden estar con o sin namespace)
        def find_node(name):
            node = root.find(f".//{{*}}{name}")
            return node
            
        emisor = find_node('Emisor')
        receptor = find_node('Receptor')
        
        rfc_emisor = emisor.attrib.get('rfc') if emisor is not None else None
        nombre_emisor = emisor.attrib.get('nombre') if emisor is not None else None
        rfc_receptor = receptor.attrib.get('rfc') if receptor is not None else None
        nombre_receptor = receptor.attrib.get('nombre') if receptor is not None else None
        
        # Timbre (UUID) - Solo en v3.2+
        timbre = root.find('.//{{*}}TimbreFiscalDigital')
        uid = timbre.attrib.get('UUID') if timbre is not None else None
        
        # Si no tiene UUID (v2.0/v2.2), generamos un ID determinista basado en aprobación/serie/folio
        if not uid:
            no_aprob = attr.get('noAprobacion', '')
            ano_aprob = attr.get('anoAprobacion', '')
            uid = f"LEGACY-{ano_aprob}-{no_aprob}-{serie or ''}-{folio or ''}"
        
        try:
            fecha = datetime.datetime.fromisoformat(fecha_str) if fecha_str else None
        except:
            fecha = None
            
        return {
            'filename': os.path.basename(filepath),
            'filePath': filepath,
            'uuid': uid,
            'serie': serie,
            'folio': folio,
            'fecha': fecha,
            'rfcEmisor': rfc_emisor,
            'nombreEmisor': nombre_emisor,
            'rfcReceptor': rfc_receptor,
            'nombreReceptor': nombre_receptor,
            'total': Decimal(total) if total else Decimal(0),
            'hash': get_xml_hash(filepath)
        }
    except Exception:
        return None

def ingest():
    print("📂 Iniciando ingesta DETERMINISTA de Documentos Históricos...")
    try:
        conn = psycopg2.connect(**PG_CONFIG)
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ Error DB: {e}")
        return

    all_files = []
    for s_dir in SEARCH_DIRS:
        if not os.path.exists(s_dir): continue
        for root, dirs, files in os.walk(s_dir):
            if 'node_modules' in root: continue
            for f in files:
                if f.lower().endswith('.xml'):
                    all_files.append(os.path.join(root, f))
    
    print(f"📄 Encontrados {len(all_files)} archivos XML potenciales.")

    inserted = 0
    skipped = 0
    
    # Usaremos un set para rastrear hashes ya procesados en esta ejecución
    processed_hashes = set()

    for path_file in all_files:
        data = parse_xml_metadata(path_file)
        if not data: continue
        
        # Si ya procesamos este contenido exacto, saltar (deduplicación por contenido)
        if data['hash'] in processed_hashes:
            skipped += 1
            continue
            
        processed_hashes.add(data['hash'])
        
        try:
            # Intentar insertar por UUID único
            cur.execute("""
                INSERT INTO associated_documents 
                (id, filename, "filePath", uuid, serie, folio, fecha, "rfcEmisor", "nombreEmisor", "rfcReceptor", "nombreReceptor", total, "createdAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (uuid) DO NOTHING
            """, (
                str(uuid.uuid4()), data['filename'], data['filePath'], data['uuid'],
                data['serie'], data['folio'], data['fecha'], data['rfcEmisor'],
                data['nombreEmisor'], data['rfcReceptor'], data['nombreReceptor'],
                data['total']
            ))
            if cur.rowcount > 0:
                inserted += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"❌ Error insertando {os.path.basename(path_file)}: {e}")
            conn.rollback()
            continue
            
    conn.commit()
    print(f"🏁 Finalizado. {inserted} registros únicos integrados. {skipped} duplicados omitidos.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    ingest()

import os
import xml.etree.ElementTree as ET
from decimal import Decimal
import datetime

BASE_DIR = '/development/aspel-dany'

def parse_xml(filepath):
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        ns = {'cfdi': 'http://www.sat.gob.mx/cfd/3', 'tfd': 'http://www.sat.gob.mx/TimbreFiscalDigital'}
        
        # Ignorar si no es CFDI
        if 'Comprobante' not in root.tag: return None
        
        attr = root.attrib
        fecha = attr.get('fecha')
        total = attr.get('total')
        
        timbre = root.find('.//tfd:TimbreFiscalDigital', ns)
        uuid = timbre.attrib.get('UUID') if timbre is not None else None
        
        return {
            'file': filepath,
            'date': fecha,
            'total': total,
            'uuid': uuid
        }
    except:
        return None

results = []
print("🔍 Escaneando archivos XML en todo el proyecto...")

for root_dir, dirs, files in os.walk(BASE_DIR):
    if 'node_modules' in root_dir or '.next' in root_dir: continue
    for f in files:
        if f.lower().endswith('.xml'):
            data = parse_xml(os.path.join(root_dir, f))
            if data:
                results.append(data)

print(f"✅ Encontrados {len(results)} documentos CFDI válidos.")

# Agrupar por año
by_year = {}
for r in results:
    year = r['date'][:4] if r['date'] else 'Desconocido'
    by_year[year] = by_year.get(year, 0) + 1

print("\n📅 Distribución por año:")
for year, count in sorted(by_year.items()):
    print(f"  - {year}: {count} documentos")

# Mostrar 5 ejemplos de los más antiguos
print("\n🕰️ Ejemplos de documentos antiguos:")
for r in sorted(results, key=lambda x: x['date'] or '')[:5]:
    print(f"  - {r['date']} | {r['uuid']} | {r['file']}")


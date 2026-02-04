# Análisis de Cobertura de Datos (Aspel vs Nueva App)

Este reporte detalla los campos disponibles en la base de datos original (Firebird) y cuáles estamos recuperando actualmente.

## 1. Inventario (Productos)
**Origen**: Tablas `INVE01` y `PRECIO_X_PROD01` (48 columnas disponibles).

| Campo Aspel (Firebird) | Campo Nueva App (Postgres) | Estado | Importancia |
|------------------------|---------------------------|--------|-------------|
| CVE_ART | sku | ✅ Migrado | Crítica |
| DESCR | description | ✅ Migrado | Crítica |
| LIN_PROD | line | ✅ Migrado | Alta |
| EXIST | stock | ✅ Migrado | Crítica |
| PRECIO (Tabla Precios) | price | ✅ Migrado | Crítica |
| FCH_ULTVTA | lastSale | ✅ Migrado | Media |
| FCH_ULTCOM | lastPurchase | ✅ Migrado | Media |
| **COSTO_PROM** | **costoPromedio** | ✅ **MIGRADO** | **Crítica (Márgenes)** |
| **UNI_MED** | **unidadMedida** | ✅ **MIGRADO** | **Alta (Unidades)** |
| **STOCK_MIN** | **stockMin** | ✅ **MIGRADO** | **Alta (Reabastecimiento)** |
| **STOCK_MAX** | **stockMax** | ✅ **MIGRADO** | **Media** |
| PESO | peso | ✅ **MIGRADO** | Baja |
| COSTO_ULTIMO | costoUltimo | ✅ **MIGRADO** | Media |

## 2. Clientes
**Origen**: Tabla `CLIE01` (60+ columnas disponibles).

| Campo Aspel (Firebird) | Campo Nueva App (Postgres) | Estado | Importancia |
|------------------------|---------------------------|--------|-------------|
| CLAVE | id (interno) | ✅ Migrado | Crítica |
| RFC | rfc | ✅ Migrado | Crítica |
| NOMBRE | razonSocial | ✅ Migrado | Crítica |
| MAIL | email | ✅ Migrado | Alta |
| **CALLE / NUMEXT** | **calle** | ✅ **MIGRADO** | **Alta (Facturación)** |
| **COLONIA / CP** | **colonia / cp** | ✅ **MIGRADO** | **Alta (Facturación)** |
| **TELEFONO** | **telefono** | ✅ **MIGRADO** | **Media (Contacto)** |
| **LIMCRED** | **limiteCredito** | ✅ **MIGRADO** | **Alta (Control)** |
| **DIASCRED** | **diasCredito** | ✅ **MIGRADO** | **Alta (Control)** |
| **SALDO** | **saldo** | ✅ **MIGRADO** | **Crítica (CxC)** |

> *Nota*: El saldo de clientes actualmente se recalcula dinámicamente sumando las 'Cuentas por Cobrar' (CxC) importadas, lo cual es más preciso que importar el campo saldo estático.

## Plan de Acción Propuesto

Recomiendo actualizar la base de datos y los scripts para recuperar inmediatamente:

1.  **Productos**: Costo Promedio, Unidad de Medida, Stock Mínimo.
2.  **Clientes**: Dirección Completa (Calle, Col, CP, Estado), Teléfono y Límites de Crédito.

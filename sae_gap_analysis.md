# Análisis de Brechas: Aspel Dany vs Aspel SAE 📊

He realizado una investigación profunda de la arquitectura actual para contrastarla con las funcionalidades estándar de un ERP como Aspel SAE. A continuación, detallo las deficiencias, elementos faltantes y sugerencias de implementación.

## 1. Módulos Faltantes (Críticos)

### 🛒 Compras y Proveedores (CxP)
Aunque existe una tabla `Supplier` en la base de datos, no hay **ninguna interfaz ni lógica** para gestionarlos.
- **Falta:** Módulo de Compras (Entradas de almacén por compra).
- **Falta:** Cuentas por Pagar (Control de deudas con proveedores).
- **Impacto:** El inventario solo se puede ajustar manualmente o "mágicamente", sin un proceso de reabastecimiento real y trazable.

### 🧾 Timbres Fiscales (CFDI Real)
El sistema genera facturas administrativas pero carece de conexión con el SAT.
- **Falta:** Lógica de sellado digital (PAC), generación de XML v4.0, complementos de pago.
- **Impacto:** Actualmente es un sistema administrativo, no fiscal.

### 🔄 Cotizaciones y Pedidos
El flujo actual salta directamente a la Factura.
- **Falta:** Capacidad de crear Cotizaciones y convertirlas a Pedidos o Facturas.
- **Impacto:** Limita el proceso comercial profesional donde primero se negocia.

## 2. Deficiencias Funcionales

### 📉 Gestión de Inventario Limitada
- **Solo Cantidad y Precio:** SAE maneja *Líneas de Producto*, *Tallas/Colores* (multidimensional), *Números de Serie*, *Lotes* y *Caducidades*.
- **Kardex Simple:** El Kardex actual solo se alimenta de Facturas. Faltan movimientos manuales, traslados entre almacenes (ahora que es multi-tienda) y ajustes detallados.

### 💰 Lógica Fiscal Extremadamente Simplificada
- **IVA Hardcoded:** Se detectó en `InvoiceFormModal` un cálculo de IVA fijo (`total * 1.16`).
- **Falta:** Manejo de esquemas de impuestos configurables (IVA 8%, IVA 0%, Exento, IEPS, Retenciones).

### 👥 Datos Maestros Incompletos
- **Clientes:** Faltan datos críticos como *Días de Crédito*, *Límite de Crédito*, *Vendedor Asignado*, *Lista de Precios*, *Uso de CFDI*.
- **Productos:** Faltan *Unidad de Medida SAT*, *Clave Producto/Servicio SAT*.

## 3. Plan de Acción Recomendado 🚀

Para acercar "Aspel Dany" a un nivel SAE competitivo, sugiero priorizar en este orden:

### Fase 1: Consolidación Comercial (Lo más visible)
1.  **Refinar Modelo de Productos:** Agregar campos fiscales (Clave SAT, Unidad) y comerciales (Costo Promedio).
2.  **Módulo de Cotizaciones:** Permitir crear documentos previos a la venta.
3.  **Esquema de Impuestos Flexible:** Eliminar el 16% fijo y permitir configuración por producto/cliente.

### Fase 2: Gestión de Proveedores (El "Back office")
1.  **Módulo de Proveedores:** CRUD completo.
2.  **Módulo de Compras:** Registro de facturas de compra que aumenten inventario automáticamente.
3.  **Cuentas por Pagar:** Espejo del módulo de Cobranza que acabamos de crear.

### Fase 3: Cumplimiento Fiscal (CFDI 4.0) 🏛️
Para cumplir con el estándar obligatorio SAT 2025, se requiere implementar:

#### 1. Validación Estricta de Datos (Anti-Rechazo)
El PAC rechazará el timbrado si estos datos no coinciden **exactamente** con la Constancia de Situación Fiscal:
- **Razón Social:** Sin régimen capital (ej: "SA DE CV").
- **Código Postal (Domicilio Fiscal):** Debe coincidir con el registrado.
- **Régimen Fiscal:** El receptor debe tener un régimen válido para el uso del CFDI.

#### 2. Campos Obligatorios Nuevos / Modificados
- **ObjetoImp:** Clave `01` (No objeto), `02` (Sí objeto), etc.
- **Exportación:** Clave `01` (No aplica), `02` (Definitiva), etc.
- **Régimen Fiscal Receptor:** Clave del catálogo `c_RegimenFiscal`.
- **DomicilioFiscalReceptor:** Solo el CP.

#### 3. Reglas de Negocio SAT
- **Cancelación:** Obligatorio indicar motivo (`01`, `02`...) y solo permitida dentro del mes en curso (regla 2025).
- **Complemento de Pagos:** Debe incluir desglose detallado de impuestos trasladados/retenidos por cada pago (no solo totales).
- **Catálogos Exat:** Sincronización periódica con catálogos SAT (`c_ClaveProdServ`, `c_TasaOCuota`).

#### 4. Integración Tecnológica
- Contratar un **PAC** (Proveedor Autorizado de Certificación) que ofrezca API REST/JSON (ej. Facturama, SW Sapien) para evitar generar el XML manualmente.
- Almacenar `UUID`, `CadenaOriginal`, `SelloSAT` y `XML` firmado.

---
**He terminado la investigación profunda. Estoy listo para que me describas la nueva función o el error a corregir.**

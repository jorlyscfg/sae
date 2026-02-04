# Informe de Investigación: Generación de Facturas

## 1. Localización de Archivos
- **Frontend (UI)**: `src/components/InvoiceFormModal.tsx`
  - Maneja la selección de cliente, búsqueda de productos y agregación de partidas.
  - Valida que haya cliente y al menos un producto antes de enviar.
- **Backend (Server Actions)**: `src/app/actions/invoices.ts` (`createInvoice`)
  - Recibe los datos, valida con Zod y ejecuta la transacción de DB.

## 2. Análisis del Ciclo Actual
El proceso actual realiza los siguientes pasos dentro de una transacción (`prisma.$transaction`):
1.  **Crea la Factura (`Invoice`)**: Con `storeId`, `userId`, totales y fecha.
2.  **Crea Partidas (`InvoiceItem`)**: Itera sobre los items y los guarda.
3.  **Descuenta Inventario**: Si el item tiene SKU, busca el producto (filtrando por `storeId`) y decremente el stock.
4.  **Bitácora (`AuditLog`)**: Registra la acción `CREATE` en el módulo `invoices`.

## 3. Hallazgos Críticos (Brechas en el Ciclo)
Aunque el sistema crea la factura y descuenta el inventario correctamente, **NO se está completando el ciclo financiero**:

### ❌ Falta Generación de Cuentas por Cobrar (CxC)
El esquema de base de datos (`prisma/schema.prisma`) tiene un modelo `Receivable` diseñado para rastrear las deudas de los clientes.
- **Estado Actual**: La acción `createInvoice` **NO** crea ningún registro en `Receivable`.
- **Consecuencia**: La factura existe administrativamente, pero el cliente "no debe" nada en el sistema de cobranza. No aparecerá en los reportes de saldo de clientes ni se le podrán aplicar pagos.

### ⚠️ Estado de la Factura
- La factura se crea con `status` opcional, y no se está definiendo explícitamente (probablemente `null` o default). Debería establecerse como "EMITIDA" o "PENDIENTE" para claridad.

## 4. Estructura de Datos (Prisma)
El modelo `Receivable` requiere:
- `customerId` (Disponible)
- `folio` (Disponible: `serie` + `folio`)
- `fechaEmision` (Disponible: `now()`)
- `fechaVencimiento` (Se requiere calcular, ej: +30 días o definir política)
- `importeOriginal` (Total de la factura)
- `saldo` (Inicialmente igual al Total)
- `storeId` y `userId` (Disponibles)

## 5. Recomendación
Para corregir el ciclo, se debe modificar `src/app/actions/invoices.ts` para que, dentro de la misma transacción:
1.  Cree el registro en `Receivable` vinculado a la nueva factura y al cliente.
2.  Defina explícitamente el estado de la factura.

---
**He terminado la investigación profunda. Estoy listo para que me describas la nueva función o el error a corregir.**

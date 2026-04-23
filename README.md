# Rinde-Gastos

Aplicación web para cargar gastos de rendiciones con comprobantes y ver un resumen por número de rendición.

## Campos de ingreso

- Nombre del trabajador.
- Número de rendición.
- Tipo de gasto.
- Monto.
- Comprobante (imagen o PDF) por cada gasto.

## Qué muestra el sistema

- Tabla de gastos ingresados con su comprobante.
- Resumen por número de rendición con:
  - Total de la rendición (suma de sus gastos).
  - Estado por defecto **Pendiente**.
  - Cambio de estado a **Revisado** o **Pagado**.
- Total general acumulado.

## Persistencia

Los datos quedan guardados en `localStorage` del navegador (`rinde_gastos_db_v2`).

## Uso rápido

1. Abre `index.html` en tu navegador.
2. Ingresa cada gasto con su comprobante.
3. Revisa el total por rendición y cambia el estado según avance el proceso.

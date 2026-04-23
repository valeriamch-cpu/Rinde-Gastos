# Rinde-Gastos

Aplicación web para crear rendiciones con múltiples gastos y guardarlas al final.

## Flujo correcto

1. Completar datos de la rendición: trabajador y número.
2. Agregar uno o más gastos al borrador (tipo, monto y comprobante).
3. Revisar total del borrador.
4. Presionar **Guardar rendición**.

## Qué muestra el sistema

- Rendiciones guardadas con total y estado.
- Estado por defecto: **Pendiente**.
- Cambio de estado a **Revisado** o **Pagado**.
- Detalle de gastos por cada rendición guardada.

## Persistencia

Los datos quedan guardados en `localStorage` del navegador (`rinde_gastos_db_v3`).

## Uso rápido

1. Abre `index.html` en tu navegador.
2. Sigue el flujo de borrador y guarda la rendición al finalizar.

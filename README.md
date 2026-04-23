# Rinde-Gastos

Aplicación web para crear rendiciones con múltiples gastos y guardarlas al final.

## Flujo correcto

1. Completar datos de la rendición: trabajador y número.
2. Agregar uno o más gastos al borrador (tipo, monto y comprobante).
   - En celular puedes usar **Tomar foto con cámara** para adjuntar imágenes directo.
3. Revisar total del borrador.
4. Presionar **Guardar rendición**.

## Resumen

- En el resumen se muestra **solo el total de cada rendición**.
- Al hacer click en **Ver detalle**, se despliega el detalle completo de esa rendición.
- Al lado del título **Resumen de rendiciones** hay un buscador por nombre o número para abrir el detalle rápidamente.
- En el detalle se puede cambiar estado: **Pendiente**, **Revisado**, **Pagado**.

## Persistencia

Los datos quedan guardados en `localStorage` del navegador (`rinde_gastos_db_v3`).

## Uso rápido

1. Abre `index.html` en tu navegador.
2. Sigue el flujo de borrador y guarda la rendición al finalizar.
3. En resumen usa **Ver detalle** para inspeccionar gastos y comprobantes.
4. Para imágenes en teléfono, usa el campo de cámara (capture) para abrir cámara directamente.

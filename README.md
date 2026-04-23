# Rinde-Gastos

Aplicación web para crear rendiciones con múltiples gastos y guardarlas al final.

## Flujo correcto

1. Completar datos de la rendición: trabajador y número.
2. Agregar uno o más gastos al borrador (tipo, monto y comprobante).
   - En celular puedes usar **Tomar foto con cámara** para adjuntar imágenes directo.
3. Revisar total del borrador.
4. Presionar **Guardar rendición**.

## Qué puede hacer quien entre

- Subir sus rendiciones desde el formulario superior.
- Ver el resumen de todas las rendiciones guardadas.
- Ver el detalle de **todas** las rendiciones en la sección inferior.
- Cambiar estado de cada rendición: **Pendiente**, **Revisado**, **Pagado**.

## Persistencia

Los datos quedan guardados en `localStorage` del navegador (`rinde_gastos_db_v4`).

## Uso rápido

1. Abre `index.html` en tu navegador.
2. Sigue el flujo de borrador y guarda la rendición al finalizar.
3. Revisa abajo el detalle completo de todas las rendiciones.


## Descargar como app (PWA)

- Abre la app en Chrome o Edge.
- Si aparece el botón **Descargar app**, presiónalo para instalar.
- También puedes usar el menú del navegador: **Instalar aplicación**.
- Una vez instalada, se abre como app independiente (sin barra del navegador).


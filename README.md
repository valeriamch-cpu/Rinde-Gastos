# Rinde-Gastos

Aplicación web para cargar rendiciones de trabajadores y ver un resumen con:

- Tipo de gasto.
- Detalle de la rendición.
- Valor.
- Respaldos adjuntos con previsualización de imágenes.

## ¿Dónde quedan guardados los adjuntos y rendiciones?

En esta versión quedan guardados en una **base local del navegador** (`localStorage`), por lo que:

- Se conservan al recargar la página en el mismo navegador/equipo.
- Se muestran en la sección **Vista tipo base de datos (JSON)**.
- Los adjuntos de imagen se guardan en formato data URL para poder verlos.

## Uso rápido

1. Abre `index.html` en tu navegador.
2. Completa trabajador, tipo de gasto, detalle, valor y adjunta respaldos.
3. Presiona **Guardar rendición** para ver la tabla, totales, respaldos e imágenes.

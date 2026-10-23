# Propuesta editorial para revisión visual

Rama: design/editorial-refinement-2026-10-23. Base: a7e9ee8. No modifica ni despliega la rama pública, main, DNS, formularios o proveedores.

Las dos referencias visuales mencionadas en el encargo no estaban adjuntas. Esta propuesta aplica la distribución descrita; su fidelidad exacta a esas imágenes queda pendiente de recibirlas.

- Logotipo original centrado, con tamaños actuales. Selector ES/EN conservado.
- Plato Tramuntana arriba a la izquierda; aplique Binari a la derecha y más abajo; señalética Fita debajo del plato y desplazada a la derecha; Cleda inmediatamente debajo de Fita. Texto bajo la composición, con título, contenido y botones existentes.
- Nombres Montserrat Light 11–11,5 px, #555550, fuera de las imágenes y sin animación.
- Párrafos: Montserrat 300, escritorio 12→12,5 px, móvil 13 px, interlineado 1,7, espaciado 0,01 em, color #555550. Título y botones mantienen sus reglas tipográficas.
- Parallax de hasta 30 px de recorrido total, limitado proporcionalmente en fotografías pequeñas. requestAnimationFrame, listeners pasivos y lecturas agrupadas. Capas separadas para movimiento y zoom. Reserva interior del 8 % para no mostrar huecos: leve recorte constante, sin deformar el encuadre ni modificar archivos.
- Hover solo con cursor fino: zoom adicional 5 % y saturación CSS 0,85→1 simultáneos, 1,5 s cubic-bezier(0.22,1,0.36,1). Se mantienen exactamente los WebP existentes con su tratamiento incorporado; el filtro decorativo se aplica sobre esas versiones, sin reprocesarlas ni añadir luminosidad.
- Parallax desactivado en móvil estrecho y con prefers-reduced-motion; hover desactivado en dispositivos táctiles. Etiquetas estáticas.

## Validación local

- npm test: 217 pruebas, sin peticiones reales.
- sh scripts/build-preview.sh: conserva compilación existente y versionado CSS.
- scripts/test-launch-layout-browser.mjs: 14 casos, ES/EN en 1920×1080, 1440×900, 1101×900, 768×1024, 390×844 y 320×740; casos adicionales de reduced-motion y touch. Verifica CSP existente, filtros, zoom sin desplazamiento del marco o etiqueta, parallax acotado, proporciones, ausencia de solapamientos/desbordamientos/errores de consola y modales existentes.
- Marcado de todos los diálogos y contenidos desde el primer modal idénticos a la base. script.js, integrations.js, legal/content.js, _headers y assets sin modificaciones.
- Pruebas de navegador interceptan todas las solicitudes; nunca llaman a GetResponse, Resend ni Turnstile real ni guardan registros. Artefacto de revisión noindex con formularios desactivados.

## Visualización local del proyecto

```sh
sh scripts/build-preview.sh
python3 -m http.server 4173 --directory public
```

Abrir http://localhost:4173. Sin backend local las integraciones permanecen desactivadas. El ZIP de revisión compilado incluye una respuesta estática de configuración desactivada para poder visualizarlo sin errores de API; no forma parte del código desplegable ni modifica Functions.

No activar indicadores de producción, no fusionar y no desplegar sin aprobación visual. El PR, si se crea, será borrador contra design/private-access-v1.

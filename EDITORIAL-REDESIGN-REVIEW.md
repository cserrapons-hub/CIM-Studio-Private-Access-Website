# Versión editorial definitiva — revisión de vista previa

Rama: design/editorial-refinement-2026-10-23. Se parte de 093f752, que incorpora los cinco JPG suministrados. Sin merge ni despliegue en producción; no cambia el entorno de cimstudio.es.

## Referencia y composición

Referencia real: assets/editorial-originals/web version editorial.jpg, 2480×7016. Mediciones usadas como coordenadas de escritorio (x, y, ancho, alto):

- Tramuntana: 264, 1215, 976, 1067.
- Binari: 1240, 2133, 985, 1476. Comparte borde con Tramuntana y comienza antes de que termine verticalmente.
- Cleda: 504, 4044, 737, 620.
- Fita: 1241, 4044, 614, 620. Misma altura y borde compartido con Cleda.
- Flecha centrada: y=5013, alto=167; una sola flecha de desplazamiento, entre fotografías y texto.

Se escalan las coordenadas con el ancho de la página hasta 2480 px. Nombres y líneas se anclan a cada marco. La jerarquía, medidas del logotipo y posición del bloque editorial siguen la referencia. En móvil se conserva el escalonamiento superior y la pareja inferior, con tamaños, textos y área de pulsación adaptados. Se preservan las familias tipográficas aprobadas, los textos y el estilo de las acciones.

## Fotografías

Originales intactos: Tramuntana.jpg, binari.jpg, fita.jpg y cleda.jpg. Los cuatro traen perfil Adobe RGB (1998). Se generan versiones WebP quality=92, sin aumentar dimensiones, aplicando únicamente conversión ICC a sRGB y normalización de orientación, sin tratamiento de saturación, brillo o contraste en píxeles. Tamaños combinados: aproximadamente 640 KiB. No se reutilizan las antiguas versiones con saturación/luminosidad incorporadas.

Generación offline reproducible: python scripts/prepare-editorial-originals.py (Pillow/LCMS). Cloudflare solo copia las imágenes ya generadas, sin instalar herramientas de imagen. Perfil sRGB explícito; sin EXIF de orientación. Comparación local con originales convertidos: error medio RGB por compresión WebP entre 1,44 y 1,58 sobre 255.

## Efectos y flecha

- Escritorio con cursor: saturate(0.2) en reposo; solo la imagen bajo el cursor pasa a saturate(1) y scale(1.05), 700 ms, sin mover marcos, nombres ni líneas.
- Touch/sin hover: colores originales, saturate(1), sin depender de interacción hover.
- prefers-reduced-motion: sin transición ni zoom animado; flecha con desplazamiento inmediato.
- Una única flecha fina con enlace #invitation y desplazamiento suave, etiqueta ES/EN y foco accesible. No hay flecha sobre las fotografías.
- Retirado el margen de ampliación constante del parallax anterior: no hay recorte en reposo ni desplazamientos que alteren la referencia.

## Validación

- 217 pruebas Node.
- Compilación estática existente y versionado automático CSS.
- 16 recorridos de navegador: ES/EN a 2480, 1920, 1440, 1024, 768, 390 y 320 px, más reduced-motion y touch.
- Comparación de las cuatro fotografías y la flecha con las coordenadas del JPG: tolerancia de 1,2 px tras escalado.
- Verificación de líneas, nombres, proporciones originales, no solapamientos accidentales, no desbordamiento, filtro aislado, zoom, marcos/etiquetas estáticos, navegación/foco de flecha, modales y CSP original sin errores de consola.
- Los diálogos y formularios desde el primer modal son idénticos a la base; script.js, integrations.js, legal/content.js, _headers, endpoints y configuración no cambian. No se enviaron formularios ni correos reales; el navegador intercepta toda la red.

## Vista previa

La rama está destinada al proyecto independiente cim-studio-editorial-preview. No cambiar sus variables, secretos ni bindings para este ajuste. Los formularios permanecen deshabilitados en el entorno de revisión.

Con despliegue automático habilitado para esta rama, el push puede actualizar la vista previa. Si no se actualiza, Cloudflare → cim-studio-editorial-preview → Deployments → desplegar/reintentar el último commit de esta rama. Nunca hacerlo en cim-studio-private-access-website ni cambiar la rama pública.

Vista local: sh scripts/build-preview.sh y python3 -m http.server 4173 --directory public. Las capturas no equivalen a verificar el estado remoto del deployment.

## Refinamiento de flecha y etiquetas — 23/10/2026

Se añade una flecha absoluta bajo el logotipo, con el mismo SVG que la flecha inferior, oscilación de 8 px y navegación al conjunto fotográfico. No ocupa espacio en el flujo. Movimiento desactivado con `prefers-reduced-motion`. La flecha inferior se conserva.

Etiquetas ES/EN con categoría Montserrat Light 9 px y nombre Montserrat Medium 13–14 px, separados 5 px. Medium se aloja localmente bajo la misma licencia OFL. En móvil el texto de Fita queda sobre su línea y el de Cleda bajo ella para evitar invadir las fotos, conservando los extremos y posiciones de las líneas.

Validación: geometría de referencia inalterada, flecha visible al abrir, navegación, traducciones, tipografía, ausencia de solapamientos y desbordamientos; saturación y zoom conservados. No se modifican formularios, integraciones, fotografías ni configuración de Cloudflare.

## Ajuste de escala y movimiento — 23/10/2026

Tramuntana y Binari se reducen al 92 % de su ancho y alto anteriores, conservando la unión central y sus posiciones verticales. Fita, Cleda, logotipo, bloque de texto y encuadres permanecen intactos. Las etiquetas y sus líneas siguen ancladas a cada fotografía.

La flecha superior baja 40 px en escritorio y 35 px en móvil. En móvil su altura se reduce de 48 a 28 px para conservar el espacio disponible antes de las fotografías incluso durante su oscilación, sin desplazarlas. Ambas flechas comparten la animación de 8 px, 3,6 s y ritmo ease-in-out; ambas quedan inmóviles con movimiento reducido.

Pruebas: compilación estática, 217 pruebas automatizadas y recorridos ES/EN de navegador en 2480, 1920, 1440, 1024, 768, 390 y 320 px, incluyendo geometría, ausencia de solapamientos, navegación, zoom y saturación, animación compartida y movimiento reducido.

## Galería móvil — 23/10/2026

Solo hasta 600 px, las fotografías se muestran en columna al 92 % del ancho: Tramuntana, Binari, Fita y Cleda. Se conservan los archivos y proporciones originales; el color es natural, sin desaturación móvil. Separación entre piezas de 56 px; categorías y nombres debajo a 14 px de la imagen, alineados a su borde izquierdo, sin líneas decorativas.

Los párrafos introductorios móviles pasan de 13 a 12,35 px (−5 %); los de ventanas de 12 a 11,4 px. Los controles, el logotipo y los títulos conservan sus tamaños. Escritorio conserva su geometría y tipografía. Solo el trazo de ambas flechas cambia en todos los tamaños, de 1,5 a 1,2 px (−20 %); tamaños, navegación y animación permanecen intactos.

Validación de navegador ES/EN, incluyendo 320, 375, 390 y 430 px: orden vertical, anchos y proporciones, etiquetas alineadas, ausencia de desbordamientos, navegación de ambas flechas, colores, movimiento reducido y composición de escritorio. Sin solicitudes reales ni cambios en formularios, integraciones o configuración.

## Saturación táctil y trazos — 23/10/2026

Ambas flechas pasan de 1,2 a 0,72 px (−40 % adicional), conservando SVG, tamaños, posiciones, animación y navegación.

Solo en móvil (hasta 600 px), las imágenes comienzan al 35 % de saturación. Tocar una imagen alterna su color original al 100 % y desactiva las demás, con la transición existente de 700 ms; movimiento reducido elimina la transición. No se añade zoom móvil ni indicadores visibles. Los marcos adquieren semántica de botón, estado `aria-pressed`, nombre accesible ES/EN y navegación por teclado con Enter/Espacio; al volver a escritorio se retiran estos atributos.

Los movimientos táctiles superiores a 8 px, cancelaciones y desplazamientos descartan la activación. No se previene ningún gesto nativo de scroll. Pruebas de navegador con eventos táctiles de Chromium comprueban desplazamiento efectivo sin activación, toques consecutivos, desactivación, teclado, traducciones, movimiento reducido y regreso a escritorio. Fotografías, formularios, integraciones y configuración permanecen intactos.

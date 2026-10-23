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

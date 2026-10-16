# CIM Studio — Private Access

Composición única en HTML, CSS y JavaScript nativos. Español por defecto, selector ES / EN. Rama `design/private-access-v1`.

## Desarrollo

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Sin dependencias ni compilación. `index.html` también se puede abrir directamente en un navegador.

## Imágenes pendientes

- `assets/cim-studio-logo.png`: colocar aquí el archivo original del logotipo adjunto. El adjunto del chat no estaba disponible como archivo en el entorno. Hasta recibirlo se muestra únicamente un aviso de archivo pendiente: no se recrea el logotipo con texto ni código. El original se presenta completo, sin recorte, filtros ni mezcla de colores.
- `assets/collection-detail.jpg`: fotografía secundaria de detalle.
- `assets/collection-space.jpg`: fotografía secundaria de ambiente.
- `assets/collection.jpg`: colocar aquí la fotografía real. Mientras falte, se muestra un espacio neutro identificado. No hay fotografía genérica ni producto inventado. La imagen se adapta con `object-fit: cover`; revisar el encuadre al añadir el original.

## Comportamiento

Los dos formularios están en diálogos nativos independientes con cierre mediante botón, Escape o fondo exterior, enfoque modal y devolución del foco. Validación nativa. Sin peticiones, cookies o almacenamiento de datos. `data-integration="getresponse-pending"` identifica el futuro punto de integración. No se han conectado servicios.

Aviso legal, privacidad y cookies se abren en un diálogo; son avisos provisionales de maqueta, no textos jurídicos definitivos. Aprobar los datos legales, privacidad y consentimientos antes de activar formularios o publicar.

No se ha publicado, configurado ningún dominio ni fusionado con main.

## Vista previa en Netlify

Preparación verificada: `sh scripts/build-preview.sh` genera `public/` únicamente con los archivos estáticos seleccionados. `netlify.toml` define ese comando y directorio. No hay variables de entorno ni dependencias necesarias. Los originales de imagen siguen pendientes.

La web muestra un aviso ES/EN de versión de prueba. Lleva `noindex` tanto en HTML como en las cabeceras configuradas para Netlify. Esto no protege el acceso: quien tenga la URL pública puede verla.

### Conexión con GitHub, sin fusionar

1. Confirmar el repositorio: el origen actual es `cserrapons-hub/CIM-Studio-Private-Access-Website`, no `Cim-Web`. Si se ha renombrado en GitHub, comprobar que `Cim-Web` contiene esta rama y estos archivos antes de seleccionarlo.
2. Guardar los cambios de `design/private-access-v1` en un commit y subir esa misma rama a GitHub. Revisar la lista de archivos antes de confirmar; no añadir secretos, `.env`, `.git` ni archivos ajenos. No hace falta crear o fusionar una PR.
3. En Netlify Free, crear un proyecto nuevo mediante la opción de importar un proyecto existente desde Git. Seleccionar GitHub y autorizar solamente el repositorio necesario. Las etiquetas de la interfaz pueden variar.
4. Seleccionar el repositorio confirmado y elegir explícitamente `design/private-access-v1` como rama que se desplegará, en lugar de `main`.
5. Comprobar los ajustes: directorio base vacío (raíz), comando `sh scripts/build-preview.sh`, directorio de publicación `public`, sin variables de entorno ni framework.
6. Usar un nombre provisional, por ejemplo `cim-studio-prueba` si está disponible. No añadir dominio personalizado, DNS ni servicios externos. No habilitar Netlify Forms ni recogida de datos.
7. Solo cuando se quiera publicar la prueba, pulsar la acción de despliegue. Netlify proporcionará una dirección bajo `netlify.app`. Aunque Netlify pueda denominarlo despliegue de producción de ese proyecto, será un sitio independiente de prueba, no el lanzamiento oficial ni el dominio de CIM Studio.
8. Revisar desde móvil y escritorio: aviso de prueba, ES inicial, cambio completo a EN, apertura/cierre de ambos formularios, mensajes de demostración y enlaces legales provisionales. Las imágenes y textos legales definitivos siguen pendientes. Comprobar `X-Robots-Tag` en las cabeceras del documento mediante las herramientas del navegador.

A partir de esta conexión, los nuevos pushes a la rama seleccionada pueden actualizar automáticamente esa vista previa. No seleccionar `main` ni activar despliegues de otras ramas por accidente. No se ha realizado ningún commit, push ni despliegue durante esta preparación.


## Tarifa Fundadores — integración pendiente

Etiqueta propuesta para GetResponse: `cim_founders_2026`. El formulario de suscripción la declara mediante `data-getresponse-eligibility-tag`; no es un campo que conceda derechos, ni se envía o se crea todavía en GetResponse. La solicitud de muestras no incluye esta etiqueta.

En la futura integración, asignarla a **todos** los contactos que completen su suscripción hasta el 31 de diciembre de 2026 inclusive, sin límite de plazas. Beneficio: 15 % de descuento de por vida. Mantener la etiqueta tras el cierre de la campaña; la fecha limita el alta, no la duración del beneficio.

La automatización o servidor debe verificar la fecha real de suscripción completada (confirmada si se utiliza doble opt-in), no el clic en enviar ni el reloj del navegador. Utilizar el cierre inclusivo en `Europe/Madrid`: fecha anterior a `2027-01-01T00:00:00+01:00`. Registrar esa fecha en un campo de auditoría al integrar y evitar etiquetar nuevas altas posteriores al cierre. No confiar en el atributo del HTML para decidir la elegibilidad. Esta preparación no conecta formularios ni modifica GetResponse.

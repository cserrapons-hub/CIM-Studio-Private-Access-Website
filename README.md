# CIM Studio — Private Access

Web editorial estática con HTML/CSS/JavaScript y Pages Functions para los formularios. Rama: `design/private-access-v1`. No fusionar con `main`.

## Compilación y pruebas

```sh
sh scripts/build-preview.sh
npm test
```

Salida: `public`. Framework: None. Raíz: repositorio. Sin dependencias de aplicación. Las pruebas requieren Node 24 e incluyen SQLite en memoria; los proveedores y Turnstile se simulan. Cloudflare empaqueta `functions/` por separado; la salida estática no contiene secretos ni código de servidor.

Para servir solo la maqueta: `python3 -m http.server 3000 --directory public`. Los endpoints requieren el runtime de Pages, no el servidor estático. Sin configuración los formularios permanecen en demostración.

## Activación y dominio

Seguir [LAUNCH.md](LAUNCH.md): documentos legales pendientes, ajustes exactos de Cloudflare/GetResponse/Resend, pruebas reales y conexión de dominio conservando el servicio de correo actual de Google Workspace (Gmail). No se han realizado envíos reales, configurado cuentas externas ni modificado DNS. Las credenciales deben guardarse en Cloudflare, nunca en este repositorio.

`legal/content.js` contiene una plantilla pendiente de revisión, no una política jurídica aprobada. No activar los tres flags de lanzamiento antes de completar las pruebas indicadas.

Las fotografías y logotipos originales se conservan. Los archivos `assets/cover-*.webp`, los iconos y el logotipo en color de texto son derivados. La composición aprobada se mantiene.

## Color de las fotografías editoriales

Las cuatro imágenes visibles usan los derivados `assets/cover-*-s135-b120-srgb.webp` en todos los tamaños de pantalla. Saturación 1,35 y luminosidad 1,20 están incorporadas en los píxeles mediante la matriz sRGB de CSS Filter Effects, sin ajuste de contraste ni filtro CSS adicional. Los originales y los WebP anteriores permanecen intactos.

Regeneración opcional desde los originales: `sh scripts/prepare-editorial-images.sh`. Requiere ImageMagick 7 con LCMS/WebP y un perfil ICC sRGB estándar (`CIM_SRGB_PROFILE` permite indicar su ruta). El proceso aplica orientación EXIF, respeta/convierte perfiles de origen a sRGB, conserva el tamaño y encuadre de los derivados actuales y exporta WebP calidad 85 con perfil sRGB incrustado, eliminando metadatos ajenos al color. Los JPEG actuales no contienen ICC y su EXIF indica ColorSpace=65535 (sin calibrar): se interpretan como sRGB para reproducir la apariencia de los WebP anteriores sin perfil en el navegador, no como certificación del espacio de captura original. Si se sustituyen por originales de otro espacio sin perfil, debe confirmarse el perfil antes de regenerar.

Este paso no se ejecuta en Cloudflare Pages: se versionan los cuatro WebP ya generados y el build estático solo los copia. Sus nuevos nombres evitan reutilizar las versiones anteriores; el CSS conserva su versionado automático. La solución elimina la dependencia del filtro CSS para colorear las fotos, sin afirmar que se haya comprobado en Safari de un iPhone físico.

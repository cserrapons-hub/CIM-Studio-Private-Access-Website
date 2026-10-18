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

# Recomendaciones CIM Studio — implementación pendiente de despliegue
La rama añade /recomienda, enlaces personales enviados por Resend, atribución de altas profesionales y cupones en D1. No hay tienda ni canje aún.
## Activación
1. Aplicar `referrals-migration.sql` a la D1 vinculada como `FORMS_DB` en Cloudflare (primero preview, después producción).
2. Configurar `REFERRALS_ENABLED=true` en Cloudflare Pages tras migración. Reutiliza los secretos existentes RESEND_API_KEY, MAIL_FROM, GETRESPONSE_API_KEY, AUDIT_HASH_SECRET, NEWSLETTER_DATA_KEY y TURNSTILE_SECRET_KEY.
3. Probar correo de enlace, enlace con parámetro `r`, alta profesional, doble opt-in, visita al panel `?acceso=`, y confirmar que no se crean cupones antes del DOI.
4. Ejecutar pruebas de regresión de los tres formularios y comprobar que Cloudflare publica desde la rama correcta.
5. Reemplazar el marcador del vídeo por un reproductor real cuando se disponga del archivo o URL.
## Alcance y límites
- El código no crea cupones al enviar la solicitud: únicamente tras una comprobación del contacto activo profesional mediante API de GetResponse. La conciliación de pendientes ocurre al visitar el panel del recomendador (hasta 20 por visita), no en segundo plano.
- La emisión y el canje de cupones no están conectados todavía a /cajita. No prometer un pago ni un descuento canjeable antes de esa fase.
- Se almacena correo cifrado con NEWSLETTER_DATA_KEY, identificadores HMAC y tokens de acceso de 7 días. El panel no muestra direcciones de los recomendados.
- No existe mecanismo automático de envío de cupones por correo al recomendado todavía. El descuento queda reservado en la base de datos.
- Una recomendación se atribuye a un solo recomendador (primera solicitud válida) y no se admiten autorreferencias.
- El vídeo todavía no está suministrado. No publicar la página como campaña terminada hasta sustituir el marcador o aceptar expresamente su ausencia.

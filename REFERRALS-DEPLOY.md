# Despliegue de recomendaciones y cajita

## Condiciones comerciales

| Concepto | Condición confirmada el 25 de noviembre de 2026 |
| --- | --- |
| Cajita hasta el 31 de diciembre de 2026, hora de Mallorca | 40 € IVA incluido |
| Cajita desde el 1 de enero de 2027 | 60 € IVA incluido |
| Recogida en el taller de Sa Pobla | Gratuita |
| Envío a Mallorca, resto de Baleares y Península | 15,40 € IVA incluido por cajita (1.540 céntimos) |
| Otros destinos | Envío excluido a Canarias, Ceuta, Melilla y fuera de España |
| Cupones | Hasta tres de 5 € por cajita, aplicados al producto antes de sumar el transporte. Siguen siendo válidos en 2027. |

Cada alta profesional nueva y confirmada genera un descuento de 5 € para cada parte. El cliente ve el precio del producto, descuento, subtotal, transporte y total con IVA antes de continuar a Stripe. Por ejemplo, hasta el 31 de diciembre de 2026 una cajita con tres cupones y envío cuesta 40 € − 15 € + 15,40 € = **40,40 €**.

El servidor calcula el total, rechaza totales desactualizados y valida el destino por país y prefijo postal antes de abrir Checkout. La dirección validada se envía a Stripe en el PaymentIntent, con el transporte como línea separada. Para preparar el envío se usa esa dirección del PaymentIntent. D1 conserva una huella de la dirección vinculada al pedido para los reintentos.

## Cloudflare y proveedores

1. Usa un proyecto Pages de prueba dedicado con un origen estable `https://<proyecto>.pages.dev` y su propia D1 vinculada como `FORMS_DB`. Conserva las vinculaciones de `cim-studio-editorial-preview` y de producción. En D1 de prueba, aplica el esquema de formularios y newsletter y después `referrals-migration.sql`, que se puede volver a aplicar para añadir la tabla de destinos de envío. Pages usa `sh scripts/build-preview.sh` con salida `public`.
2. En GetResponse crea la lista de prueba `cim_studio_referral_test`, con doble opt-in para la API y sin campañas comerciales. Guarda su ID como `GETRESPONSE_CAMPAIGN_ID`. En Pages fija `REFERRALS_TEST_MODE=true`, `CONTROLLED_TEST_MODE=true` y el mismo origen exacto en `CONTROLLED_TEST_ORIGIN`, `NEWSLETTER_ORIGIN` y `CAJITA_TEST_ORIGIN`. Guarda `CONTROLLED_TEST_USER` y `CONTROLLED_TEST_PASSWORD` (32 caracteres como mínimo), y `REFERRALS_TEST_EMAILS` con 2 a 10 buzones de prueba separados por comas. Configura los controles habituales de newsletter, un widget Turnstile para ese host y un remitente verificado en Resend. Conserva los ajustes de la lista, Turnstile y formularios de producción.
3. Para el entorno de prueba, despliega `config/referral-cron.test.jsonc`. El Worker llama al endpoint `/api/referrals/reconcile-test` de Pages. Guarda el mismo `REFERRALS_TEST_CRON_SECRET` como secreto en ambos servicios y activa `REFERRALS_ENABLED=true` y `REFERRALS_AUTOMATION_ENABLED=true` en Pages. Verifica en Cloudflare que el Worker tenga configurado el disparador `*/5 * * * *` y comprueba en D1 que una recomendación pendiente se procesa. Para producción, copia `config/referral-cron.wrangler.jsonc.example` a un archivo local y configura el Worker con la misma D1, los mismos ajustes de la lista y las mismas credenciales de GetResponse y Resend que Pages, incluidos `GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID`, `MAIL_FROM`, `AUDIT_HASH_SECRET` y `NEWSLETTER_DATA_KEY`. Activa `REFERRALS_ENABLED=true` en Pages y Worker y `REFERRALS_AUTOMATION_ENABLED=true` en el Worker tras aplicar la migración.
4. En el sandbox de Stripe, configura el webhook `/api/webhooks/stripe` para `checkout.session.completed` y `checkout.session.expired`. Guarda `STRIPE_SECRET_KEY` de prueba y `STRIPE_WEBHOOK_SECRET` en Pages y activa `CAJITA_TEST_ENABLED=true`. El webhook de Stripe comprueba su propia firma para funcionar sin la contraseña del navegador. El canje requiere coincidencia de sesión, importe y moneda. Un cupón reservado se libera cuando Stripe confirma la expiración.
5. En una ejecución controlada, comprueba mensaje de enlace personal, ambas formas de atribución, confirmación en GetResponse, correo para las dos partes, saldo del panel, redirección y compra con Stripe de prueba, canje y expiración. Comprueba recogida, envíos a Baleares y Península y rechazo de destinos excluidos. Confirma los tres formularios existentes. La simulación en Node verifica el código y SQL. La configuración remota, los proveedores y la entrega de correo requieren la prueba conectada.
6. En producción, aplica la migración y despliega las rutas y el Worker con la D1 correspondiente. Habilita Checkout real con `CAJITA_LIVE_ENABLED=true` y `CAJITA_LIVE_VERIFIED=true` únicamente tras verificar lo anterior y almacenar la clave y el secreto live. Mantén activo el webhook de producción si es necesario pausar nuevas compras, para poder liquidar las sesiones ya emitidas. Confirma el destino de pedidos de Stripe para que CIM Studio pueda preparar recogidas y envíos.

Los enlaces de acceso al panel duran siete días. Los cupones se asocian al correo autenticado. La conciliación periódica conserva pendientes cuando falla la verificación y la cola de correo registra la aceptación de Resend. Si una creación de Checkout queda indeterminada, reintenta con el mismo identificador. Antes de liberar una reserva sin webhook, verifica en Stripe el estado de la sesión asociada.

La página recuperada incluye un marcador de vídeo. El archivo o URL del vídeo sigue pendiente.

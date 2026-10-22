# Candidaturas y bienvenida segmentada: único paquete privado

## Implementado localmente

- Candidaturas: enlace privado protegido, ruta pública sin Basic cuando controlled
  mode está desactivado, confirmación explícita, aviso administrativo mínimo solo
  tras confirmar, job cifrado e idempotente en la misma transacción. Sin migración.
- Newsletter: selector obligatorio sin opción de público preseleccionada, ES/EN,
  tanto en modal público como en ensayo privado. Valores estables `particular` y
  `profesional`, independientemente del idioma.
- API v3: email, campaña PL6jh, consentimiento njH9fM=aceptado y segundo campo
  personalizado configurado por su customFieldId real. Sin ID: envío bloqueado.
- La clasificación se transmite a GetResponse; no se añade un segundo registro
  permanente ni una nueva tabla D1. El consentimiento y su HMAC conservan su
  formato y evidencia existentes; no se reescribe la historia ni se deduce el
  segmento de registros antiguos. No se actualizan automáticamente contactos ya
  existentes para cambiarles de recorrido: la deduplicación sigue impidiendo
  nuevas altas/envíos para ese correo.
- Declararse profesional NO acredita actividad profesional ni concede tarifas o
  Fundadores. 202 sigue siendo solo solicitud aceptada, nunca doble confirmación.
- Cloudflare no envía ningún correo de bienvenida de newsletter. No se han
  redactado ni cambiado los contenidos pendientes de esos dos correos.

## Configuración mínima conjunta en GetResponse (sin ejecutarla)

1. Crear o comprobar un campo personalizado independiente, nombre propuesto
   `tipo_suscriptor`, de texto con selección única y valores exactos `particular`
   y `profesional`. No reutilizar el campo de consentimiento. Obtener su verdadero
   customFieldId mediante GET /v3/custom-fields, consulta autenticada de solo
   lectura ya utilizada para njH9fM. No usar el nombre como ID.
2. Configurar ese ID, no secreto, en Production de cim-studio-test como
   GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID. No sustituir PL6jh, njH9fM ni claves.
   El código debe desplegarse una vez junto con esta configuración. No activar
   envíos por el mero despliegue.
3. Mantener doble opt-in API en cim_studio_newsletter. Crear dos mensajes de
   automatización EN BORRADOR, sin aprobar contenidos ni activar recorridos:
   bienvenida-particulares y bienvenida-profesionales (nombres internos propuestos).
4. En Automation, comprobar el plan real y si permite la condición de suscripción
   confirmada a esa lista, filtrar por campo personalizado y las dos acciones de
   correo. Configuración preferida: UN workflow con dos ramas lógicas:

   confirmación efectiva de suscripción a cim_studio_newsletter
   → tipo_suscriptor = particular → bienvenida-particulares
   → tipo_suscriptor = profesional → bienvenida-profesionales
   → valor ausente/desconocido → no enviar y revisar manualmente.

   Alternativa equivalente si resulta más clara en el editor: dos workflows,
   cada uno filtrado por uno de los valores. Entrada una sola vez por contacto,
   sin añadir retroactivamente contactos históricos y sin otras automatizaciones
   duplicadas. Elegir API/Any method según las opciones reales de la cuenta.
   No usar un evento de solicitud API ni un 202 como disparador de bienvenida.
5. Antes de publicar workflows, acreditar que el disparador disponible en esa
   cuenta se ejecuta DESPUÉS del double opt-in también para altas API y que la
   clasificación está disponible en ese momento. Configurar y comprobar en una
   prueba futura autorizada: cero bienvenidas antes del clic y una sola bienvenida
   de la rama correcta después de confirmar. No se ha hecho esa prueba todavía.

## Plan: lo verificado y lo pendiente

CIM Studio confirma que el plan contratado es Starter. No hay acceso autenticado a sus opciones. La consulta de documentación pública
ha fallado por restricción de red, también tras solicitar acceso adicional. No se
ha confirmado el número permitido de workflows, condiciones
por campo o automatizaciones activas de nuestra cuenta.

Referencias oficiales para comprobar en la cuenta/navegador:
- https://www.getresponse.com/pricing
- https://apidocs.getresponse.com/v3

Una sola revisión en GetResponse debe confirmar plan y disponibilidad de los
bloques anteriores. Si solo limita el número de workflows, priorizar uno con dos
ramas si está disponible. Si el plan no admite los filtros/automatizaciones
necesarios, las alternativas mínimas son ampliar el plan o, provisionalmente,
enviar campañas manuales separadas SOLO a suscriptores confirmados y segmentados.
Esa alternativa manual no equivale a bienvenida automática. No implementar un
segundo servicio de correo desde Cloudflare para eludir la limitación.

## Decisiones sobre contenido e información al interesado

Pendiente redactar y aprobar los dos mensajes: asunto, remitente/reply-to, cuerpo,
idioma(s), enlaces y firma, manteniendo baja y condiciones comerciales aprobadas.
No se asignan contenidos automáticamente. La condición Particular/Profesional no
resuelve por sí sola si los correos serán ES/EN: decidir el idioma de cada mensaje
sin prometer una automatización de cuatro mensajes aún no aprobada.

Informar en privacidad de que se recoge el tipo de suscriptor autodeclarado para
adaptar las comunicaciones de bienvenida. No se han alterado los consentimientos
ni aprobado automáticamente los avisos públicos o privados; revisar ese añadido
informativo antes de captar este nuevo dato en pruebas reales.

## Entrega y autorización

CIM Studio confirma el campo tipo_suscriptor, customFieldId njdbT6, y su configuración
en Production de cim-studio-test. No se ha consultado la variable remota desde Codex.
Commit, push y despliegue automático están autorizados exclusivamente para la rama
de integración y cim-studio-test. No requiere nueva migración. No se autorizan
envíos reales durante la publicación, modificaciones de GetResponse, DNS ni activación pública. Los workflows
pueden quedar en borrador mientras se comprueba el formulario; su activación queda
pendiente de plan, disparador confirmado y aprobación de mensajes.


## Ajustes finales del mismo paquete

- Muestras: título en caja normal ES/EN, una sola descripción, cinco sectores,
  proyecto retirado y cinco campos postales requeridos y agrupados. El aviso
  administrativo incluye sector y dirección; el acuse no repite la dirección.
- D1: sin migración. Los datos de muestras ya son JSON cifrado AES-GCM. Nuevos
  registros usan versión interna 2; los JSON antiguos con proyecto permanecen
  íntegros y legibles, al igual que sus evidencias y trabajos históricos.
- El ensayo privado usa exclusivamente datos postales ficticios prefijados y
  el correo propio autorizado. No tramitar envíos físicos de esas muestras.
- El borrador legal público se adapta a clasificación y datos postales y mantiene
  approved:false. Los avisos privados previamente aprobados no se reescriben ni
  reaprueban: revisar el suplemento informativo sobre los nuevos datos antes de
  cualquier nueva prueba real. Consentimientos y criterios Fundadores sin cambios.
- Composición: máximo de 1426 px conservado; fotografías exteriores ancladas al
  contenedor, columna de texto centrada con límite propio, espacios proporcionales
  y adaptación móvil sin filtros ni cambios a los archivos de imagen.

Un solo despliegue privado agrupa todo el paquete. El ID del campo ya está confirmado por CIM Studio: njdbT6.
Las opciones de Automation de Starter pueden comprobarse en paralelo, con los
workflows en borrador: no bloquean desplegar el código privado sin realizar envíos y conservando los indicadores existentes. No hace falta ejecutar SQL remoto. La activación
real y los dos mensajes siguen requiriendo autorización y revisión propias.

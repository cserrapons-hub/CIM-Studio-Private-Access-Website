# Conciliación única de las tres solicitudes ya realizadas

No repetir formularios ni drenar colas. No cambiar variables ni datos durante esta comprobación.
El código local distingue almacenamiento, aceptación del proveedor y entrega; no puede certificar
los resultados remotos sin consultar los registros de las cuentas.

## Una intervención de solo lectura en las cuentas privadas

1. Cloudflare D1 → **cim-studio-samples-test** → Console. Ejecutar estas consultas por separado.
   No seleccionar emails, contenidos cifrados, IDs, hashes ni firmas.

```sql
SELECT a.state AS api_state, a.provider_http_status, a.updated_at, COUNT(*) AS total
FROM newsletter_api_deliveries a
JOIN newsletter_consent_requests c ON c.request_id=a.request_id
WHERE c.policy_version='newsletter-private-test-v1'
GROUP BY a.state,a.provider_http_status,a.updated_at;
```

```sql
SELECT kind,state,consent_version,consent_at,confirmed_at,COUNT(*) AS total
FROM registrations WHERE consent_version='samples-private-test-v1'
GROUP BY kind,state,consent_version,consent_at,confirmed_at;
```

```sql
SELECT CASE WHEN m.id LIKE '%:admin' THEN 'admin' ELSE 'receipt' END AS purpose,
 m.state,m.attempts,m.updated_at,
 CASE WHEN m.provider_id IS NOT NULL THEN 1 ELSE 0 END AS provider_id_present,
 COUNT(*) AS total
FROM registration_mail m JOIN registrations r ON r.id=m.registration_id
WHERE r.consent_version='samples-private-test-v1'
GROUP BY purpose,m.state,m.attempts,m.updated_at,provider_id_present;
```

2. Cloudflare D1 → **cim-studio-careers-test** → Console. Ejecutar las dos últimas
   consultas cambiando `samples-private-test-v1` por `careers-private-test-v1`.
   No ejecutar consultas en bases públicas.

3. Resend → **Emails** y **Logs**, filtrar por la franja horaria de las pruebas y
   los destinatarios autorizados. Revisar el aviso administrativo y los dos correos
   al participante. Comunicar solo: existe/no existe llamada POST /emails,
   estado HTTP, código de error sin su mensaje completo, y eventos
   accepted/sent/delivered/delayed/bounced/suppressed/failed que figuren realmente.
   Si faltan registros, comprobar que la API key configurada corresponde a esa
   cuenta/equipo. En **Domains**, comprobar el dominio exacto de MAIL_FROM como
   Verified y el alcance de la key; no cambiar DNS ni pegar la key. Un remitente
   de pruebas de Resend puede tener restricciones de destinatario: verificarlo
   en la respuesta real, sin presuponer que sea la causa.

4. GetResponse → lista **cim_studio_newsletter**, buscar privadamente el correo
   autorizado en contactos activos, pendientes e inactivos según las vistas disponibles.
   Verificar double opt-in **API**, no solo web, y cualquier estado de supresión,
   rechazo o correo de confirmación que la cuenta muestre. Si D1 registra 202 y
   el panel no explica el correo ausente, solicitar a soporte la trazabilidad de
   esa única llamada en su hora UTC. No usar createdOn como confirmación.

5. En el buzón autorizado y en admin@cimstudio.es, revisar spam, cuarentena y
   búsqueda por remitente/hora. Si el proveedor informa delivered pero no aparece,
   consultar la trazabilidad del proveedor receptor; no reenviar para comprobarlo.

Compartir únicamente los resultados agregados de SQL y estados técnicos. No HAR,
claves, capturas de contactos, cuerpos completos de errores ni URLs con tokens.

## Interpretación sin nuevas solicitudes

- Sin fila: no demuestra llamada al proveedor; posible bloqueo antes de persistencia.
- Consentimiento/fila almacenada: prueba registro local, no envío.
- Newsletter accepted + 202: GetResponse aceptó procesar; no prueba correo ni DOI.
- Mail pending + attempts=0: no consta llamada reclamada; revisar fallo previo al drenaje.
- Mail rejected: rechazo registrado; recuperar causa en Logs de Resend.
- Mail unknown/sending: resultado incierto; conciliar proveedor, nunca reintentar a ciegas.
- Mail accepted + provider_id_present=1: Resend devolvió ID; comprobar eventos de entrega.
- DOI: solo acreditado al confirmar efectivamente el correo y verificar el resultado;
  no se concede Fundadores por un 202 ni por abrir la web.

MAIL_WORKER_ENABLED=false solo detiene el worker programado. Los handlers privados
llaman al drenaje inmediatamente y solo para el registro recién creado. No activar
el worker como supuesto arreglo: podría procesar trabajos pendientes sin autorización.

## Alcance de la corrección local

Sin migraciones, nuevos endpoints, cambios de proveedores, envíos ni escrituras remotas.
Se mantiene `mail=accepted|pending` por compatibilidad y se añade `mailState`
(accepted/rejected/uncertain/pending) y `deliveryVerified:false`.
Cero trabajos ya no se interpreta como aceptación. La interfaz privada muestra
el estado preciso sin afirmar entrega. Los rechazos y resultados inciertos no se reenvían.

# Decisiones definitivas de lanzamiento

**ACTUALIZACIÓN POSTERIOR:** seguir [GETRESPONSE-HTML.md](GETRESPONSE-HTML.md). Se retira la vía alojada y se prepara HTML independiente, bloqueado hasta recibir/revisar el código oficial de GetResponse. Se mantiene CIM Production como registro definitivo.

Este documento sustituye cualquier propuesta anterior de registro definitivo de Fundadores en D1.

- Único registro definitivo: CIM Production → Clientes, incluyendo potenciales sin ninguna compra.
- Datos mínimos: email normalizado único, fecha acreditada de confirmación, estado Fundador 2026 y descuento del 15 %.
- Elegibilidad: confirmación anterior a 2027-01-01 00:00 Europe/Madrid (2026-12-31T23:00:00Z exclusivo). Una baja de marketing no elimina automáticamente el derecho.
- Al crear proformas: 15 % sobre PVP o tarifa profesional para profesionales verificados, también en encargos personalizados; no sumar dos descuentos Fundadores ni acumular otras promociones.
- No hay acceso al repositorio/API/modelo de Clientes o proformas de CIM Production en este entorno. No se ha inventado un endpoint ni se afirma que esa automatización esté implementada.
- D1 solo podrá actuar como intermediario si son necesarios deduplicación/reintentos. Borrar tras acuse y conciliación en CIM Production; antes de usarlo, fijar el máximo de incidencias y la tarea de purgado. La cola previa no contiene el email normalizado en claro, por lo que no es un conector de entrega reintentable terminado: debe adaptarse al contrato real y a la protección mínima de los datos pendientes de entrega.
- No aplicar la antigua migración de derechos D1: se ha trasladado a tests/fixtures/legacy-founders.sql solo para pruebas históricas. La antigua herramienta de importación D1 ha quedado desactivada. El receptor no escribe derechos definitivos en D1 y responde sin éxito de entrega cuando falta CIM Production.
- El formulario público de newsletter queda bloqueado mientras customerDeliveryVerified sea false. Muestras tiene envío de servidor preparado a admin@cimstudio.es con Resend, pero faltan comprobación de configuración/entrega y autorización de activación; su consentimiento y finalidad son independientes de la newsletter. No se activa producción.
- Sin Google Analytics, Meta Pixel ni GetResponse Analytics. Inventario en ejecución de tecnologías/Turnstile y decisión de consentimiento pendientes; no se declara ausencia de cookies.
- Conservación acordada: newsletter con suscripción/consentimiento válidos y mínimos justificados tras baja; muestras sin relación comercial posterior 12 meses (confirmar inicio del cómputo); Fundadores mientras exista y sea necesario gestionar el beneficio, con atención a supresión; facturas conforme a obligaciones aplicables, sin inventar años.
- legal/content.js ES/EN actualizado como borrador, approved=false. No hay nuevos datos registrales inventados.

## Bloqueos técnicos actuales

1. Acceso al proyecto/API real de CIM Production para reutilizar Clientes, evitar duplicados, recibir evidencias e implementar el descuento idempotente en proformas; acordar entrega directa o cola mínima con acuse/purgado.
2. Resolver conexión efectiva del formulario GetResponse sin Analytics y revisar contrato/autenticación del webhook con un evento real autorizado. Forma alojada y procedencia exacta siguen pendientes de comprobación.
3. Configuración real de D1 solo si se justifica la cola, secretos y correo de muestras; prueba autorizada de suscripción/confirmación, baja, potencial sin compra, proforma particular/profesional/personalizada y entrega de muestras.

La aprobación legal y la autorización de despliegue/activación siguen siendo necesarias. No se han hecho commit, push, despliegue, cambios externos o DNS, ni suscripciones reales.

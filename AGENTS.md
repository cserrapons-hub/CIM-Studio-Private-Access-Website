# CIM Studio

- Continúa el trabajo desde la rama y el PR existentes. El PR #19 corresponde a `feature/recomienda-landing-2026-11-17`.
- Conserva los formularios públicos y sus controles de consentimiento, Turnstile y entrega. Ejecuta el build publicado y la regresión de formularios antes de desplegar.
- Mantén claves y credenciales en los gestores de secretos de los servicios. Evita incluirlas en Git, mensajes, registros y artefactos.
- Aplica 40 € IVA incluido hasta el 31 de diciembre de 2026 y 60 € IVA incluido desde el 1 de enero de 2027, según la hora de Mallorca. Aplica hasta tres cupones de 5 € por cajita, solo al producto. Añade después el transporte y muestra el desglose y total antes del pago.
- Ofrece recogida gratuita en el taller de Sa Pobla o envío a Mallorca, resto de Baleares y Península por 1.540 céntimos IVA incluido por cajita. Excluye Canarias, Ceuta, Melilla y destinos internacionales y valida la zona en el servidor antes de crear la sesión de Stripe.
- Verifica con cuentas de prueba el recorrido de recomendación, doble opt-in, emisión y entrega de cupones, compra y pago antes de declarar operativo el servicio. Aplica las migraciones primero sobre D1 de prueba.

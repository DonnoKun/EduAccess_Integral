# Orquestación de IA resiliente para EduAccess Integral

Lo que ve el usuario no cambia: pantallas, accesibilidad, voces del navegador y español/inglés se quedan igual. Todo el trabajo es en el servidor y se puede medir para la tesis.

## 1. Pasarela de IA resiliente (S4)
- Un módulo compartido que usan las 5 funciones de IA (adaptar contenido, generar curso, imagen, transcripción, búsqueda).
- Límite de tiempo de 20 s, 2 reintentos con espera creciente, modelo principal Gemini y modelo de respaldo OpenAI con la misma interfaz.
- Cortacircuitos guardado en la base de datos: se abre tras 5 fallos seguidos, espera 30 s, hace una sola prueba y se cierra si funciona.
- Si fallan los dos modelos, devuelve el último resultado guardado y lo marca como "degradado".

## 2. Métricas (OE3)
- Una fila por cada llamada de IA: función, modelo, ruta (principal / respaldo / caché / fallo), tiempo, éxito, código, tokens, degradado.
- Con eso se calculan disponibilidad, tasa de error, rendimiento, latencia p95 y costo.

## 3. Procesamiento por eventos (bus de eventos)
- Tabla de trabajos de adaptación con estados pendiente / procesando / listo / fallido / compensado.
- Cola de Postgres (pgmq) más un trabajador que procesa los pasos en segundo plano.
- SAGA: si un paso posterior falla, se deshacen los pasos ya hechos y el trabajo queda "compensado".

## 4. Servicios S1 a S5 y microservicios de alumnos
- Funciones con nombres de la arquitectura: content-aggregation, visual-profiling, accessibility-remediation, ai-orchestration, content-delivery. Las funciones actuales siguen funcionando para no romper la app.
- Cuatro funciones independientes que compone el orquestador: alt-text, data-image-description, ocr-tts, wcag-verify. Cada una devuelve un resultado estructurado y registra métricas.

## 5. Seguridad
- Permisos por fila en todas las tablas; métricas, cortacircuitos y trabajos solo los lee el servidor.
- Validación de entradas con zod y rechazo de solicitudes demasiado grandes en todas las funciones.
- Límite de llamadas de IA por usuario (por ejemplo 30 por minuto).
- CORS limitado al sitio de Vercel y a las direcciones de vista previa.
- `.env` añadido a `.gitignore`. Los secretos siguen guardados solo en el servidor.

## 6. Verificación
- Apuntar el modelo principal a un modelo inválido: la adaptación responde por el respaldo o la caché, y el cortacircuitos se abre y luego se recupera.
- Comprobar que las métricas tienen una fila por llamada con su ruta.
- Pruebas automáticas para el cortacircuitos, los reintentos y la validación.

## Notas
- Cada respaldo y cada prueba gastan créditos de IA. La prueba del modelo inválido se hace con pocas llamadas.
- El modelo de respaldo será el modelo OpenAI que permita tu espacio de trabajo con su política de retención (openai/gpt-6.1-terra).
- Es un cambio grande. Lo haría por partes: 1-2, luego 5, luego 3-4.

## Detalles técnicos
- `supabase/functions/_shared/ai-gateway.ts` (adaptador, timeout, reintento, breaker, caché, métricas), `_shared/validate.ts` y `_shared/cors.ts`.
- Tablas nuevas `circuit_breaker_state`, `resilience_metrics`, `remediation_jobs`, `ai_rate_limits`, con GRANT solo para service_role y RLS activado.
- Worker por pg_cron + pg_net, que consume pgmq.

# Validación educativa previa — 1.24.0

## Regla
Antes de crear un tema educativo nuevo, debe confirmarse que es un tema académico; sin aprobación, no se genera texto de lección ni imágenes. La comprobación breve usa IA y puede consumir créditos la primera vez; su resultado se reutiliza desde caché. No se promete validación gratuita.

## Lugares revisados en código
- Búsqueda de estudiantes: Search y performSearch comparten el servicio search-content en computadora y celular. La revisión precedía a la búsqueda, pero podía aprobar por fallo o respuesta inválida. Corregido: aprobación explícita; si falla, resultados vacíos con explicación.
- Fallos de búsqueda: las tres rutas de error del estado compartido ofrecían ejemplos que podían abrir lecciones automáticamente. Corregido: ninguna ofrece resultados de sustitución.
- Crear lección docente: GroupDetail llama a generate-course-content; el servicio comprueba antes del esquema de temas, texto y revisión de calidad. Ahora detiene fallos de validación; conserva los campos. El decodificador descarta la jerga de transporte de la captura.
- Regenerar sección docente: LessonEditor usa la operación regenerate_section. Añadida comprobación antes de la regeneración; la revisión asesorativa no crea un tema nuevo.
- Lecciones de búsqueda: ContentViewer llama al mismo servicio para generación nueva; las traducciones de material ya creado conservan su contenido y no se tratan como temas nuevos.
- Lecciones de grupos: LessonViewer traduce material existente; no crea temas nuevos. Las copias docentes reutilizan contenido sin inferencia. Sin cambios en esas rutas.
- Imágenes automáticas y editadas: CourseImage comparte generate-course-image; añadida aprobación antes de traducir el prompt o generar el bitmap. Las imágenes ya guardadas permanecen intactas.
- Recomendaciones e historial del inicio: Dashboard dirige a Search; por tanto la generación nueva pasa por la revisión del servicio. No se alteraron búsquedas anteriores ni lecciones guardadas.
- Agregación de fuentes, remediate-content y content-delivery: normalizan, simplifican o presentan material suministrado; no son generadores de temas nuevos. Se leyeron sus servicios; no se cambió su comportamiento.
- Cola accessibility-remediation y trabajador ai-orchestration: procesan descripciones/OCR/verificación de material existente, no nuevas lecciones. Se leyeron la cola, trabajador y microservicios; no se alteraron trabajos ni resultados ya terminados.
- Funciones de base de datos proporcionadas: gestionan grupos, invitaciones, caché, progreso, cuotas y benchmarks; ninguna genera lecciones. Sin cambios de permisos ni datos.
- Benchmark: usa prompts fijos y acceso protegido; no es una entrada para temas de estudiantes o docentes. Sin cambios en sus políticas ni métricas.

## Comprobación
- 27 pruebas de regresión: aprobación explícita, rechazo, caché sin nueva comprobación, indisponibilidad, respuestas inválidas, búsquedas sin ejemplos tras errores, errores seguros, traducción y calidad.
- Con sesión real, búsqueda móvil de «chismes de famosos de la farándula» produjo cero resultados y explicación. Solo se llamó search-content: ninguna llamada a generar lecciones o imágenes.
- Los servicios desplegados de lecciones e imágenes devolvieron NOT_EDUCATIONAL para el mismo tema, sin generar material.
- La pantalla docente no se ejecutó con una sesión docente en esta revisión; su ruta se leyó y se probó el servicio compartido con sesión válida.
- El registro más reciente confirmó build OK.
# Pruebas de reutilización docente e imágenes

Fecha: 26 de noviembre de 2026, 06:30–06:35 UTC.

Se ejecutaron recorridos reales en la aplicación local conectada a Lovable Cloud, con una cuenta docente temporal y sin modificar la cuenta del usuario. No se cambiaron la arquitectura ni los servicios.

## Reutilización docente

- Se creó una lección publicada en un grupo de origen y se reutilizó desde el diálogo del grupo de destino.
- La copia tuvo identificador nuevo, contenido idéntico y estado de borrador.
- Durante la reutilización no hubo solicitudes a funciones de IA.
- Se editaron título, sección y solicitud de imagen en la copia; el borrador se guardó, se recargó y se comprobó desde el editor.
- La lección original conservó exactamente su título y contenido.
- Se publicó la copia y se abrió desde su botón de lectura.

## Imagen solicitada por el docente

- Se introdujo una solicitud en español sobre el ciclo del agua desde el editor.
- La imagen generada y cargada midió 1024 × 1024 píxeles.
- La descripción visual identificó el lago, las flechas, la nube, la lluvia, la montaña y el río, además de colores y relaciones espaciales.
- La imagen volvió a aparecer tras recargar; una solicitud idéntica confirmó `cached: true`.
- El registro de imagen `01a2168e-01ce-760f-9fcb-af09c88f45a3` confirmó instrucciones en inglés y respuesta satisfactoria.

## Imagen automática

- Se generó una lección real desde «Nueva lección» sobre evaporación y condensación, con una sección y una imagen solicitadas en el enfoque.
- Se abrió la lección sin editar su solicitud de imagen.
- La ilustración automática midió 1024 × 1024 píxeles; su texto alternativo observado tuvo 119 caracteres.
- La descripción identificó elementos visibles de ambos lados, flechas rojas y azules, agua, gotas y los rótulos incrustados «Evaporación» y «Condensación».
- Se verificaron reapertura con la misma imagen y respuesta `cached: true`.
- El registro de imagen `01a2168f-b4e3-75fb-a726-3f27eb5aa8ba` confirmó instrucciones en inglés; los rótulos españoles se conservaron como contenido de la ilustración.
- No hubo errores de ejecución registrados por el navegador durante este recorrido.

## Validación y limpieza

- Ambas vistas se revisaron en escritorio y teléfono de 390 × 844 píxeles, sin desbordamiento horizontal.
- Las 10 pruebas de `src/test/lowVisionLessons.test.ts` pasaron.
- El último registro de compilación indicó `build OK`.
- Se eliminaron los grupos, las lecciones y los datos de perfil/rol temporales; las consultas de comprobación devolvieron cero grupos y cero lecciones restantes de la cuenta de prueba.
- Las imágenes y sus descripciones permanecen en las cachés existentes para evitar regeneraciones; no se borraron cachés compartidas ni contenido del usuario.

Estas pruebas verifican los recorridos solicitados, no todos los casos posibles ni la calidad del sonido de voces en dispositivos físicos.
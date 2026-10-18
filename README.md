# Simulacro de Examen – Normativas Educativas

Simulador web responsive de exámenes de opción múltiple sobre normativas educativas. Incluye catálogo de normativas, configuración del simulacro (modo práctica o examen, cantidad de preguntas, tiempo límite), panel de preguntas con retroalimentación y pantalla de resultados.

## Ejecutar
Abre `index.html` en un navegador moderno. Para desarrollo, puedes utilizar la extensión Live Server de Visual Studio Code.

## Archivos
- `index.html`: estructura de la interfaz (catálogo, modal de configuración, panel de preguntas y resultados).
- `styles.css`: estilos responsive para móvil, tablet y computadora.
- `app.js`: menú, tarjetas del catálogo y modal de configuración.
- `quiz.js`: lógica del simulacro (temporizador, navegación, corrección y resultados).
- `data/preguntas.js`: banco de preguntas generado a partir de los documentos Word.
- `tools/importar_docx.py`: importador que genera `data/preguntas.js`.

## Actualizar el banco de preguntas
Cada `.docx` debe seguir el formato: `1. Enunciado`, alternativas `a)` a `d)` con la correcta en **negritas**, y `Retroalimentación:` al inicio de línea.

```
python tools/importar_docx.py "C:\ruta\a\la\carpeta\con\los\docx" ["otra\carpeta" | "archivo.docx" ...]
```

Si un archivo con el mismo nombre aparece en varias rutas, se usa el último indicado. Una línea opcional `Respuesta correcta: b` se usa como control y no se muestra en la pregunta.

El importador muestra cuántas preguntas obtuvo de cada archivo y avisa de preguntas sin respuesta en negritas, con alternativas incompletas o con el enunciado repetido (estas se omiten). La relación entre archivos y tarjetas está en la lista `NORMATIVAS` del script; el título debe coincidir con el `data-law` de la tarjeta en `index.html`.

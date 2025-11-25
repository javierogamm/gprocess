# AGENTS: Control del asistente `wizard.js`

Este archivo gobierna los cambios dentro del directorio `js/`, con énfasis especial en `wizard.js`.

## Especialización secundaria: `guidedassistant.js`
- Considera `guidedassistant.js` como la fuente de verdad para el output guiado del asistente. Antes de editarlo, revisa cómo genera mensajes, sugerencias y elementos de usabilidad.
- Optimiza el formato y tono de las respuestas para que sean claras, accionables y coherentes con la guía del asistente principal (`wizard.js`).
- Mantén la compatibilidad con cualquier consumidor aguas arriba (componentes que renderizan el output); no cambies la forma ni el contrato de las respuestas sin documentar los ajustes y su impacto.
- Documenta con comentarios breves cualquier nueva plantilla de mensaje, campo adicional o variación de flujo. Si agregas banderas o parámetros nuevos, indica valores por defecto y casos límite.
- Al introducir cambios de usabilidad (p. ej., reordenar pasos, simplificar textos, agregar ayudas contextuales), explica el objetivo concreto y cómo el cambio mejora la experiencia.
- Preferir mensajes concisos, con acciones claras y consistentes; evita sobrecargar al usuario con tecnicismos sin contexto.
- Garantiza que los textos sean accesibles: comprueba longitud razonable, evita mayúsculas sostenidas y cuida la puntuación para lectura rápida.
- No dupliques lógica ya presente en `wizard.js`; sincroniza comportamientos compartidos mediante funciones utilitarias o referencias comunes cuando sea posible.
- Si el output depende de datos externos o estados del asistente, valida la presencia de dichos datos y maneja estados faltantes con mensajes seguros y claros.
- Revisa que los mensajes resultantes sean rastreables (por ejemplo, con IDs o claves consistentes) para facilitar pruebas y depuración.

## Especialización
- Prioriza comprender y preservar el flujo del asistente descrito en `js/wizard.js`. Antes de modificarlo, revisa sus pasos, eventos y dependencias internas.
- Mantén sincronía con módulos relacionados (`guidedassistant.js`, `ui.js`, `renderer.js`) para evitar romper la navegación del asistente.

## Buenas prácticas
- No elimines ni alteres validaciones de pasos sin agregar pruebas manuales o notas claras en el resumen.
- Al añadir opciones o estados nuevos en el asistente, documenta el comportamiento esperado en comentarios breves dentro de `wizard.js`.
- Respeta la estructura de eventos existente; reutiliza manejadores antes de crear otros nuevos.

## Comprobaciones mínimas
- Después de cualquier cambio que afecte `wizard.js`, ejecuta las rutas del asistente en el navegador o explica en el resumen por qué no fue posible probarlo.

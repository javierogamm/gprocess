# Historial de cambios

## v1.1.16
- Ajustada la importación de tesauros por copypaste para aceptar el pegado directo desde la app, manteniendo compatibilidad con el formato anterior.

## v1.1.15
- Actualizada la importación de valores de selectores para detectar referencias/valores pegados y omitir etiquetas de idioma.

## v1.1.14
- Actualizado el copypaste de tesauros para aceptar el formato con momento/agrupación/referencia/nombre/tipo y mantener compatibilidad con el formato anterior.
- Propagados momento y agrupación al actualizar o crear tesauros importados.

## v1.1.13
- Añadida la importación de tesauros por copypaste con modal dedicado y configuración guiada de selectores I18N.
- Ajustada la paleta de botones de tesauro para mantener el rojo corporativo en paneles y modales.

## v1.1.12
- Ajustada la importación de tesauros desde CSV para leer las columnas exportadas y reconstruir tipos, nombres, referencias y valores de selectores sin usar la tabla de vinculación.

## v1.1.11
- El modal de importación desde Gestiona muestra desde el inicio las tablas del resumen vacías, listas para rellenarse tras Cargar y permitir Validar.

## v1.1.10
- Sustituido el copypaste por un modal de importación desde Gestiona con área de pegado, botón Cargar y validación posterior tras revisar el resumen.
- Añadida una vista resumen previa idéntica a "Ver procedimiento" antes de validar la importación.

## v1.1.9
- Actualizado el copypaste para transformar automáticamente las condiciones importadas en tesauros, reutilizando la lógica del botón de transformación.

## v1.0.0
- Sustituida la asignación legacy única por asignaciones múltiples de grupos y usuarios en todas las interfaces, incluida la selección masiva.
- Ajustadas las importaciones/exportaciones (CSV y texto) para utilizar los campos de asignación múltiples y poblar los pools globales.
- Actualizadas las plantillas y asistentes para crear nodos únicamente con asignaciones en formato de lista.

## v1.1.0
- Asignados colores persistentes a las conexiones seleccionadas y sus resaltados para mejorar la lectura visual.
- Guardadas las posiciones manuales de tramos para que las conexiones no se reinicien al mover nodos.
- Habilitado el arrastre de etiquetas de condición a lo largo de cada línea para reubicarlas con precisión.

## v1.1.1
- Revertida la persistencia del movimiento manual de tramos en conexiones.
- Añadido selector de color en el panel lateral para cambiar el color de la conexión seleccionada y su highlight.

## v1.1.2
- Ajustado el color base de las conexiones para que el selector pinte la línea incluso sin selección.

## v1.1.3
- Ajustado el selector de color para respetar el color base por defecto y solo aplicar cambios cuando el usuario elige un color.

## v1.1.4
- Actualizada la importación de copypaste para aceptar la nueva columna de tipo de tarea y mantener la compatibilidad con el formato anterior.

## v1.1.5
- Ajustada la importación de copypaste para detectar bloques copiados desde la app sin pasar por Excel, preservando asignaciones y condiciones.
- Actualizada la guía del copypaste para indicar que se acepta texto desde la app o Excel.

## v1.1.6
- Corregida la detección de columnas en el copypaste para mantener separadores con tabulaciones aunque falten columnas, asegurando compatibilidad con el formato de la app externa.

## v1.1.7
- Evitada la propagación visual de asignaciones entre nodos al clonar arrays de asignación por nodo.
- Ajustadas las ediciones y eliminaciones de asignaciones para no compartir referencias entre nodos.

## v1.1.8
- Ocultado el campo legacy de "Asignado a" en el panel lateral para mostrar solo asignaciones por grupo y usuario.

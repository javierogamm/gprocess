# Historial de cambios

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

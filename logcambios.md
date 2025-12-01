# Historial de cambios

## v1.0.0
- Sustituida la asignación legacy única por asignaciones múltiples de grupos y usuarios en todas las interfaces, incluida la selección masiva.
- Ajustadas las importaciones/exportaciones (CSV y texto) para utilizar los campos de asignación múltiples y poblar los pools globales.
- Actualizadas las plantillas y asistentes para crear nodos únicamente con asignaciones en formato de lista.

## v1.1.0
- Añadido botón visible de importación desde CSV debajo de la exportación normalizada, reutilizando el selector oculto de Tareas.csv y Condiciones.csv.
- La guía interactiva destaca la nueva importación para que los usuarios reconstruyan flujos desde los ficheros exportados.
- El importador CSV ahora interpreta el campo “Inicio manual” y recupera los cambios de estado vinculados a cada conexión.

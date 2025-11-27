# Guía visual del editor de flujos

Esta guía resume las zonas interactivas del editor y cómo trabajar con nodos, conexiones, condiciones, tesauros y opciones de carga.

## Mapa rápido de la interfaz
- **Panel izquierdo**: ficha del procedimiento, botón para ver el CSV, creación de nodos, guardado/carga de JSON, pegado de texto y accesos a IA (botón 🤖 IA JSON y pegado directo).
- **Lienzo central**: arrastra y suelta nodos, crea conexiones desde los *handles* laterales, usa el recuadro de selección para mover grupos.
- **Panel derecho**: muestra propiedades del nodo o de la conexión seleccionada (título, tipo, descripción, tarea manual, asignaciones y salidas).
- **Controles flotantes**: botones de Asignaciones, Cambios de estado, Tesauro, Asistente y Wizard; se abren como paneles laterales o ventanas modales.

## Ficha del proyecto
1. Pulsa **Ficha del proyecto** en el panel izquierdo.
2. Rellena *Procedimiento*, *Actividad* y la *Descripción del procedimiento*.
3. Guarda para que la información quede asociada al diagrama (también se exporta en el JSON).

## Nodos: creación y arrastre
- Usa los botones **+ Formulario**, **+ Documento**, **+ Libre**, **+ Decisión**, **+ Circuito Resolución**, **+ Añadir Plazo**, **+ Operación Externa** o **+ Nota** para generar nodos.
- Cada nodo se puede **arrastrar** por el lienzo; con `Ctrl/Cmd` puedes seleccionar varios y moverlos en grupo.
- El panel derecho actualiza sus campos según el nodo seleccionado para editar título, tipo, descripción y asignación.

## Nodo de prueba con handles y conexiones
Representación esquemática de un nodo:
```
┌────────────────────────┐
│        Título          │
│                        │
├─● Entrada         ● Salida ─┤
└────────────────────────┘
```
- Los **handles** (puntos laterales) permiten **arrastrar** para crear conexiones. Haz *drag* desde un handle de salida hasta un handle de entrada del nodo destino.
- Al soltar, la línea queda dibujada y puedes seleccionarla para editar sus propiedades.

## Condiciones y estados en conexiones
1. Haz clic sobre una conexión para abrir su ficha en el panel derecho.
2. Rellena **Nombre de la condición**, **Valor** y, si aplica, el campo **Nuevo estado** (definirás la transición del expediente).
3. También puedes **arrastrar una condición desde el Tesauro**: toma una tarjeta del panel 📚 Tesauro y suéltala encima de la línea; el nombre y el valor se autocompletan y la conexión parpadea en verde para confirmarlo.
4. Las conexiones pueden reconectarse: selecciona la línea, arrastra desde uno de sus handles y suéltala en otro nodo para rehacer el enlace.

## Asignaciones y cambios de estado
- **📋 Asignaciones**: botón flotante que abre el panel de grupos y usuarios. Permite importar listas pegando texto, asignar nodos y resaltar qué elementos pertenecen a cada grupo/usuario.
- **🔄 Cambios de estado**: panel flotante para definir los estados posibles y ligarlos a nodos o conexiones. Úsalo junto con el campo *Nuevo estado* de cada conexión para visualizar la ruta de transición.

## Gestor de tesauros y opciones
- **📚 Tesauro**: panel lateral con todos los campos disponibles. Crea referencias, tipos (selector, sí/no, texto, numérico, moneda, fecha) y sus opciones. Cada tarjeta se puede arrastrar a nodos o conexiones para reutilizar condiciones.
- **🧩 Gestor Completo de Tesauros**: modal avanzado que lista todos los tesauros, permite edición masiva, referencia cruzada y guardado de cambios globales.
- **Transformar condiciones**: en el panel del tesauro hay herramientas para convertir condiciones existentes en campos reutilizables y exportarlos.

## Carga y guardado (IA, pegado y archivos)
- **Guardar JSON** y **Cargar JSON**: exporta o importa el diagrama completo (incluye ficha, tesauro, asignaciones y estados).
- **📋 Pegar JSON**: pega un JSON desde el portapapeles; si el navegador no permite leerlo, aparece un *prompt* para pegarlo manualmente.
- **🤖 IA JSON**: abre el asistente externo para generar o revisar JSONs del flujo.
- **Copiar/pegar directo**: en *Copypaste* pega texto estructurado para reconstruir nodos y conexiones. Si partes de un listado de *gestiona*, realiza este paso previo: copia desde gestiona → pega como texto sin formato en Excel → vuelve a copiar desde Excel → pega aquí (evita caracteres ocultos).
- **Importar desde texto**: el botón *Importar diagrama desde texto* procesa el contenido del área de *Copypaste* para dibujar automáticamente el flujo.

## Prueba rápida
1. Crea un nodo de **Decisión** y otro de **Documento**.
2. Arrastra un handle de salida del primero al handle de entrada del segundo.
3. Selecciona la conexión, escribe `Resultado` como condición y `Favorable` como valor; añade un *Nuevo estado* si necesitas marcar la transición.
4. Abre el panel 📚 Tesauro, arrastra un campo sobre la misma conexión y comprueba el relleno automático.
5. Guarda el flujo con **💾 Guardar JSON** para conservar ficha, tesauro y asignaciones.

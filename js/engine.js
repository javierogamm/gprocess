/* ============================================================
   ENGINE.JS
   Lógica de datos:
   - Crear nodos
   - Crear conexiones
   - Gestión de selección (nodos y conexiones)
   - Almacenamiento del flujo con Undo/Redo
============================================================ */

const Engine = {

    /* -------------------------------------------
       ESTRUCTURA PRINCIPAL DE DATOS DEL FLUJO
    -------------------------------------------- */
    data: {
        nodos: [],
        conexiones: []
    },
// FICHA
fichaProyecto: {
    procedimiento: "",
    actividad: "",
    descripcion: ""
},

    /* -------------------------------------------
       CONTROL DE SELECCIÓN
    -------------------------------------------- */
    selectedNodeId: null,
    selectedConnectionId: null,

    /* -------------------------------------------
       GENERADOR DE IDS
    -------------------------------------------- */
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    },

    /* ============================================================
       CREAR UN NODO
    ============================================================ */
    createNode(tipo) {
    const nodo = {
        id: "n" + this.generateId(),
        tipo: tipo,
        titulo: tipo.toUpperCase(),
        tareaManual: false,   // NUEVO
        asignadoA: "",
        annex: "",
        pregunta: "",
        x: 100,
        y: 100,
        width: 120,
        height: 50,
        salidas: [] // para decisiones
    };

    // 🎨 Personalización especial para el tipo "notas"
    if (tipo === "notas") {
        nodo.titulo = "Nota";
        nodo.esNota = true; // ⚠️ bandera para excluir en exportaciones
    }
    if (tipo === "circuito") {
        nodo.height = 100;
    }
    this.data.nodos.push(nodo);
    Renderer.renderNode(nodo);
    this.saveHistory();

    return nodo;
},

    /* ============================================================
   EXPORTAR TODO EL DIAGRAMA A JSON
============================================================ */
exportToJSON() {

    // -------------------------------------------
    // 1️⃣ Construir estructura completa del JSON
    // -------------------------------------------
    const full = {
        fichaProyecto: this.fichaProyecto,
        nodos: this.data.nodos,
        conexiones: this.data.conexiones
    };

    const dataString = JSON.stringify(full, null, 2);

    // -------------------------------------------
    // 2️⃣ Obtener nombre del proceso
    // -------------------------------------------
    let nombreProceso = this.fichaProyecto.procedimiento?.trim() || "SinNombre";

    // Limpieza: evitar caracteres ilegales en nombres de archivo
    nombreProceso = nombreProceso.replace(/[\\\/:*?"<>|]/g, "_");

    // -------------------------------------------
    // 3️⃣ Obtener fecha AAAAMMDD-HHMMSS
    // -------------------------------------------
    const now = new Date();

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const fecha = `${yyyy}${mm}${dd}:${hh}-${mi}-${ss}`;

    // -------------------------------------------
    // 4️⃣ Construir nombre final del archivo
    // -------------------------------------------
    const nombreArchivo = `Proceso - ${nombreProceso} - ${fecha}.json`;

    // -------------------------------------------
    // 5️⃣ Crear archivo descargable
    // -------------------------------------------
    const blob = new Blob([dataString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("💾 Diagrama exportado correctamente como:", nombreArchivo);
},


/* ============================================================
   IMPORTAR JSON COMPLETO Y RECONSTRUIR EL DIAGRAMA
============================================================ */
importFromJSON(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);

        if (!parsed) {
            alert("❌ JSON no válido.");
            return;
        }

        // -------------------------------
        // 1️⃣ FICHA DEL PROYECTO (nuevo)
        // -------------------------------
        if (parsed.fichaProyecto) {
            this.fichaProyecto = {
                procedimiento: parsed.fichaProyecto.procedimiento || "",
                actividad: parsed.fichaProyecto.actividad || "",
                descripcion: parsed.fichaProyecto.descripcion || "",
            };

            // Actualizar título visible en el canvas
            const titleDiv = document.getElementById("projectTitle");
            if (titleDiv) {
                titleDiv.innerText = this.fichaProyecto.procedimiento || "";
            }
        } else {
            // Si no viene en el JSON, asegurar estructura
            this.fichaProyecto = {
                procedimiento: "",
                actividad: "",
                descripcion: ""
            };
        }

        // -------------------------------
        // 2️⃣ Validar nodos y conexiones
        // -------------------------------
        if (!parsed.nodos || !parsed.conexiones) {
            alert("❌ JSON sin nodos o conexiones.");
            return;
        }

        // 3️⃣ Guardar estado previo para undo
        this.saveHistory();

        // -------------------------------
        // 4️⃣ Cargar datos en memoria
        // -------------------------------
        this.data = {
            nodos: parsed.nodos,
            conexiones: parsed.conexiones
        };

        // -------------------------------
        // 5️⃣ Limpiar todo lo visual
        // -------------------------------
        Renderer.clearAll();

        // -------------------------------
        // 6️⃣ Renderizar nodos
        // -------------------------------
        this.data.nodos.forEach(nodo => {
            Renderer.renderNode(nodo);
        });

        // -------------------------------
        // 7️⃣ Dibujar conexiones
        // -------------------------------
        this.data.conexiones.forEach(conn => {
            Renderer.drawConnection(conn);
        });

        // -------------------------------
        // 8️⃣ Guardar nuevo estado
        // -------------------------------
        this.saveHistory();

        // -------------------------------
        // 9️⃣ Limpiar panel derecho
        // -------------------------------
        UI.clear();

        console.log("✅ Diagrama importado correctamente (incluyendo ficha del proyecto).");

    } catch (err) {
        console.error("❌ Error al importar JSON:", err);
        alert("Error al importar el archivo JSON. Revisa la consola.");
    }
},

/* ============================================================
   ACTUALIZAR TODAS LAS CONEXIONES (al mover nodos)
============================================================ */
updateConnections() {
    if (typeof Renderer !== "undefined" && Renderer.redrawConnections) {
        Renderer.redrawConnections();
    }
},
    /* ============================================================
       OBTENER NODO / CONEXIÓN POR ID
    ============================================================ */
    getNode(id) {
        return this.data.nodos.find(n => n.id === id);
    },
    getConnection(id) {
        return this.data.conexiones.find(c => c.id === id);
    },

    /* ============================================================
       SELECCIÓN DE ELEMENTOS
    ============================================================ */
    selectNode(id) {
        this.selectedNodeId = id;
        this.selectedConnectionId = null;
        UI.showNodeProperties(id);
    },

    selectConnection(connId) {
        this.selectedConnectionId = connId;
        this.selectedNodeId = null;
    
        const conn = this.getConnection(connId);
        if (!conn) return;
    
        UI.showConnectionProperties(connId);
        Renderer.showConnectionHandles(conn); // 👈 mostrar los drag handles
    },
    /* ============================================================
       CREAR CONEXIÓN ENTRE NODOS
    ============================================================ */
    createConnection(fromId, toId, fromPos, toPos) {
        const fromNode = this.getNode(fromId);
        const toNode = this.getNode(toId);
        if (!fromNode || !toNode) return;
        if (!fromPos || !toPos) return;

        const existing = this.data.conexiones.find(
            c => c.from === fromId &&
                 c.to === toId &&
                 c.fromPos === fromPos &&
                 c.toPos === toPos
        );
        if (existing) return existing;

        const conn = {
            id: "c" + this.generateId(),
            from: fromId,
            to: toId,
            fromPos: fromPos,
            toPos: toPos,
            condicionNombre: "",
            condicionValor: "",
            cambioEstado: "" // ✅ nuevo campo

        };

        this.data.conexiones.push(conn);
        Renderer.drawConnection(conn);
        this.saveHistory();
        return conn;
    },

    /* ============================================================
       ACTUALIZAR DATOS
    ============================================================ */
    updateConnectionCondition(connId, nombre, valor) {
        const conn = this.getConnection(connId);
        if (!conn) return;
        conn.condicionNombre = nombre;
        conn.condicionValor = valor;
        Renderer.redrawConnections();
        this.saveHistory();
    },
    updateConnectionCambioEstado(connId, nuevoEstado) {
        const conn = this.getConnection(connId);
        if (!conn) return;
        conn.cambioEstado = nuevoEstado;
        this.saveHistory();
    },

    updateNode(id, props) {
        const nodo = this.getNode(id);
        if (!nodo) return;
    
        // Solo estos dos afectan al contenido visual
        let requiereActualizarTexto = false;
    
        if (props.titulo !== undefined) {
            nodo.titulo = props.titulo;
            requiereActualizarTexto = true;
        }
    
        if (props.descripcion !== undefined) {
            nodo.descripcion = props.descripcion;
            requiereActualizarTexto = true;
        }
    
        // 🔥 Esto NO afecta a la forma, altura ni texto
        if (props.tareaManual !== undefined) {
            nodo.tareaManual = props.tareaManual;
        }
        if (props.asignadoA !== undefined) {
            nodo.asignadoA = props.asignadoA;
        }
        // Solo actualiza texto si es necesario
        if (requiereActualizarTexto) {
            Renderer.updateNodeLabel(id);
        }
    
        this.saveHistory();
    },
    
    /* ============================================================
       BORRAR NODO (y sus conexiones)
    ============================================================ */
    deleteNode(id) {
        const nodo = this.getNode(id);
        if (!nodo) {
            console.warn("⚠️ Nodo no encontrado:", id);
            return;
        }

        this.saveHistory();

        // Borrar conexiones relacionadas
        this.data.conexiones = this.data.conexiones.filter(
            c => c.from !== id && c.to !== id
        );

        // Borrar nodo del modelo
        this.data.nodos = this.data.nodos.filter(n => n.id !== id);

        // Actualizar visual
        Renderer.clearAll();
        this.data.nodos.forEach(n => Renderer.renderNode(n));
        Renderer.redrawConnections();

        this.saveHistory();
        console.log(`🗑️ Nodo '${nodo.titulo}' (${id}) eliminado correctamente.`);
    },

    /* ============================================================
       BORRAR CONEXIÓN (con Undo/Redo)
    ============================================================ */
    deleteConnection(connId) {
        const conn = this.getConnection(connId);
        if (!conn) {
            console.warn("⚠️ Conexión no encontrada:", connId);
            return;
        }

        this.saveHistory();

        // Eliminar del modelo
        this.data.conexiones = this.data.conexiones.filter(c => c.id !== connId);

        // Redibujar sin esa conexión
        Renderer.redrawConnections();

        this.saveHistory();
        Renderer.hideConnectionHandles();
        console.log(`🧹 Conexión ${connId} eliminada correctamente.`);
    },

    /* ============================================================
       ELIMINAR ELEMENTO SELECCIONADO
    ============================================================ */
    deleteSelected() {
        if (this.selectedNodeId) {
            this.deleteNode(this.selectedNodeId);
            this.selectedNodeId = null;
        } else if (this.selectedConnectionId) {
            this.deleteConnection(this.selectedConnectionId);
            this.selectedConnectionId = null;
        }
        UI.clear();
    },
    /* ============================================================
      FICHA DESCRIPTIVA
    ============================================================ */

    updateFichaProyecto(data) {
        if (data.procedimiento !== undefined)
            this.fichaProyecto.procedimiento = data.procedimiento;
    
        if (data.actividad !== undefined)
            this.fichaProyecto.actividad = data.actividad;
    
        if (data.descripcion !== undefined)
            this.fichaProyecto.descripcion = data.descripcion;
    
        // ACTUALIZA TÍTULO
        const titleDiv = document.getElementById("projectTitle");
        if (titleDiv) {
            titleDiv.innerText = this.fichaProyecto.procedimiento || "";
        }
    
        this.save();
    },
    /* ============================================================
       HISTORIAL (Undo / Redo)
    ============================================================ */
    history: [],
    future: [],

    saveHistory() {
        const snapshot = JSON.stringify(this.data);
        this.history.push(snapshot);
        if (this.history.length > 50) this.history.shift();
        this.future = [];
        // console.log(`💾 Guardado: ${this.history.length}`);
    },

    undo() {
        if (this.history.length < 2) {
            console.log("⚠️ Nada que deshacer.");
            return;
        }

        const current = this.history.pop();
        this.future.push(current);

        const prev = this.history[this.history.length - 1];
        if (prev) this.loadFromSnapshot(prev);
    },

    redo() {
        if (this.future.length === 0) {
            console.log("⚠️ Nada que rehacer.");
            return;
        }

        const next = this.future.pop();
        if (next) {
            this.history.push(next);
            this.loadFromSnapshot(next);
        }
    },

    loadFromSnapshot(snapshot) {
        const state = JSON.parse(snapshot);
        this.data = state;

        Renderer.clearAll();
        this.data.nodos.forEach(n => Renderer.renderNode(n));
        this.data.conexiones.forEach(c => Renderer.drawConnection(c));

        UI.clear();
    }

};
/* ============================================================
   EXPORTAR DIAGRAMA A CSV / EXCEL
============================================================ */
Engine.exportToCSV = function() {

    // --- 1️⃣ Nodos ---
    const nodosHeader = ["id", "tipo", "titulo", "descripcion", "pregunta", "x", "y", "width", "height"];
    const nodosRows = this.data.nodos
    .filter(n => n.tipo !== "decisionR")
    .map(n => [        n.id,
        n.tipo,
        (n.titulo || "").replace(/\n/g, " "),
        (n.descripcion || "").replace(/\n/g, " "),
        (n.pregunta || "").replace(/\n/g, " "),
        n.x,
        n.y,
        n.width,
        n.height
    ]);

    const nodosCSV = [nodosHeader.join(";"), ...nodosRows.map(r => r.join(";"))].join("\n");

    // --- 2️⃣ Conexiones ---
    const connHeader = ["id", "from", "to", "fromPos", "toPos", "condicionNombre", "condicionValor"];
    const connRows = this.data.conexiones.map(c => [
        c.id,
        c.from,
        c.to,
        c.fromPos,
        c.toPos,
        (c.condicionNombre || "").replace(/\n/g, " "),
        (c.condicionValor || "").replace(/\n/g, " ")
    ]);

    const connCSV = [connHeader.join(";"), ...connRows.map(r => r.join(";"))].join("\n");

    // --- 3️⃣ Crear ZIP temporal o dos archivos separados ---
    const zip = new Blob(
        [ 
            "### NODOS ###\n" + nodosCSV + "\n\n### CONEXIONES ###\n" + connCSV
        ], 
        { type: "text/csv;charset=utf-8;" }
    );

    // --- 4️⃣ Forzar descarga ---
    const url = URL.createObjectURL(zip);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Diagrama.csv";
    a.click();
    URL.revokeObjectURL(url);

    console.log("📤 Diagrama exportado correctamente (Diagrama.csv)");
};
/* ============================================================
   IMPORTAR DIAGRAMA DESDE CSV (formato exportToCSV)
============================================================ */
Engine.importFromCSV = async function(file) {
    try {
        // 1️⃣ Leer contenido del archivo
        const text = await file.text();

        // 2️⃣ Separar secciones
        const [nodosPart, conexionesPart] = text.split("### CONEXIONES ###");
        const nodosLines = nodosPart.split("\n").filter(l => l && !l.startsWith("### NODOS ###"));
        const connLines = conexionesPart ? conexionesPart.split("\n").filter(l => l.trim()) : [];

        // 3️⃣ Parsear NODOS
        const nodosHeader = nodosLines[0].split(";");
        const nodos = nodosLines.slice(1).map(line => {
            const cols = line.split(";");
            const obj = {};
            nodosHeader.forEach((h, i) => obj[h] = cols[i]);
            return {
                id: obj.id,
                tipo: obj.tipo,
                titulo: obj.titulo || "",
                descripcion: obj.descripcion || "",
                pregunta: obj.pregunta || "",
                x: parseFloat(obj.x) || 100,
                y: parseFloat(obj.y) || 100,
                width: parseFloat(obj.width) || 200,
                height: parseFloat(obj.height) || 100,
                salidas: []
            };
        });

        // 4️⃣ Parsear CONEXIONES
        const conn = [];
        if (connLines.length > 1) {
            const connHeader = connLines[0].split(";");
            connLines.slice(1).forEach(line => {
                const cols = line.split(";");
                const obj = {};
                connHeader.forEach((h, i) => obj[h] = cols[i]);
                if (obj.id && obj.from && obj.to) {
                    conn.push({
                        id: obj.id,
                        from: obj.from,
                        to: obj.to,
                        fromPos: obj.fromPos,
                        toPos: obj.toPos,
                        condicionNombre: obj.condicionNombre || "",
                        condicionValor: obj.condicionValor || ""
                    });
                }
            });
        }

        // 5️⃣ Cargar en memoria
        this.data = { nodos, conexiones: conn };

        // 6️⃣ Redibujar todo
        Renderer.clearAll();
        nodos.forEach(n => Renderer.renderNode(n));
        conn.forEach(c => Renderer.drawConnection(c));

        UI.clear();
        this.saveHistory();

        console.log("✅ Diagrama importado correctamente desde CSV");
    } catch (err) {
        console.error("❌ Error importando CSV:", err);
        alert("Error importando el CSV. Ver consola para detalles.");
    }
};
/* ============================================================
   EXPORTAR TAREAS Y CONDICIONES (formato flujo normalizado)
============================================================ */
Engine.exportFlujoCSV = function() {

    // --- 1️⃣ Ordenar visualmente los nodos (por Y y luego X)
    const sortedNodes = [...this.data.nodos].sort((a, b) => {
        if (a.y === b.y) return a.x - b.x;
        return a.y - b.y;
    });

    // --- 2️⃣ Crear TAREAS (formato ampliado oficial) ---
    const headerTareas = [
        "Nombre Entidad","Nombre Actividad","Nombre Procedimiento","Sobrescribir",
        "Tipo Tarea","Nombre Tarea","Días Alerta","Tipo de días","Prioritario",
        "Descripción Tarea","Asignado a Usuario - Nombre","Asignado a Grupo - Nombre",
        "Asignado a responsables exp","Asignado a unidad gestora","Asignado a Usuario - Abre Tarea",
        "Asignado a Usuario - Abre Exp","Permite reasignar","Inicio Inmediato","Condición inicio inmediato",
        "Nombre tesauro","Condición tesauro","Valor tesauro","Inicio manual","Acceso temporal Expediente",
        "Plazo Trámite","Plazo Justificante","Tipo documental","Tipo Circuito Resolución","Nombre Circuito Resolución",
        "Órgano Circuito Resolución","Cambiar estado","Nombre Nuevo Estado","Generar plantilla","Formato plantilla",
        "Cargar documento","Circuito documento","Titulo documento","Tipo documental documento","Texto plantilla",
        "Eliminar","Finalizar en plazo","Plazo - Número de días","Plazo - Tipo de días"
    ];

    const tareasRows = sortedNodes.map((n) => {
        let tipoTarea = n.tipo.toLowerCase();
        if (tipoTarea === "circuito") tipoTarea = "Circuito de Resolución";
        else if (tipoTarea === "decisión" || tipoTarea === "decision") tipoTarea = "Formulario";
        else tipoTarea = capitalizeFirst(tipoTarea);

        return [
            "", // Nombre Entidad
            this.fichaProyecto.actividad || "", // Nombre Actividad
            this.fichaProyecto.procedimiento || "", // Nombre Procedimiento
            "", // Sobrescribir
            tipoTarea, // Tipo Tarea
            cleanText(n.titulo || ""), // Nombre Tarea
            "", "", "", // Días Alerta, Tipo de días, Prioritario
            cleanHTML(n.descripcion || ""), // ✅ Descripción Tarea (limpia HTML)
            "", "", "", // Asignado a Usuario - Nombre, Grupo, responsables exp
            cleanText(n.asignadoA || ""), // Asignado a unidad gestora
            "", "", "", "", "", "", "", "", // campos intermedios vacíos
            n.tareaManual ? "Sí" : "No", // ✅ Inicio manual (Sí/No)
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        ];
    });

    const csvTareas = [headerTareas.join(";"), ...tareasRows.map(r => r.join(";"))].join("\n");

            // --- 3️⃣ Crear CONDICIONES (formato oficial de condiciones de flujo) ---
            const headerConds = [
                "Nombre Entidad",
                "Nombre Actividad",
                "Nombre Procedimiento",
                "Nombre Tarea",
                "Eliminar bloques existentes",
                "Id Bloque",
                "Bloque",
                "Nombre tesauro",
                "Condición",
                "Valor",
                "Acción",
                "Estado/Tarea"
            ];

            const condRows = [];

            this.data.conexiones.forEach((c) => {
                const fromNode = this.data.nodos.find(n => n.id === c.from);
                const toNode = this.data.nodos.find(n => n.id === c.to);
                if (!fromNode || !toNode) return;

                const nombreOrigen = cleanText(fromNode.titulo || "");
                const nombreDestino = cleanText(toNode.titulo || "");

                // Determinar bloque condicional
                const bloque = (c.condicionNombre || c.condicionValor) ? "Sólo si" : "En todo caso";
                const idBloque = bloque === "Sólo si"
                    ? (condRows.filter(r => r[3] === nombreOrigen && r[6] === "Sólo si").length + 1)
                    : "";

                // 🟩 1️⃣ Fila normal → Lanzar tarea
                condRows.push([
                    "", // Nombre Entidad
                    this.fichaProyecto.actividad || "", // Nombre Actividad
                    this.fichaProyecto.procedimiento || "", // Nombre Procedimiento
                    nombreOrigen, // Nombre Tarea (origen)
                    "", // Eliminar bloques existentes
                    idBloque, // Id Bloque
                    bloque, // Bloque ("Sólo si" / "En todo caso")
                    cleanText(c.condicionNombre || ""), // Nombre tesauro
                    (c.condicionNombre || c.condicionValor) ? "Es igual a" : "", // Condición
                    cleanText(c.condicionValor || ""), // Valor
                    "Lanzar tarea", // Acción
                    nombreDestino // Estado/Tarea (tarea destino)
                ]);

                // 🟨 2️⃣ Si hay cambio de estado → segunda fila
                if (c.cambioEstado && c.cambioEstado.trim() !== "") {
                    condRows.push([
                        "", // Nombre Entidad
                        this.fichaProyecto.actividad || "", // Nombre Actividad
                        this.fichaProyecto.procedimiento || "", // Nombre Procedimiento
                        nombreOrigen, // Nombre Tarea (origen)
                        "", // Eliminar bloques existentes
                        idBloque, // mismo bloque
                        bloque,
                        cleanText(c.condicionNombre || ""),
                        (c.condicionNombre || c.condicionValor) ? "Es igual a" : "",
                        cleanText(c.condicionValor || ""),
                        "Cambiar estado", // ✅ Acción alternativa
                        cleanText(c.cambioEstado) // ✅ Estado/Tarea = texto del nuevo estado
                    ]);
                }
            });

            const csvConds = [headerConds.join(";"), ...condRows.map(r => r.join(";"))].join("\n");
            downloadCSV(csvConds, "Condiciones.csv");

    // --- 4️⃣ Descargar ambos archivos ---
    downloadCSV(csvTareas, "Tareas.csv");
    downloadCSV(csvConds, "Condiciones.csv");

    console.log("📤 Exportación completada: Tareas.csv + Condiciones.csv");

    // --- Helpers internos ---
    function cleanText(t) {
        return (t || "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }

    function cleanHTML(html) {
        if (!html) return "";
        return html
            .replace(/<\/?[^>]+(>|$)/g, "") // elimina todas las etiquetas HTML
            .replace(/\s+/g, " ")           // elimina espacios duplicados
            .trim();
    }

    function capitalizeFirst(txt) {
        if (!txt) return "";
        return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
    }

    function downloadCSV(content, name) {
        // 🔥 Añadimos BOM UTF-8 para compatibilidad total con Excel
        const bom = "\uFEFF";
        const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    }
};


/* ============================================================
   IMPORTAR FLUJO DESDE CSV NORMALIZADO (Tareas.csv + Condiciones.csv)
============================================================ */
Engine.importFlujoCSV = async function(files) {
    try {
        let tareasFile = null;
        let condicionesFile = null;

        // 1️⃣ Identificar qué archivo es cuál
        for (const f of files) {
            const name = f.name.toLowerCase();
            if (name.includes("tarea")) tareasFile = f;
            if (name.includes("cond")) condicionesFile = f;
        }

        if (!tareasFile || !condicionesFile) {
            alert("❌ Debes seleccionar ambos archivos: Tareas.csv y Condiciones.csv");
            return;
        }

        // 2️⃣ Leer contenido de ambos CSV
        const tareasText = await tareasFile.text();
        const condicionesText = await condicionesFile.text();

        // 3️⃣ Parsear TAREAS
        const tareasLines = tareasText.split(/\r?\n/).filter(l => l.trim());
        const headerT = tareasLines[0].split(";");
        const tareas = tareasLines.slice(1).map(line => {
            const cols = line.split(";");
            const obj = {};
            headerT.forEach((h, i) => obj[h.trim()] = cols[i] ? cols[i].trim() : "");
            return obj;
        });

        // 4️⃣ Parsear CONDICIONES
        const condLines = condicionesText.split(/\r?\n/).filter(l => l.trim());
        const headerC = condLines[0].split(";");
        const condiciones = condLines.slice(1).map(line => {
            const cols = line.split(";");
            const obj = {};
            headerC.forEach((h, i) => obj[h.trim()] = cols[i] ? cols[i].trim() : "");
            return obj;
        });

        // 5️⃣ Reiniciar diagrama actual
        this.saveHistory();
        this.data = { nodos: [], conexiones: [] };
        Renderer.clearAll();

        // 6️⃣ Crear NODOS (con limpieza del tipo)
        const nodosMap = {}; // nombre tarea → id nodo
        const baseX = 200;
        const baseY = 100;
        const stepY = 180;
        const stepX = 250;

        tareas.forEach((t, i) => {
            const rawTipo = (t["Tipo Tarea"] || "tarea").trim();
            const tipoSafe = rawTipo.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
            const tipoVisible = rawTipo.charAt(0).toUpperCase() + rawTipo.slice(1).toLowerCase();
            const n = {
                id: "n" + this.generateId(),
                tipo: tipoSafe,
                tipoVisible: tipoVisible,
                titulo: t["Nombre Tarea"] || ("Tarea " + (i + 1)),
                annex: "",
                pregunta: "",
                x: baseX + (i % 3) * stepX,
                y: baseY + Math.floor(i / 3) * stepY,
                width: 200,
                height: 100,
                salidas: [],
                tareaManual: (t["¿Tarea Manual?"] || "").toLowerCase().startsWith("s"),
                asignadoA: t["Asignado A"] || ""    // ✅ nuevo
            };

            this.data.nodos.push(n);
            nodosMap[n.titulo.trim()] = n.id;
        });

        // Renderizar todos los nodos
        this.data.nodos.forEach(n => Renderer.renderNode(n));

        // 7️⃣ Crear CONEXIONES
        condiciones.forEach((c, i) => {
            const origen = (c["Nombre Tarea"] || "").trim();
            const destino = (c["Estado/Tarea"] || "").trim();
            if (!origen || !destino) return;

            const fromId = nodosMap[origen];
            const toId = nodosMap[destino];
            if (!fromId || !toId) {
                console.warn(`⚠️ No se encontró nodo para conexión ${origen} → ${destino}`);
                return;
            }

            const nombreCond = c["Nombre tesauro"] || c["Condición"] || "";
            const valorCond = c["Valor"] || "";

            const conn = {
                id: "c" + this.generateId(),
                from: fromId,
                to: toId,
                fromPos: "bottom",
                toPos: "top",
                condicionNombre: nombreCond,
                condicionValor: valorCond
            };

            this.data.conexiones.push(conn);
        });

        // 8️⃣ Dibujar conexiones
        this.data.conexiones.forEach(c => Renderer.drawConnection(c));

        // 9️⃣ Guardar estado y limpiar paneles
        this.saveHistory();
        UI.clear();

        console.log("✅ Flujo importado correctamente desde CSV normalizado.");
        alert("✅ Flujo importado correctamente desde Tareas + Condiciones.");

    } catch (err) {
        console.error("❌ Error al importar flujo normalizado:", err);
        alert("Error al importar el flujo. Revisa la consola para más detalles.");
    }
};
// Escucha clic del botón
document.getElementById("btnImportFlujo").addEventListener("click", () => {
    const input = document.getElementById("inputFlujoCSV");
    input.value = ""; // limpiar selección anterior
    input.click();    // abrir selector de archivos
});

// Escucha selección de archivos CSV
document.getElementById("inputFlujoCSV").addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    Engine.importFlujoCSV(files); // 👈 usa la función que te di antes
});


// VISUALIZACIÓN DE TAREAS
document.getElementById("btnVerCSV").addEventListener("click", () => {
    Engine.showCSVPreview();
});

Engine.showCSVPreview = function() {

    const modal = document.getElementById("csvModal");
    const content = document.getElementById("csvContent");

    // --- Generar las dos tablas como texto HTML ---
    const sortedNodes = [...this.data.nodos]
    .filter(n => n.tipo !== "decisionR")
    .sort((a,b) => a.y - b.y || a.x - b.x);    const tareas = sortedNodes.map((n, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${n.tipo.charAt(0).toUpperCase() + n.tipo.slice(1).toLowerCase()}</td>
            <td>${n.titulo || ""}</td>
            <td>${n.tareaManual ? "Sí" : "No"}</td>
            <td>${n.asignadoA || ""}</td>
        </tr>
    `).join("");

    const conexiones = this.data.conexiones.map((c, i) => {
        const from = this.getNode(c.from);
        const to = this.getNode(c.to);
        return `
            <tr>
                <td>${from?.titulo || ""}</td>
                <td>${(c.condicionNombre || c.condicionValor) ? "Sólo si" : "En todo caso"}</td>
                <td>${c.condicionNombre || ""}</td>
                <td>${c.condicionValor || ""}</td>
                <td>${to?.titulo || ""}</td>
            </tr>
        `;
    }).join("");

    

    content.innerHTML = `
    <h2 style="margin-top:0; text-align:center;">
        🧾 ${this.fichaProyecto.procedimiento || "Sin nombre de procedimiento"}
    </h2>

    <h3>📋 Tareas</h3>        
    <table>
        <thead>
            <tr><th>#</th><th>Tipo</th><th>Nombre</th><th>Manual</th><th>Asignado A</th></tr>
        </thead>
        <tbody>${tareas}</tbody>
    </table>

    <h3>🔗 Condiciones</h3>
    <table>
        <thead>
            <tr><th>Tarea Origen</th><th>Bloque</th><th>Condición</th><th>Valor</th><th>Tarea Destino</th></tr>
        </thead>
        <tbody>${conexiones}</tbody>
    </table>

    <h3>🟢 Cambios de estado</h3>
    <table>
        <thead>
            <tr><th>Tarea Origen</th><th>Condición</th><th>Estado adquirido</th></tr>
        </thead>
        <tbody>
            ${this.data.conexiones
                .filter(c => c.cambioEstado && c.cambioEstado.trim() !== "")
                .map(c => {
                    const from = this.getNode(c.from);
                    const condTxt = [c.condicionNombre, c.condicionValor]
                        .filter(Boolean).join(" ");
                    return `
                        <tr>
                            <td>${from?.titulo || ""}</td>
                            <td>${condTxt || "En todo caso"}</td>
                            <td>${c.cambioEstado}</td>
                        </tr>
                    `;
                }).join("")}
        </tbody>
    </table>
`;


    modal.classList.remove("hidden");
};

document.getElementById("csvCerrar").addEventListener("click", () => {
    document.getElementById("csvModal").classList.add("hidden");
});
document.getElementById("btnExportDocx").addEventListener("click", () => {
    Engine.exportToDOCX();
});

Engine.exportToDOCX = async function() {
    // 🔒 Cargar docx si no está en window
    let docxLib = window.docx;
    if (!docxLib) {
        try {
            console.warn("⚙️ Cargando docx manualmente desde CDN...");
            const mod = await import("https://cdn.jsdelivr.net/npm/docx@8.0.0/+esm");
            docxLib = mod;
            window.docx = mod;
        } catch (err) {
            alert("❌ No se pudo cargar la librería DOCX.");
            console.error("Error importando docx:", err);
            return;
        }
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, PageBreak, AlignmentType } = docxLib;

// --- 1️⃣ CAPTURAR ZONA COMPLETA DEL DIAGRAMA (nodos + conexiones) ---
const containerNodes = document.getElementById("nodesContainer");
const svgConnections = document.getElementById("svgConnections");
const nodes = this.data.nodos;

if (!nodes.length) {
    alert("⚠️ No hay nodos en el diagrama.");
    return;
}

// Calcular tamaño real ocupado por los nodos
let maxRight = 0, maxBottom = 0;
nodes.forEach(n => {
    const right = n.x + n.width;
    const bottom = n.y + n.height;
    if (right > maxRight) maxRight = right;
    if (bottom > maxBottom) maxBottom = bottom;
});

// Crear un contenedor temporal que combine SVG + Nodos
const wrapper = document.createElement("div");
wrapper.style.position = "absolute";
wrapper.style.left = "-9999px";
wrapper.style.top = "0";
wrapper.style.width = (maxRight + 100) + "px";
wrapper.style.height = (maxBottom + 100) + "px";
wrapper.style.background = "#f3f4f6";
wrapper.style.overflow = "visible";

// Clonar el SVG de conexiones (manteniendo sus estilos)
const svgClone = svgConnections.cloneNode(true);
svgClone.style.position = "absolute";
svgClone.style.left = "0";
svgClone.style.top = "0";
svgClone.style.width = "100%";
svgClone.style.height = "100%";
svgClone.style.overflow = "visible";

// Clonar el contenedor de nodos
const nodesClone = containerNodes.cloneNode(true);
nodesClone.style.position = "absolute";
nodesClone.style.left = "0";
nodesClone.style.top = "0";

// Añadir ambos al wrapper
wrapper.appendChild(svgClone);
wrapper.appendChild(nodesClone);
document.body.appendChild(wrapper);

// Capturar con html2canvas todo el wrapper
const canvasFull = await html2canvas(wrapper, {
    backgroundColor: "#f3f4f6",
    scale: 1,
    useCORS: true
});

// Limpiar el wrapper temporal
document.body.removeChild(wrapper);

// Convertir a bytes para docx
const imgData = canvasFull.toDataURL("image/png");
const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());

    // --- 2️⃣ DATOS DE FICHA ---
    const ficha = this.fichaProyecto;
    const titulo = ficha.procedimiento || "Procedimiento sin nombre";
    const actividad = ficha.actividad || "";
    const descripcion = ficha.descripcion || "";

    // --- 3️⃣ TABLAS DE TAREAS Y CONDICIONES ---
    const formatTipo = (txt) => txt.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
    const sortedNodes = [...this.data.nodos].sort((a,b) => a.y - b.y || a.x - b.x);

    const tareasRows = [
        new TableRow({
            children: ["#", "Tipo", "Nombre", "Manual", "Asignado A"].map(h =>
                new TableCell({ children: [new Paragraph({ text: h, bold: true })] })
            )
        }),
        ...sortedNodes.map((n, i) =>
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(String(i + 1))] }),
                    new TableCell({ children: [new Paragraph(formatTipo(n.tipo))] }),
                    new TableCell({ children: [new Paragraph(n.titulo || "")] }),
                    new TableCell({ children: [new Paragraph(n.tareaManual ? "Sí" : "No")] }),
                    new TableCell({ children: [new Paragraph(n.asignadoA || "")] })
                ]
            })
        )
    ];

    const connRows = [
        new TableRow({
            children: ["Tarea Origen", "Bloque", "Condición", "Valor", "Tarea Destino"].map(h =>
                new TableCell({ children: [new Paragraph({ text: h, bold: true })] })
            )
        }),
        ...this.data.conexiones.map(c => {
            const from = this.getNode(c.from);
            const to = this.getNode(c.to);
            const bloque = (c.condicionNombre || c.condicionValor) ? "Sólo si" : "En todo caso";
            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(from?.titulo || "")] }),
                    new TableCell({ children: [new Paragraph(bloque)] }),
                    new TableCell({ children: [new Paragraph(c.condicionNombre || "")] }),
                    new TableCell({ children: [new Paragraph(c.condicionValor || "")] }),
                    new TableCell({ children: [new Paragraph(to?.titulo || "")] })
                ]
            });
        })
    ];

    // --- 4️⃣ CONSTRUIR DOCUMENTO ---
const doc = new Document({
    styles: {
        default: {
            document: {
                run: { font: "Calibri", size: 22 }, // 11 pt
                paragraph: { spacing: { after: 200 } }
            }
        }
    },
    sections: [
        // 📘 Página 1 — Ficha descriptiva
        {
            children: [
                new Paragraph({
                    text: titulo,
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    style: "Title"
                }),
                new Paragraph({
                    text: "Actividad: " + actividad,
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),
                new Paragraph({
                    text: "Descripción del procedimiento",
                    bold: true,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                    text: descripcion,
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 400 }
                }),
             
            ]
        },

       // 🧩 Página 2 — Imagen del diagrama
{
    children: [
        new Paragraph({
            text: "Diagrama del proceso",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new ImageRun({
                    data: imgBytes,
                    // Escalar manteniendo proporciones exactas del canvas
                    transformation: {
                        width: 750, // ancho máximo en DOCX
                        height: (canvasFull.height / canvasFull.width) * 750
                    }
                })
            ]
        }),
        new Paragraph({ children: [new PageBreak()] })
    ]
},


        // 📊 Página 3 — Tablas de tareas y condiciones
        {
            children: [
                new Paragraph({
                    text: "Tareas",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 200 }
                }),
                new Table({
                    rows: tareasRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }),
                new Paragraph({
                    text: "Condiciones",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 200 }
                }),
                new Table({
                    rows: connRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                })
            ]
        }
    ]
}); // 👈 cierre del Document correctamente

    // --- 5️⃣ EXPORTAR ---
    const blob = await Packer.toBlob(doc);
    const nombreArchivo = `Proceso - ${titulo}.docx`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(a.href);

    console.log("📄 DOCX generado con formato mejorado:", nombreArchivo);
};

/* ============================================================
   PEGAR JSON MANUALMENTE DESDE EL PORTAPAPELES
============================================================ */
document.getElementById("btnPasteJSON").addEventListener("click", async () => {
    try {
        // Intentar leer desde el portapapeles si está permitido
        let jsonText = "";
        try {
            jsonText = await navigator.clipboard.readText();
        } catch {
            // Si el navegador no permite acceso directo, usar prompt
            jsonText = prompt("Pega aquí el JSON del diagrama:");
        }

        if (!jsonText) {
            alert("No se ha pegado ningún texto JSON.");
            return;
        }

        // Validar formato básico
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (e) {
            alert("❌ El texto no es un JSON válido.");
            return;
        }

        // Confirmar con el usuario
        const ok = confirm("¿Quieres reemplazar el diagrama actual con el JSON pegado?");
        if (!ok) return;

        // Reutilizar la función existente de importación
        Engine.importFromJSON(jsonText);
        alert("✅ JSON pegado y cargado correctamente.");
    } catch (err) {
        console.error("Error al pegar JSON:", err);
        alert("❌ No se pudo procesar el JSON. Revisa la consola.");
    }
});
/* ============================================================
   ABRIR ASISTENTE EXTERNO IA JSON
============================================================ */
document.getElementById("btnIAJson").addEventListener("click", () => {
    window.open(
        "https://chat.openai.com/g/g-6918f6f366d081918def86bc27f3c2b4-creador-json-gestiona-process",
        "_blank"
    );
});
/* ============================================================
   PAN CON BOTÓN DERECHO / RUEDA / CTRL + CLICK IZQUIERDO
============================================================ */
(function() {

    const area = document.getElementById("canvasArea");
    if (!area) return;

    let panning = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    area.addEventListener("mousedown", (e) => {
        const isRight = e.button === 2;
        const isMiddle = e.button === 1;
        const isCtrlLeft = (e.button === 0 && e.ctrlKey);

        if (isRight || isMiddle || isCtrlLeft) {
            e.preventDefault();
            panning = true;
            startX = e.clientX;
            startY = e.clientY;
            scrollLeft = area.scrollLeft;
            scrollTop = area.scrollTop;
            area.style.cursor = "grabbing"; // 🖐️ cambio visual
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (!panning) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        area.scrollLeft = scrollLeft - dx;
        area.scrollTop = scrollTop - dy;
    });

    window.addEventListener("mouseup", () => {
        if (panning) area.style.cursor = "default";
        panning = false;
    });

    // Evitar menú contextual con clic derecho
    area.addEventListener("contextmenu", (e) => e.preventDefault());

})();

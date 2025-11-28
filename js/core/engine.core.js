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
    descripcion: "",
    entidad: ""      // ⭐ NUEVO
},
// TESAURO (colección de campos personalizados)
tesauro: [],

// ⭐ NUEVO — POOL GLOBAL DE ASIGNACIONES
asignaciones: {
    grupos: new Set(),
    usuarios: new Set()
},
    /* -------------------------------------------
       CONTROL DE SELECCIÓN
    -------------------------------------------- */
    selectedNodeId: null,
    selectedConnectionId: null,
    resizeSelectionBaseline: new Map(),

    /* -------------------------------------------
       GENERADOR DE IDS
    -------------------------------------------- */
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    },

    /* ============================================================
       CREAR UN NODO
    ============================================================ */
   createNode(tipo, x = null, y = null) {
    // 🔹 Si no se pasan coordenadas (clic normal), centramos como antes
    if (x === null || y === null) {
        x = 100;
        y = 100;

        const area = document.getElementById("canvasArea");
        if (area && Renderer && Renderer.container) {
            const rectArea   = area.getBoundingClientRect();
            const rectCanvas = Renderer.container.getBoundingClientRect();

            // Centro visible en pantalla
            const centerScreenX = rectArea.left + rectArea.width  / 2;
            const centerScreenY = rectArea.top  + rectArea.height / 2;

            const baseWidth  = 144;
            const baseHeight = 68;

            // Pasar a coordenadas del canvas y centrar el nodo
            let nx = centerScreenX - rectCanvas.left - baseWidth  / 2;
            let ny = centerScreenY - rectCanvas.top  - baseHeight / 2;

            // 🧲 Encajar a la rejilla (si existe)
            const grid = (window.Interactions && Interactions.GRID_SIZE) ? Interactions.GRID_SIZE : 20;
            nx = Math.round(nx / grid) * grid;
            ny = Math.round(ny / grid) * grid;

            x = nx;
            y = ny;
        }
    }

    // =======================================================
    // CREACIÓN DEL NODO
    // =======================================================
    const nodo = {
        id: "n" + this.generateId(),
        tipo,
        titulo: tipo.toUpperCase(),
        tareaManual: false,
        asignadosGrupos: [],      // ⭐ Ahora es un array
        asignadosUsuarios: [],    // ⭐ Ahora es un array
        annex: "",
        pregunta: "",
        x,
        y,
        width: 144,
        height: 68,

    };

    // 🎨 Personalización especial para algunos tipos
    if (tipo === "notas") {
        nodo.titulo = "Nota";
        nodo.esNota = true; // ⚠️ bandera para excluir en exportaciones
    }
    if (tipo === "circuito") {
        nodo.height = 135;
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
const full = {
    fichaProyecto: this.fichaProyecto,

    // Tesauro (igual que antes)
    tesauro: (Array.isArray(this.tesauro) && this.tesauro.length > 0)
        ? this.tesauro.map(x => ({...x}))
        : (window.DataTesauro ? DataTesauro.campos.map(x => ({...x})) : []),

    // ⭐ NUEVO: Pool global de asignaciones
    asignaciones: {
        grupos: Array.from(this.asignaciones.grupos || []),
        usuarios: Array.from(this.asignaciones.usuarios || [])
    },

    nodos: this.data.nodos,
    conexiones: this.data.conexiones
};

      const dataString = JSON.stringify(full, null, 2);

    let nombreProceso = this.fichaProyecto.procedimiento?.trim() || "SinNombre";
    nombreProceso = nombreProceso.replace(/[\\\/:*?"<>|]/g, "_");

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const fecha = `${yyyy}${mm}${dd}_${hh}-${mi}-${ss}`;

    const nombreArchivo = `Proceso - ${nombreProceso} - ${fecha}.json`;

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
        if (!parsed) { alert("❌ JSON no válido."); return; }

        // 1) Ficha
        this.fichaProyecto = {
            procedimiento: parsed.fichaProyecto?.procedimiento || "",
            actividad:     parsed.fichaProyecto?.actividad     || "",
            descripcion:   parsed.fichaProyecto?.descripcion   || "",
            entidad:       parsed.fichaProyecto?.entidad       || ""
        };

        const titleDiv = document.getElementById("projectTitle");
        if (titleDiv) titleDiv.innerText = this.fichaProyecto.procedimiento || "";

        // 2) Validación
        if (!parsed.nodos || !parsed.conexiones) {
            alert("❌ JSON sin nodos o conexiones."); 
            return;
        }

        this.saveHistory();

        // 3) Validar y clonar nodos / conexiones
        const nodos = (parsed.nodos || []).map((nodo, idx) => {
            const safe = { ...nodo };
            safe.id = safe.id || `n${this.generateId()}_${idx}`;
            safe.tipo = safe.tipo || "formulario";
            safe.titulo = safe.titulo || safe.tipo.toUpperCase();
            safe.x = Number.isFinite(safe.x) ? safe.x : 100;
            safe.y = Number.isFinite(safe.y) ? safe.y : 100;
            safe.width = Number.isFinite(safe.width) ? safe.width : 144;
            safe.height = Number.isFinite(safe.height) ? safe.height : 68;
            return safe;
        });

        const conexiones = (parsed.conexiones || [])
            .map((conn, idx) => {
                const safe = { ...conn };
                safe.id = safe.id || `c${this.generateId()}_${idx}`;
                safe.fromPos = safe.fromPos || "right";
                safe.toPos = safe.toPos || "left";
                return safe;
            })
            .filter(conn => nodos.find(n => n.id === conn.from) && nodos.find(n => n.id === conn.to));

        // 👉 Reubicar dentro del lienzo (al importar pueden quedar demasiado a la derecha)
        const area = document.getElementById("canvasArea");
        if (area && nodos.length) {
            const margin = 80;
            const rect = area.getBoundingClientRect();
            const areaWidth = rect.width || area.clientWidth || 0;

            if (areaWidth > 0) {
                const minX = Math.min(...nodos.map(n => Number.isFinite(n.x) ? n.x : 0));
                const maxX = Math.max(...nodos.map(n => (Number.isFinite(n.x) ? n.x : 0) + (Number.isFinite(n.width) ? n.width : 144)));

                const leftBound = margin;
                const rightBound = areaWidth - margin;
                let shiftX = 0;

                // Si todo el bloque está desplazado a la derecha, acercarlo al margen izquierdo
                if (minX > leftBound) {
                    shiftX = leftBound - minX;
                }

                // Evitar que el extremo derecho se salga del lienzo visible
                if (maxX + shiftX > rightBound) {
                    shiftX = rightBound - maxX;
                }

                // Garantizar margen mínimo tras los ajustes
                if (minX + shiftX < leftBound) {
                    shiftX = leftBound - minX;
                }

                if (shiftX !== 0) {
                    nodos.forEach(n => {
                        const currentX = Number.isFinite(n.x) ? n.x : 0;
                        n.x = Math.round(currentX + shiftX);
                    });
                }
            }
        }

        this.data = { nodos, conexiones };

        // 4) Tesauro (retrocompatible)
        if (Array.isArray(parsed.tesauro)) {
            this.tesauro = parsed.tesauro.map(x => ({...x}));
        } else {
            this.tesauro = [];
        }

        // ============================================================
        // ⭐ 5) POOL DE ASIGNACIONES
        // ============================================================

        // Crear si no existe
        if (!this.asignaciones) {
            this.asignaciones = {
                grupos: new Set(),
                usuarios: new Set()
            };
        }

        // 5A — Si el JSON trae listas completas → cargarlas
        if (parsed.asignaciones) {
            (parsed.asignaciones.grupos || []).forEach(g => 
                this.asignaciones.grupos.add(g)
            );
            (parsed.asignaciones.usuarios || []).forEach(u => 
                this.asignaciones.usuarios.add(u)
            );
        }

        // 5B — Migración automática de formato antiguo a nuevo
        // Convertir asignadoA (string) → asignadosGrupos (array)
        // Convertir asignadoUsuario (string) → asignadosUsuarios (array)
        this.data.nodos.forEach(n => {
            // Migrar grupo (formato antiguo)
            if (n.asignadoA !== undefined && !n.asignadosGrupos) {
                const g = (n.asignadoA || "").trim();
                n.asignadosGrupos = g ? [g] : [];
                delete n.asignadoA; // Limpiar campo antiguo
            }

            // Migrar usuario (formato antiguo)
            if (n.asignadoUsuario !== undefined && !n.asignadosUsuarios) {
                const u = (n.asignadoUsuario || "").trim();
                n.asignadosUsuarios = u ? [u] : [];
                delete n.asignadoUsuario; // Limpiar campo antiguo
            }

            // Asegurar que existen los arrays (incluso si están vacíos)
            if (!n.asignadosGrupos) n.asignadosGrupos = [];
            if (!n.asignadosUsuarios) n.asignadosUsuarios = [];

            // Añadir al pool global
            n.asignadosGrupos.forEach(g => {
                if (g.trim()) this.asignaciones.grupos.add(g.trim());
            });
            n.asignadosUsuarios.forEach(u => {
                if (u.trim()) this.asignaciones.usuarios.add(u.trim());
            });
        });

        // ------------------------------------------------------------
        // 🔄 Actualizar los desplegables UI al terminar
        // ------------------------------------------------------------
        if (window.UI && typeof UI.updateAsignacionesList === "function") {
            UI.updateAsignacionesList();
        }

        // Sincronizar Tesauro
        document.dispatchEvent(
            new CustomEvent("tesauroUpdated", { detail: { source: "Engine:import" } })
        );
        if (window.DataTesauro) {
            DataTesauro.campos = this.tesauro.map(x => ({...x}));
            DataTesauro.render();
        }

        console.log(`📚 Tesauro cargado con ${this.tesauro.length} campos.`);

        // 6) Redibujar
        if (!Renderer.container || !Renderer.svg) {
            Renderer.init();
        }

        Renderer.clearAll();
        this.data.nodos.forEach(n => Renderer.renderNode(n));
        this.data.conexiones.forEach(c => Renderer.drawConnection(c));

        this.saveHistory();
        UI.clear();

        console.log("✅ Diagrama importado correctamente (incluyendo ficha, tesauro y asignaciones).");

    } catch (err) {
        console.error("❌ Error al importar JSON:", err);
        alert("Error al importar el archivo JSON. Revisa la consola.");
    }
},

// ⭐ NUEVO — IMPORTAR CSV DE ASIGNACIONES (POOL)
importarAsignacionesDesdeCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;

    // Detectar columnas
    const header = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
    const idxGrupo = header.indexOf("grupo");
    const idxUsuario = header.indexOf("usuario");

    if (idxGrupo === -1 && idxUsuario === -1) {
        alert("❌ El CSV debe tener columnas 'Grupo' y/o 'Usuario'.");
        return;
    }

    lines.slice(1).forEach(line => {
        const cols = line.split(/[,;\t]/);
        const grupo = cols[idxGrupo] || "";
        const usuario = cols[idxUsuario] || "";

        if (grupo.trim()) this.addGrupo(grupo.trim());
        if (usuario.trim()) this.addUsuario(usuario.trim());
    });

    alert("✅ Asignaciones importadas correctamente.");
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

    // ⭐ NUEVO — AÑADIR GRUPO AL POOL
addGrupo(nombre) {
    if (!nombre) return;
    this.asignaciones.grupos.add(nombre.trim());
},

// ⭐ NUEVO — AÑADIR USUARIO AL POOL
addUsuario(nombre) {
    if (!nombre) return;
    this.asignaciones.usuarios.add(nombre.trim());
},
/* ============================================================
   ALINEAR NODOS SELECCIONADOS (por CENTRO en eje X o Y)
============================================================ */
alignSelectedNodes() {
    const selected = Array.from(Interactions.selectedNodes || []);
    if (selected.length < 2) return;

    const nodos = selected.map(id => Engine.getNode(id)).filter(Boolean);
    if (nodos.length < 2) return;

    // 🔹 Calcular centro de cada nodo
    const centros = nodos.map(n => ({
        id: n.id,
        cx: n.x + (n.width || 200) / 2,
        cy: n.y + (n.height || 80) / 2,
        width: n.width || 200,
        height: n.height || 80
    }));

    const xs = centros.map(c => c.cx);
    const ys = centros.map(c => c.cy);
    const rangoX = Math.max(...xs) - Math.min(...xs);
    const rangoY = Math.max(...ys) - Math.min(...ys);

    // 🔸 Determinar eje de alineación dominante (el que tenga menos dispersión)
    const eje = rangoX > rangoY ? "y" : "x";

    // 🔸 Calcular posición media del eje
    const valorMedio = eje === "x"
        ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
        : Math.round(ys.reduce((a, b) => a + b, 0) / ys.length);

    // 🔹 Aplicar alineación usando centros
    const tolerancia = 9999; // sin límite: los mueve todos a línea exacta

    centros.forEach(c => {
        const n = Engine.getNode(c.id);
        if (!n) return;

        if (eje === "x") {
            // Alinear verticalmente (misma X central)
            const nuevoX = valorMedio - (n.width || 200) / 2;
            n.x = Math.round(nuevoX);
        } else {
            // Alinear horizontalmente (misma Y central)
            const nuevoY = valorMedio - (n.height || 80) / 2;
            n.y = Math.round(nuevoY);
        }

        // Actualizar posición visual
        const div = document.getElementById(n.id);
        if (div) {
            div.style.left = n.x + "px";
            div.style.top = n.y + "px";
        }
    });

    Renderer.redrawConnections();
    Engine.saveHistory();

    console.log(`🧭 Alineados ${nodos.length} nodos al centro por eje ${eje.toUpperCase()}`);
}

,
    /* ============================================================
       SELECCIÓN DE ELEMENTOS
    ============================================================ */
    selectNode(id) {
        this.clearResizeBaseline();
        this.selectedNodeId = id;
        this.selectedConnectionId = null;
    
        // 🧩 Si hay más de un nodo seleccionado → mostrar panel de grupo
        if (Interactions.selectedNodes && Interactions.selectedNodes.size > 1) {
            UI.showGroupProperties();
            return;
        }
    
        UI.showNodeProperties(id);
    },

    selectConnection(connId) {
        this.selectedConnectionId = connId;
        this.selectedNodeId = null;
      
        // 🔹 Obtener conexión
        const conn = this.getConnection(connId);
        if (!conn) return;
      
        // ======================================================
        // ✨ ILUMINAR LÍNEA Y NODOS CONECTADOS
        // ======================================================
      
        // 1️⃣ Limpiar selecciones previas
        document.querySelectorAll(".connection-line.selected-conn").forEach(el => el.classList.remove("selected-conn"));
        document.querySelectorAll(".node.selected-conn").forEach(el => el.classList.remove("selected-conn"));
      
        // 2️⃣ Buscar la línea correcta (por id o data-conn-id)
        let path = document.getElementById(connId);
        if (!path) {
          path = document.querySelector(`.connection-line[data-conn-id="${connId}"]`);
        }
      
        // 3️⃣ Resaltar la línea seleccionada
        if (path) path.classList.add("selected-conn");
      
        // 4️⃣ Resaltar nodos origen y destino
        const fromNode = document.getElementById(conn.from);
        const toNode = document.getElementById(conn.to);
        if (fromNode) fromNode.classList.add("selected-conn");
        if (toNode) toNode.classList.add("selected-conn");
      
        // ======================================================
        // 🔸 Mantener tu comportamiento original
        // ======================================================
        UI.showConnectionProperties(connId);
        toggleRightPanel(true);
        Renderer.showConnectionHandles(conn);
      },
      clearAll() {
        console.log("🧹 Engine.clearAll ejecutado");
      
        // 1️⃣ Limpiar estructura de datos interna
        this.data = { nodos: [], conexiones: [] };
        this.selectedNodeId = null;
        this.selectedConnectionId = null;
      
        // 2️⃣ Pedir al Renderer que limpie el canvas y selecciones
        if (window.Renderer && typeof Renderer.clearAll === "function") {
          Renderer.clearAll();
        }
      
        // 3️⃣ (Opcional) Limpiar panel de propiedades y ficha si procede
        if (window.UI && typeof UI.clearProperties === "function") UI.clearProperties();
        if (this.fichaProyecto) {
          this.fichaProyecto = { procedimiento: "", actividad: "", descripcion: "" };
        }
      
        console.log("✅ Engine.clearAll completado");
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

    let requiereActualizarTexto = false;

    if (props.titulo !== undefined) {
        nodo.titulo = props.titulo;
        requiereActualizarTexto = true;
    }

    if (props.descripcion !== undefined) {
        nodo.descripcion = props.descripcion;
        requiereActualizarTexto = true;
    }

    if (props.tareaManual !== undefined) {
        nodo.tareaManual = props.tareaManual;
    }

    // ⭐ Manejo de arrays de asignaciones
    if (props.asignadosGrupos !== undefined) {
        nodo.asignadosGrupos = props.asignadosGrupos;
    }

    if (props.asignadosUsuarios !== undefined) {
        nodo.asignadosUsuarios = props.asignadosUsuarios;
    }

    // 🔄 Retrocompatibilidad: convertir campos antiguos si existen
    if (props.asignadoA !== undefined) {
        if (!nodo.asignadosGrupos) nodo.asignadosGrupos = [];
        if (props.asignadoA && !nodo.asignadosGrupos.includes(props.asignadoA)) {
            nodo.asignadosGrupos.push(props.asignadoA);
        }
    }

    if (props.asignadoUsuario !== undefined) {
        if (!nodo.asignadosUsuarios) nodo.asignadosUsuarios = [];
        if (props.asignadoUsuario && !nodo.asignadosUsuarios.includes(props.asignadoUsuario)) {
            nodo.asignadosUsuarios.push(props.asignadoUsuario);
        }
    }

    if (requiereActualizarTexto) {
        Renderer.updateNodeLabel(id);
    }

    this.saveHistory();
},

/* ============================================================
   AGREGAR/REMOVER ASIGNACIONES INDIVIDUALES
============================================================ */
addAsignacionGrupo(nodeId, grupo) {
    const nodo = this.getNode(nodeId);
    if (!nodo) return;

    if (!nodo.asignadosGrupos) nodo.asignadosGrupos = [];

    // Siempre agregar al array (incluso si está vacío)
    nodo.asignadosGrupos.push(grupo);

    // Solo agregar al pool global si tiene valor
    const valor = grupo.trim();
    if (valor) {
        this.addGrupo(valor);
    }

    this.saveHistory();
},

removeAsignacionGrupo(nodeId, index) {
    const nodo = this.getNode(nodeId);
    if (!nodo || !nodo.asignadosGrupos) return;

    nodo.asignadosGrupos.splice(index, 1);
    this.saveHistory();
},

addAsignacionUsuario(nodeId, usuario) {
    const nodo = this.getNode(nodeId);
    if (!nodo) return;

    if (!nodo.asignadosUsuarios) nodo.asignadosUsuarios = [];

    // Siempre agregar al array (incluso si está vacío)
    nodo.asignadosUsuarios.push(usuario);

    // Solo agregar al pool global si tiene valor
    const valor = usuario.trim();
    if (valor) {
        this.addUsuario(valor);
    }

    this.saveHistory();
},

removeAsignacionUsuario(nodeId, index) {
    const nodo = this.getNode(nodeId);
    if (!nodo || !nodo.asignadosUsuarios) return;

    nodo.asignadosUsuarios.splice(index, 1);
    this.saveHistory();
},



    /* ============================================================
       REDIMENSIONAR VARIOS NODOS A LA VEZ
============================================================ */
captureResizeBaseline() {
    this.resizeSelectionBaseline = new Map();

    Interactions.selectedNodes.forEach(id => {
        const nodo = this.getNode(id);
        if (!nodo) return;

        this.resizeSelectionBaseline.set(id, {
            width: nodo.width,
            height: nodo.height
        });
    });
},

clearResizeBaseline() {
    this.resizeSelectionBaseline = new Map();
},

resizeSelectedNodes(scaleFactor) {
    const selected = Array.from(Interactions.selectedNodes);
    if (selected.length === 0) return;

    const needsBaseline =
        !this.resizeSelectionBaseline ||
        this.resizeSelectionBaseline.size !== selected.length ||
        selected.some(id => !this.resizeSelectionBaseline.has(id));

    if (needsBaseline) {
        this.captureResizeBaseline();
    }

    // Redimensionar cada nodo proporcionalmente
    selected.forEach(id => {
        const nodo = this.getNode(id);
        if (!nodo) return;

        const baseSize = this.resizeSelectionBaseline.get(id) || {
            width: nodo.width,
            height: nodo.height
        };

        nodo.width = Math.max(60, baseSize.width * scaleFactor);
        nodo.height = Math.max(40, baseSize.height * scaleFactor);

        // Actualizar visual
        const div = document.getElementById(id);
        if (div) {
            div.style.width = nodo.width + "px";
            div.style.height = nodo.height + "px";
        }

        Renderer.renderShapeSVG(div, nodo);
    });

    Renderer.updateConnections();
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

        if (data.entidad !== undefined)
            this.fichaProyecto.entidad = data.entidad;
    
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

        if (!Renderer.container || !Renderer.svg) {
            Renderer.init();
        }

        Renderer.clearAll();
        this.data.nodos.forEach(n => Renderer.renderNode(n));
        this.data.conexiones.forEach(c => Renderer.drawConnection(c));

        UI.clear();
    }

};

// Exponer en entornos de navegador y Node para pruebas
if (typeof window !== "undefined") {
  window.Engine = Engine;
} else if (typeof global !== "undefined") {
  global.Engine = Engine;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Engine };
}

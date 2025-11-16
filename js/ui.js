/* ============================================================
   UI.JS
   Maneja el panel derecho:
   - Propiedades de nodos
   - Propiedades de conexiones
   - Inputs, eliminación, undo/redo
============================================================ */

const UI = {

    /* Referencias a elementos del DOM */
    propsEmpty: null,
    propsEditor: null,
    propsConn: null,

    inputTitulo: null,
    inputDescripcion: null,

    inputCondNombre: null,
    inputCondValor: null,

    currentNodeId: null,
    currentConnId: null,

    /* ========================================================
       INICIALIZACIÓN
    ======================================================== */
    init() {
        this.propsEmpty  = document.getElementById("propsEmpty");
        this.propsEditor = document.getElementById("propsEditor");

        /* Crear dinámicamente el panel de conexión */
        this.createConnectionPanel();

        this.inputTitulo   = document.getElementById("propTitulo");
        this.inputDescripcion = document.getElementById("propDescripcion");
        this.inputTareaManual = document.getElementById("propTareaManual");
        this.inputAsignadoA = document.getElementById("propAsignadoA");

        /* ========================================================
           EVENTOS PARA NODOS
        ======================================================== */
        this.inputTitulo.addEventListener("input", () => {
            if (this.currentNodeId)
                Engine.updateNode(this.currentNodeId, { titulo: this.inputTitulo.value });
        });


        this.inputDescripcion.addEventListener("input", () => {
            if (!this.currentNodeId) return;
            const id = this.currentNodeId;
            const newHtml = this.inputDescripcion.innerHTML;
        
            Engine.updateNode(id, { descripcion: newHtml });
        
            const nodeDiv = document.getElementById(id);
            if (nodeDiv) {
                const descDiv = nodeDiv.querySelector(".node-description");
                if (descDiv) {
                    descDiv.innerHTML = newHtml || "";
                    descDiv.style.height = "auto";
                    descDiv.style.height = descDiv.scrollHeight + "px";
                    const contentDiv = nodeDiv.querySelector(".node-content");
                    const newHeight = contentDiv.scrollHeight + descDiv.scrollHeight + 40;
                    nodeDiv.style.height = newHeight + "px";
                    const nodo = Engine.getNode(id);
                    if (nodo) nodo.height = newHeight;
                    Renderer.renderShapeSVG(nodeDiv, nodo);
                    Renderer.redrawConnections();
                }
            }
        });
       /* ========================================================
   CHECK DE "TAREA MANUAL" → actualiza y redibuja icono Ⓜ️
======================================================== */
        this.inputTareaManual.addEventListener("change", () => {
            if (!this.currentNodeId) return;

            const esManual = this.inputTareaManual.checked;

            // 1️⃣ Actualiza en Engine
            Engine.updateNode(this.currentNodeId, { tareaManual: esManual });

            // 2️⃣ Recupera el nodo
            const nodo = Engine.getNode(this.currentNodeId);
            if (!nodo) return;

            // 3️⃣ Redibuja solo su forma SVG (para mostrar o quitar el Ⓜ️)
            const nodeDiv = document.getElementById(this.currentNodeId);
            if (nodeDiv) Renderer.renderShapeSVG(nodeDiv, nodo);
        });

                /* ========================================================
        INPUT TEXTO — Asignado A
        ======================================================== */
        this.inputAsignadoA.addEventListener("input", () => {
            if (this.currentNodeId) {
                Engine.updateNode(this.currentNodeId, {
                    asignadoA: this.inputAsignadoA.value.trim()
                });
            }
        });
        /* ========================================================
           BOTÓN ELIMINAR NODO
        ======================================================== */
        const deleteBtn = document.getElementById("btnDeleteNode");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {
                Engine.deleteSelected();
            });
        }

        /* ========================================================
           BOTONES DESHACER / REHACER
        ======================================================== */
        const btnUndo = document.getElementById("btnUndo");
        const btnRedo = document.getElementById("btnRedo");

        if (btnUndo) btnUndo.addEventListener("click", () => Engine.undo());
        if (btnRedo) btnRedo.addEventListener("click", () => Engine.redo());

        /* ========================================================
        FICHA DEL PROYECTO – EVENTOS UI
        ======================================================== */
        const btnFicha = document.getElementById("btnFichaProyecto");
        if (btnFicha) {
            btnFicha.addEventListener("click", () => {
                const panel = document.getElementById("fichaProyecto");

                document.getElementById("fpProcedimiento").value = Engine.fichaProyecto.procedimiento;
                document.getElementById("fpActividad").value     = Engine.fichaProyecto.actividad;
                document.getElementById("fpDescripcion").value   = Engine.fichaProyecto.descripcion;

                panel.classList.remove("hidden");
            });
        }

        const btnFpCerrar = document.getElementById("fpCerrar");
        if (btnFpCerrar) {
            btnFpCerrar.addEventListener("click", () => {
                document.getElementById("fichaProyecto").classList.add("hidden");
            });
        }

        const btnFpGuardar = document.getElementById("fpGuardar");
        if (btnFpGuardar) {
            btnFpGuardar.addEventListener("click", () => {
                const newProc = document.getElementById("fpProcedimiento").value;

                Engine.updateFichaProyecto({
                    procedimiento: newProc,
                    actividad:     document.getElementById("fpActividad").value,
                    descripcion:   document.getElementById("fpDescripcion").value
                });

                // 🔥 ACTUALIZA EL TÍTULO EN TIEMPO REAL
                document.getElementById("projectTitle").innerText = newProc.toUpperCase();

                document.getElementById("fichaProyecto").classList.add("hidden");
            });        

}
        /* ========================================================
           ATAJOS DE TECLADO (Ctrl+Z / Ctrl+Y / Supr)
        ======================================================== */
        window.addEventListener("keydown", (e) => {
            // Ctrl + Z → Deshacer
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                Engine.undo();
            }

            // Ctrl + Y → Rehacer
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
                e.preventDefault();
                Engine.redo();
            }

           
        });
    },

    /* ========================================================
       PANEL PARA CONEXIONES — con botón Eliminar
    ======================================================== */
    createConnectionPanel() {

        const connDiv = document.createElement("div");
        connDiv.id = "propsConnection";
        connDiv.style.display = "none";

        connDiv.innerHTML = `
            <h3>Condición</h3>

            <label>Nombre condición</label>
            <input id="propCondNombre" />

            <label>Valor</label>
            <input id="propCondValor" />

            <button id="btnDeleteConnection" class="btn" style="
                background:#dc2626;
                color:white;
                margin-top:15px;
            ">🗑️ Eliminar conexión</button>
        `;

        document.getElementById("rightPanel").appendChild(connDiv);

        this.propsConn = connDiv;
        this.inputCondNombre = connDiv.querySelector("#propCondNombre");
        this.inputCondValor  = connDiv.querySelector("#propCondValor");

        /* Eventos */
        this.inputCondNombre.addEventListener("input", () => {
            if (this.currentConnId) {
                Engine.updateConnectionCondition(
                    this.currentConnId,
                    this.inputCondNombre.value,
                    this.inputCondValor.value
                );
            }
        });

        this.inputCondValor.addEventListener("input", () => {
            if (this.currentConnId) {
                Engine.updateConnectionCondition(
                    this.currentConnId,
                    this.inputCondNombre.value,
                    this.inputCondValor.value
                );
            }
        });

        /* 🔥 Botón eliminar conexión */
        const btnDeleteConn = connDiv.querySelector("#btnDeleteConnection");
        btnDeleteConn.addEventListener("click", () => {
            if (this.currentConnId) {
                Engine.deleteConnection(this.currentConnId);
                this.currentConnId = null;
                UI.clear();
            }
        });
    },

    /* ========================================================
       MOSTRAR PROPIEDADES DE NODO
    ======================================================== */
    showNodeProperties(id) {
        this.currentNodeId = id;
        this.currentConnId = null;
    
        const nodo = Engine.getNode(id);
        if (!nodo) return;
    
        // Mostrar/ocultar paneles correctamente
        this.propsEmpty.style.display = "none";
        this.propsEditor.style.display = "block";
        if (this.propsConn) this.propsConn.style.display = "none";
    
        // Asignar valores
        this.inputTitulo.value = nodo.titulo || "";

        // Mostrar tipo actual del nodo
        const tipoSelect = document.getElementById("propTipo");
        if (tipoSelect) {
            tipoSelect.value = nodo.tipo || "formulario";
        }
    
        // ✅ Campo descripción ahora es un DIV contenteditable (no input)
        const descDiv = document.getElementById("propDescripcion");
        if (descDiv) {
            descDiv.innerHTML = nodo.descripcion || ""; // Limpia y carga la del nodo actual
        }
    
        this.inputTareaManual.checked = !!nodo.tareaManual;
        this.inputAsignadoA.value = nodo.asignadoA || "";
    },
    

    /* ========================================================
       MOSTRAR PROPIEDADES DE CONEXIÓN
    ======================================================== */
    showConnectionProperties(connId) {
        this.currentConnId = connId;
        this.currentNodeId = null;

        const conn = Engine.getConnection(connId);
        if (!conn) return;

        this.propsEmpty.style.display = "none";
        this.propsEditor.style.display = "none";
        this.propsConn.style.display = "block";

        this.inputCondNombre.value = conn.condicionNombre || "";
        this.inputCondValor.value  = conn.condicionValor  || "";
    },

    /* ========================================================
       LIMPIAR UI
    ======================================================== */
    clear() {
        this.currentNodeId = null;
        this.currentConnId = null;

        this.propsEmpty.style.display = "block";
        this.propsEditor.style.display = "none";
        this.propsConn.style.display = "none";
    }
};
/* ============================================================
   WYSIWYG para descripción del panel derecho
============================================================ */
const propDesc = document.getElementById("propDescripcion");
const propToolbar = document.getElementById("propToolbar");
if (propDesc && propToolbar) {
    propToolbar.querySelectorAll("button[data-cmd]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const cmd = btn.getAttribute("data-cmd");
            propDesc.focus();
            document.execCommand(cmd, false, null);
        });
    });
}

/* ============================================================
   CAMBIO DE TIPO DE NODO DESDE EL PANEL (sin confirmación)
============================================================ */
const tipoSelect = document.getElementById("propTipo");
if (tipoSelect) {
    tipoSelect.addEventListener("change", (e) => {
        const newTipo = e.target.value;
        if (!UI.currentNodeId) return;

        const nodo = Engine.getNode(UI.currentNodeId);
        if (!nodo) return;

        // Aplicar directamente el nuevo tipo
        nodo.tipo = newTipo;

        // 🔁 Redibujar nodo con la nueva forma
        Renderer.deleteNodeVisual(nodo.id);
        Renderer.renderNode(nodo);
        Renderer.updateConnections();

        // Guardar en historial y mantener selección
        Engine.saveHistory();
        Engine.selectNode(nodo.id);
    });
}
/* ============================================================
   ARRANQUE
============================================================ */
window.addEventListener("DOMContentLoaded", () => UI.init());

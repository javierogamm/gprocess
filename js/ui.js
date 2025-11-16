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
   CONTROL DE COLOR DE NODO 🎨
======================================================== */
const colorLabel = document.createElement("label");
colorLabel.innerText = "Color del nodo";

const colorInput = document.createElement("input");
colorInput.type = "color";
colorInput.id = "propColor";
colorInput.style.width = "100%";
colorInput.style.height = "36px";
colorInput.style.marginTop = "4px";
colorInput.style.marginBottom = "10px";
colorInput.style.cursor = "pointer";
colorInput.style.borderRadius = "6px";
colorInput.style.border = "1px solid #ccc";

const colorBtn = document.createElement("button");
colorBtn.id = "btnColorPicker";
colorBtn.textContent = "Seleccionar desde pantalla";
colorBtn.className = "btn";
colorBtn.style.marginBottom = "10px";

// Añadir al panel de propiedades del nodo
this.propsEditor.appendChild(colorLabel);
this.propsEditor.appendChild(colorInput);
this.propsEditor.appendChild(colorBtn);

/* ========================================================
   CONTROL DE COLOR DEL BORDE 🎨
======================================================== */
const strokeLabel = document.createElement("label");
strokeLabel.innerText = "Color del borde";

const strokeInput = document.createElement("input");
strokeInput.type = "color";
strokeInput.id = "propStrokeColor";
strokeInput.style.width = "100%";
strokeInput.style.height = "36px";
strokeInput.style.marginTop = "4px";
strokeInput.style.marginBottom = "10px";
strokeInput.style.cursor = "pointer";
strokeInput.style.borderRadius = "6px";
strokeInput.style.border = "1px solid #ccc";

// Añadir al panel
this.propsEditor.appendChild(strokeLabel);
this.propsEditor.appendChild(strokeInput);

// Guardar referencia
this.inputStrokeColor = strokeInput;

// Evento: cambiar color de borde
strokeInput.addEventListener("input", () => {
    if (!this.currentNodeId) return;
    const id = this.currentNodeId;
    const nodo = Engine.getNode(id);
    if (!nodo) return;

    nodo.strokeColor = strokeInput.value;
    Renderer.updateNodeColor(id, nodo.color || "#b9e6e8", strokeInput.value);
});

/* ========================================================
   CONTROL GLOBAL DE REDIMENSIONAR VARIOS NODOS
======================================================== */
const resizeLabel = document.createElement("label");
resizeLabel.innerText = "Redimensionar selección";

const resizeSlider = document.createElement("input");
resizeSlider.type = "range";
resizeSlider.id = "propResize";
resizeSlider.min = "50";
resizeSlider.max = "200";
resizeSlider.value = "100";
resizeSlider.step = "5";
resizeSlider.style.width = "100%";
resizeSlider.style.marginTop = "4px";
resizeSlider.style.marginBottom = "10px";
resizeSlider.style.cursor = "pointer";

this.propsEditor.appendChild(resizeLabel);
this.propsEditor.appendChild(resizeSlider);

// Guardar referencia
this.inputResize = resizeSlider;

// Evento: al mover el slider → redimensiona todos los seleccionados
resizeSlider.addEventListener("input", () => {
    const scalePercent = parseInt(resizeSlider.value, 10) / 100;
    if (Interactions.selectedNodes.size > 0) {
        Engine.resizeSelectedNodes(scalePercent);
    }
});

/* ========================================================
   CONTROL DE COLOR DE TEXTO DEL TÍTULO Y DESCRIPCIÓN
======================================================== */
const textTitleLabel = document.createElement("label");
textTitleLabel.innerText = "Color del título";
const textTitleInput = document.createElement("input");
textTitleInput.type = "color";
textTitleInput.id = "propTextColorTitulo";
textTitleInput.style.width = "100%";
textTitleInput.style.height = "32px";
textTitleInput.style.marginBottom = "8px";

const textDescLabel = document.createElement("label");
textDescLabel.innerText = "Color de la descripción";
const textDescInput = document.createElement("input");
textDescInput.type = "color";
textDescInput.id = "propTextColorDescripcion";
textDescInput.style.width = "100%";
textDescInput.style.height = "32px";
textDescInput.style.marginBottom = "12px";

this.propsEditor.appendChild(textTitleLabel);
this.propsEditor.appendChild(textTitleInput);
this.propsEditor.appendChild(textDescLabel);
this.propsEditor.appendChild(textDescInput);

this.inputTextColorTitulo = textTitleInput;
this.inputTextColorDescripcion = textDescInput;

// Eventos para aplicar color de texto en vivo
textTitleInput.addEventListener("input", () => {
    if (!this.currentNodeId) return;
    Renderer.updateNodeTextColor(this.currentNodeId, "titulo", textTitleInput.value);
});

textDescInput.addEventListener("input", () => {
    if (!this.currentNodeId) return;
    Renderer.updateNodeTextColor(this.currentNodeId, "descripcion", textDescInput.value);
});

// Guardar referencias
this.inputColor = colorInput;
this.btnColorPicker = colorBtn;

// 🎨 Evento: cambiar color (soporta selección múltiple)
colorInput.addEventListener("input", () => {
    const nuevoColor = colorInput.value;

    // 🟢 Si hay varios nodos seleccionados → aplicar a todos
    if (Interactions.selectedNodes && Interactions.selectedNodes.size > 1) {
        Interactions.selectedNodes.forEach(id => {
            const nodo = Engine.getNode(id);
            if (!nodo) return;
            nodo.color = nuevoColor;
            Renderer.updateNodeColor(id, nuevoColor, nodo.strokeColor || "#4a7f84");
        });
        Engine.saveHistory();
        return;
    }

    // 🔵 Si hay un solo nodo activo
    if (this.currentNodeId) {
        const id = this.currentNodeId;
        const nodo = Engine.getNode(id);
        if (!nodo) return;

        nodo.color = nuevoColor;
        Renderer.updateNodeColor(id, nuevoColor, nodo.strokeColor || "#4a7f84");
        Engine.saveHistory();
    }
});
// Evento: usar cuentagotas del navegador
colorBtn.addEventListener("click", async () => {
    if (!this.currentNodeId) return;
    const id = this.currentNodeId;
    const nodo = Engine.getNode(id);
    if (!nodo) return;

    if (!window.EyeDropper) {
        alert("Tu navegador no soporta el selector de color EyeDropper.");
        return;
    }

    try {
        const picker = new EyeDropper();
        const result = await picker.open();
        nodo.color = result.sRGBHex;
        colorInput.value = result.sRGBHex;
        Renderer.updateNodeColor(id, result.sRGBHex);
    } catch (err) {
        console.warn("Cuentagotas cancelado:", err);
    }
});
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
    
        // 🔸 Determinar si hay selección múltiple
        const multiple = Interactions.selectedNodes.size > 1;
        const groupPanel = document.getElementById("propsGroup");
    
        // ------------------------------------------------------------
        // 🌈 Modo selección múltiple
        // ------------------------------------------------------------
        if (multiple) {
            this.propsEmpty.style.display = "none";
            this.propsEditor.style.display = "none";
            if (this.propsConn) this.propsConn.style.display = "none";
    
            let panel = groupPanel;
            if (!panel) {
                panel = document.createElement("div");
                panel.id = "propsGroup";
                panel.style.padding = "10px";
                panel.innerHTML = `
                    <h3>Selección múltiple</h3>
                    <label>Color común</label>
                    <input type="color" id="groupColor" style="width:100%;height:36px;margin-bottom:8px;">
                    <label>Tamaño</label>
                    <input type="range" id="groupSize" min="40" max="400" value="100" style="width:100%;margin-bottom:8px;">
                    <button id="groupDelete" class="btn" style="background:#dc2626;color:white;">🗑️ Eliminar todos</button>
                `;
                document.getElementById("rightPanel").appendChild(panel);
    
                // 🎨 Color
                panel.querySelector("#groupColor").addEventListener("input", (e) => {
                    const color = e.target.value;
                    Interactions.selectedNodes.forEach(id => {
                        const n = Engine.getNode(id);
                        if (!n) return;
                        n.color = color;
                        Renderer.updateNodeColor(id, color);
                    });
                });
    
                // 📏 Redimensionar
                panel.querySelector("#groupSize").addEventListener("input", (e) => {
                    const factor = parseFloat(e.target.value) / 100;
                    Interactions.selectedNodes.forEach(id => {
                        const n = Engine.getNode(id);
                        const div = document.getElementById(id);
                        if (!n || !div) return;
                        n.width = Math.max(40, n.width * factor);
                        n.height = Math.max(25, n.height * factor);
                        div.style.width = n.width + "px";
                        div.style.height = n.height + "px";
                        Renderer.renderShapeSVG(div, n);
                    });
                    Renderer.redrawConnections();
                });
    
                // 🗑️ Eliminar
                panel.querySelector("#groupDelete").addEventListener("click", () => {
                    Interactions.selectedNodes.forEach(id => Engine.deleteNode(id));
                    Interactions.selectedNodes.clear();
                    Renderer.redrawConnections();
                    this.clear();
                });
            }
    
            panel.style.display = "block";
            return;
        }
    
        // ------------------------------------------------------------
        // 🧩 Modo nodo individual
        // ------------------------------------------------------------
        if (groupPanel) groupPanel.style.display = "none";
    
        this.propsEmpty.style.display = "none";
        this.propsEditor.style.display = "block";
        if (this.propsConn) this.propsConn.style.display = "none";
    
        const tipoSelect = document.getElementById("propTipo");
        if (tipoSelect) tipoSelect.value = nodo.tipo || "formulario";
    
        this.inputTitulo.value = nodo.titulo || "";
        const descDiv = document.getElementById("propDescripcion");
        if (descDiv) descDiv.innerHTML = nodo.descripcion || "";
    
        this.inputTareaManual.checked = !!nodo.tareaManual;
        this.inputAsignadoA.value = nodo.asignadoA || "";
    
        if (this.inputColor)
            this.inputColor.value = nodo.color || getDefaultColorByType(nodo.tipo);
        if (this.inputStrokeColor)
            this.inputStrokeColor.value = nodo.strokeColor || "#4a7f84";
        if (this.inputTextColorTitulo)
            this.inputTextColorTitulo.value = nodo.colorTitulo || "#111827";
        if (this.inputTextColorDescripcion)
            this.inputTextColorDescripcion.value = nodo.colorDescripcion || "#333333";
    }
    
    
    ,
/* ========================================================
   MOSTRAR PANEL DE PROPIEDADES DE GRUPO (selección múltiple)
======================================================== */
showGroupProperties() {
    this.currentNodeId = null;
    this.currentConnId = null;

    // Mostrar el panel principal y ocultar los otros
    this.propsEmpty.style.display = "none";
    this.propsEditor.style.display = "block";
    if (this.propsConn) this.propsConn.style.display = "none";

    // 🧹 Ocultar todo lo que no sea color, tamaño o eliminar
    const allChildren = Array.from(this.propsEditor.children);
    allChildren.forEach(el => {
        el.style.display = "none";
    });

    // 🎨 Mostrar color del nodo
    if (this.inputColor) {
        this.inputColor.style.display = "block";
        const labelColor = this.inputColor.previousElementSibling;
        if (labelColor) labelColor.style.display = "block";
    }

    // 📏 Mostrar slider de tamaño
    if (this.inputResize) {
        this.inputResize.style.display = "block";
        const labelResize = this.inputResize.previousElementSibling;
        if (labelResize) labelResize.style.display = "block";
    }
            // 🧭 Botón de alineación
        let btnAlinear = document.getElementById("btnAlignGroup");
        if (!btnAlinear) {
            btnAlinear = document.createElement("button");
            btnAlinear.id = "btnAlignGroup";
            btnAlinear.className = "btn";
            btnAlinear.textContent = "🧭 Alinear selección";
            btnAlinear.style.background = "#2563eb";
            btnAlinear.style.color = "white";
            btnAlinear.style.width = "100%";
            btnAlinear.style.marginTop = "6px";
            btnAlinear.addEventListener("click", () => {
                Engine.alignSelectedNodes();
            });
            this.propsEditor.appendChild(btnAlinear);
        } else {
            btnAlinear.style.display = "block";
        }

    // 🗑️ Botón eliminar selección
    let btnEliminar = document.getElementById("btnDeleteGroup");
    if (!btnEliminar) {
        btnEliminar = document.createElement("button");
        btnEliminar.id = "btnDeleteGroup";
        btnEliminar.className = "btn";
        btnEliminar.textContent = "🗑️ Eliminar selección";
        btnEliminar.style.background = "#dc2626";
        btnEliminar.style.color = "white";
        btnEliminar.style.width = "100%";
        btnEliminar.style.marginTop = "10px";
        btnEliminar.addEventListener("click", () => {
            if (Interactions.selectedNodes.size === 0) return;
            if (!confirm(`¿Eliminar ${Interactions.selectedNodes.size} nodos seleccionados?`)) return;
            Array.from(Interactions.selectedNodes).forEach(id => Engine.deleteNode(id));
            Interactions.selectedNodes.clear();
            UI.clear();
        });
        this.propsEditor.appendChild(btnEliminar);
    } else {
        btnEliminar.style.display = "block";
    }

    // 🔖 Título opcional del panel
    const header = this.propsEditor.querySelector("h3");
    if (header) {
        header.textContent = `Propiedades de grupo (${Interactions.selectedNodes.size})`;
        header.style.display = "block";
    }

    // 🔄 Reset slider
    if (this.inputResize) this.inputResize.value = "100";
}
,

/* ========================================================
   MOSTRAR PROPIEDADES DE CONEXIÓN
======================================================== */
showConnectionProperties(connId) {
    this.currentConnId = connId;
    this.currentNodeId = null;

    const conn = Engine.getConnection(connId);
    if (!conn) return;

    // Mostrar/ocultar paneles correctos
    this.propsEmpty.style.display = "none";
    this.propsEditor.style.display = "none";
    this.propsConn.style.display = "block";

    // Rellenar los campos existentes
    this.inputCondNombre.value = conn.condicionNombre || "";
    this.inputCondValor.value  = conn.condicionValor  || "";

    // 🧹 Elimina posibles duplicados del campo “Nuevo estado”
    const oldLbl = this.propsConn.querySelector("label[data-type='lblCambio']");
    const oldInput = this.propsConn.querySelector("input[data-type='inputCambio']");
    if (oldLbl) oldLbl.remove();
    if (oldInput) oldInput.remove();

    // 🔹 Campo "Nuevo estado"
    const lblCambio = document.createElement("label");
    lblCambio.textContent = "Nuevo estado";
    lblCambio.setAttribute("data-type", "lblCambio");
    lblCambio.style.marginTop = "10px";

    const inputCambio = document.createElement("input");
    inputCambio.type = "text";
    inputCambio.setAttribute("data-type", "inputCambio");
    inputCambio.placeholder = "Introduce el nuevo estado…";
    inputCambio.value = conn.cambioEstado || "";

    inputCambio.addEventListener("input", () => {
        Engine.updateConnectionCambioEstado(conn.id, inputCambio.value);
    });

    // Añadir al panel de conexión
    this.propsConn.insertBefore(lblCambio, this.propsConn.querySelector("#btnDeleteConnection"));
    this.propsConn.insertBefore(inputCambio, this.propsConn.querySelector("#btnDeleteConnection"));
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
        if (this.inputResize) this.inputResize.value = "100";
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

function getDefaultColorByType(tipo) {
    switch (tipo) {
        case "formulario": return "#b9e6e8";
        case "documento": return "#b9e6e8";
        case "decision": return "#b9e6e8";
        case "circuito": return "#b9e6e8";
        case "plazo": return "#b9e6e8";
        case "libre": return "#b9e6e8";
        case "operacion_externa": return "#b9e6e8";
        default: return "#b9e6e8";
    }
}
/* ============================================================
   ARRANQUE
============================================================ */
window.addEventListener("DOMContentLoaded", () => UI.init());

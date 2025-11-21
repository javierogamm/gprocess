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
    inputAsignadoUsuario: null, // **NUEVO** segundo campo (usuario)
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
   RENOMBRAR EL CAMPO EXISTENTE → "Asignado a Grupo"
   Y CREAR "Asignado a Usuario" (dinámico)
======================================================== */
(() => {
    // 1) Renombrar la etiqueta anterior del input existente
    const labelAsignadoA = this.inputAsignadoA ? this.inputAsignadoA.previousElementSibling : null;
    if (labelAsignadoA && labelAsignadoA.tagName && labelAsignadoA.tagName.toLowerCase() === "label") {
        labelAsignadoA.textContent = "Asignado a Grupo";
    }
    if (this.inputAsignadoA) {
        this.inputAsignadoA.placeholder = "Grupo / Unidad gestora…";
    }

    // 2) Crear dinámicamente el nuevo campo "Asignado a Usuario"
    let labelUsuario = document.getElementById("lblAsignadoUsuario");
    let inputUsuario = document.getElementById("propAsignadoUsuario");

    if (!labelUsuario) {
        labelUsuario = document.createElement("label");
        labelUsuario.id = "lblAsignadoUsuario";
        labelUsuario.textContent = "Asignado a Usuario";
        this.propsEditor.appendChild(labelUsuario);
    }

    if (!inputUsuario) {
        inputUsuario = document.createElement("input");
        inputUsuario.type = "text";
        inputUsuario.id = "propAsignadoUsuario";
        inputUsuario.className = "input";
        inputUsuario.placeholder = "Usuario (p. ej. jgomez)…";
        inputUsuario.style.width = "100%";
        inputUsuario.style.marginBottom = "10px";
        this.propsEditor.appendChild(inputUsuario);
    }

    this.inputAsignadoUsuario = inputUsuario;

   this.inputAsignadoUsuario.addEventListener("input", () => {
    if (!this.currentNodeId) return;

    const nodo = Engine.getNode(this.currentNodeId);
    if (!nodo) return;

    // 💾 Guardar directamente en el nodo (igual que hace AsignadoA)
    nodo.asignadoUsuario = this.inputAsignadoUsuario.value.trim();

    // 🔁 Actualizar Engine e historial
    Engine.updateNode(this.currentNodeId, { asignadoUsuario: nodo.asignadoUsuario });
    Engine.saveHistory(); // 👈 ESTO FALTABA

    console.log("💾 Guardado asignadoUsuario:", nodo.asignadoUsuario);
});
})();
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

        // Rellenar los campos con la info actual del proyecto
        document.getElementById("fpProcedimiento").value = Engine.fichaProyecto.procedimiento;
        document.getElementById("fpActividad").value     = Engine.fichaProyecto.actividad;
        document.getElementById("fpDescripcion").value   = Engine.fichaProyecto.descripcion;

        // 👇 Nuevo: mostrar panel flotante (ya no modal centrado)
        panel.classList.add("visible");
    });
}

// 🔹 Botón cerrar
const btnFpCerrar = document.getElementById("fpCerrar");
if (btnFpCerrar) {
    btnFpCerrar.addEventListener("click", () => {
        const panel = document.getElementById("fichaProyecto");
        panel.classList.remove("visible");
    });
}

// 💾 Botón guardar
const btnFpGuardar = document.getElementById("fpGuardar");
if (btnFpGuardar) {
    btnFpGuardar.addEventListener("click", () => {
        const newProc = document.getElementById("fpProcedimiento").value;

        Engine.updateFichaProyecto({
            procedimiento: newProc,
            actividad:     document.getElementById("fpActividad").value,
            descripcion:   document.getElementById("fpDescripcion").value
        });

        // 🔥 Actualiza título en vivo
        document.getElementById("projectTitle").innerText = newProc.toUpperCase();

        // 👇 Cerrar el panel flotante tras guardar
        const panel = document.getElementById("fichaProyecto");
        panel.classList.remove("visible");
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
    // Ctrl + A → Seleccionar todos los nodos
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();

        // Limpiar selección anterior
        Interactions.selectedNodes.clear();

        // Seleccionar todos los nodos existentes
        Engine.data.nodos.forEach(nodo => {
            Interactions.selectedNodes.add(nodo.id);
            const div = document.getElementById(nodo.id);
            if (div) div.classList.add("selected-multi");
        });

        // Refrescar el panel de grupo
        UI.showGroupProperties();

        console.log(`✅ Seleccionados ${Engine.data.nodos.length} nodos`);
    }
           
        });

// ========================================================
// IMPORTAR DIAGRAMA DESDE TEXTO
// ========================================================
const btnImportar = document.getElementById("btnImportarTexto");
const txtImportar = document.getElementById("txtImportar");

if (btnImportar && txtImportar) {
    btnImportar.addEventListener("click", () => {
        const texto = txtImportar.value.trim();
        if (!texto) {
            alert("Pega antes el texto del flujo.");
            return;
        }

        ImportText.import(texto);
        txtImportar.value = "";

        alert("Diagrama importado correctamente.");
    });
}
   
   /* ========================================================
   DRAG & DROP PARA CREAR NODOS DESDE EL PANEL IZQUIERDO
======================================================== */
document.querySelectorAll("#leftPanel button[onclick^='Engine.createNode']").forEach(btn => {
    btn.setAttribute("draggable", "true");

    btn.addEventListener("dragstart", (e) => {
        const code = btn.getAttribute("onclick");
        const tipoMatch = code.match(/createNode\('([^']+)'\)/);
        if (tipoMatch) {
            e.dataTransfer.setData("nodo-tipo", tipoMatch[1]);
            e.dataTransfer.effectAllowed = "copy";
        }
    });
});

const canvas = document.getElementById("canvasArea");

// Permitir arrastrar sobre el canvas
canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
});

// Crear nodo en la posición soltada
canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    const tipo = e.dataTransfer.getData("nodo-tipo");
    if (!tipo) return;

    // Calcular posición relativa al contenedor
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + canvas.scrollLeft;
    const y = e.clientY - rect.top + canvas.scrollTop;

    Engine.createNode(tipo, x, y);
    
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
    toggleRightPanel(true);
    const nodo = Engine.getNode(id);
    if (!nodo) return;
    // Ocultar campo AsignadoA (grupo)
    const labelAsignadoGroup = document.getElementById("lblAsignadoGroup");
    const inputAsignadoGroup = document.getElementById("inputAsignadoGroup");
    if (labelAsignadoGroup) labelAsignadoGroup.style.display = "none";
    if (inputAsignadoGroup) inputAsignadoGroup.style.display = "none";
    // 🔁 NUEVO: salir explícitamente del modo "grupo"
    if (this.propsEditor) {
        const allChildren = Array.from(this.propsEditor.children);
        allChildren.forEach(el => {
            // Quita el display inline que puso showGroupProperties
            el.style.display = "";
        });

        const header = this.propsEditor.querySelector("h3");
        if (header) {
            header.textContent = "Propiedades del nodo";
            header.style.display = "block";
        }
    }

    // Ocultar botones exclusivos de grupo si existen
    const btnAlignGroup = document.getElementById("btnAlignGroup");
    if (btnAlignGroup) btnAlignGroup.style.display = "none";

    const btnDeleteGroup = document.getElementById("btnDeleteGroup");
    if (btnDeleteGroup) btnDeleteGroup.style.display = "none";

    // 🚫 FORZAR modo nodo individual SIEMPRE en esta función
    const groupPanel = document.getElementById("propsGroup");
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
    if (this.inputAsignadoUsuario)
        this.inputAsignadoUsuario.value = nodo.asignadoUsuario || "";
    if (this.inputColor)
        this.inputColor.value = nodo.color || getDefaultColorByType(nodo.tipo);

    if (this.inputStrokeColor)
        this.inputStrokeColor.value = nodo.strokeColor || "#4a7f84";

    if (this.inputTextColorTitulo)
        this.inputTextColorTitulo.value = nodo.colorTitulo || "#111827";

    if (this.inputTextColorDescripcion)
        this.inputTextColorDescripcion.value = nodo.colorDescripcion || "#333333";

// ============================================================
// ✅ BOTÓN ELIMINAR — FUNCIONAL EN MODO SIMPLE Y MÚLTIPLE
// ============================================================
let btnEliminar = document.getElementById("btnDeleteNode");
if (!btnEliminar) {
    btnEliminar = document.createElement("button");
    btnEliminar.id = "btnDeleteNode";
    btnEliminar.className = "btn";
    btnEliminar.style.background = "#dc2626";
    btnEliminar.style.color = "white";
    btnEliminar.style.width = "100%";
    btnEliminar.style.marginTop = "10px";
    btnEliminar.style.fontWeight = "bold";
    this.propsEditor.appendChild(btnEliminar);
}

// 🔁 Actualizar texto dinámico según contexto
if (Interactions.selectedNodes && Interactions.selectedNodes.size > 1) {
    btnEliminar.textContent = `🗑️ Eliminar selección (${Interactions.selectedNodes.size})`;
} else {
    btnEliminar.textContent = "🗑️ Eliminar nodo";
}

// 🎯 Evento único, se comporta según modo actual
btnEliminar.onclick = () => {
    // Si hay selección múltiple
    if (Interactions.selectedNodes && Interactions.selectedNodes.size > 1) {
        if (!confirm(`¿Eliminar ${Interactions.selectedNodes.size} nodos seleccionados?`)) return;
        Array.from(Interactions.selectedNodes).forEach(id => Engine.deleteNode(id));
        Interactions.selectedNodes.clear();
        UI.clear();
        return;
    }

    // Si hay un nodo individual activo
    if (UI.currentNodeId) {
        Engine.deleteNode(UI.currentNodeId);
        UI.clear();
        return;
    }

    // Si no hay nada seleccionado
    alert("No hay ningún nodo seleccionado para eliminar.");
};

// 🔚 Garantizar que siempre queda el último en el panel
this.propsEditor.appendChild(btnEliminar);
btnEliminar.style.display = "block";


},

    
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

    // 🧹 Ocultar todo lo que no sea lo que queremos mostrar
    const allChildren = Array.from(this.propsEditor.children);
    allChildren.forEach(el => {
        el.style.display = "none";
    });

    // 🔺 MOSTRAR SELECTOR DE TIPO PARA APLICAR A TODOS
    const tipoSelect = document.getElementById("propTipo");
    if (tipoSelect) {
        tipoSelect.style.display = "block";
        const labelTipo = tipoSelect.previousElementSibling;
        if (labelTipo && labelTipo.tagName.toLowerCase() === "label") {
            labelTipo.style.display = "block";
        }
    }
  /* ========================================================
       CAMPO "Asignado A" PARA SELECCIÓN MÚLTIPLE
    ======================================================== */

    // Crear si no existe
    let labelAsignadoGroup = document.getElementById("lblAsignadoGroup");
    let inputAsignadoGroup = document.getElementById("inputAsignadoGroup");

    if (!labelAsignadoGroup) {
        labelAsignadoGroup = document.createElement("label");
        labelAsignadoGroup.id = "lblAsignadoGroup";
        labelAsignadoGroup.textContent = "Asignado a Grupo (grupo)";            
        this.propsEditor.appendChild(labelAsignadoGroup);
    }

    if (!inputAsignadoGroup) {
        inputAsignadoGroup = document.createElement("input");
        inputAsignadoGroup.type = "text";
        inputAsignadoGroup.id = "inputAsignadoGroup";
        inputAsignadoGroup.className = "input";
        inputAsignadoGroup.placeholder = "Asignado…";
        inputAsignadoGroup.style.width = "100%";
        inputAsignadoGroup.style.marginBottom = "10px";

        // Evento → aplicar a todos
        inputAsignadoGroup.addEventListener("input", () => {
            const nuevo = inputAsignadoGroup.value.trim();
            Interactions.selectedNodes.forEach(id => {
                const nodo = Engine.getNode(id);
                if (nodo) {
                    nodo.asignadoA = nuevo;
                }
            });
            Engine.saveHistory();
        });

        this.propsEditor.appendChild(inputAsignadoGroup);
    }

    // Mostrar ambos en modo grupo
    labelAsignadoGroup.style.display = "block";
    inputAsignadoGroup.style.display = "block";
    // 🎨 Mostrar color del nodo
    if (this.inputColor) {
        this.inputColor.style.display = "block";
        const labelColor = this.inputColor.previousElementSibling;
        if (labelColor) labelColor.style.display = "block";
    }

        // ============================================================
    // MOSTRAR VALOR SI TODOS LOS NODOS COINCIDEN
    // ============================================================
    if (Interactions.selectedNodes.size > 0) {

        let primerValor = null;
        let todosIguales = true;

        Interactions.selectedNodes.forEach(id => {
            const nodo = Engine.getNode(id);
            if (!nodo) return;

            if (primerValor === null) {
                primerValor = nodo.asignadoA || "";
            } else {
                if ((nodo.asignadoA || "") !== primerValor) {
                    todosIguales = false;
                }
            }
        });

        // Si todos tienen el mismo valor → mostrarlo
        // Si no → dejar campo vacío
        inputAsignadoGroup.value = todosIguales ? (primerValor || "") : "";
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
        btnAlinear.style.background = "#2ab87dff";
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
/* ============================================================
   BOTONES: EXPANDIR / CONTRAER NODOS
============================================================ */
let btnExpand = document.getElementById("btnExpandNodes");
if (!btnExpand) {
    btnExpand = document.createElement("button");
    btnExpand.id = "btnExpandNodes";
    btnExpand.className = "btn";
    btnExpand.textContent = "⬌ Expandir nodos";
    btnExpand.style.background = "#2ab87dff"; // verde
    btnExpand.style.color = "white";
    btnExpand.style.width = "100%";
    btnExpand.style.marginTop = "6px";

    btnExpand.addEventListener("click", () => {
        Engine.adjustSelectedNodes(25);
    });

    this.propsEditor.appendChild(btnExpand);
} else {
    btnExpand.style.display = "block";
}

let btnContract = document.getElementById("btnContractNodes");
if (!btnContract) {
    btnContract = document.createElement("button");
    btnContract.id = "btnContractNodes";
    btnContract.className = "btn";
    btnContract.textContent = "⬍ Contraer nodos";
    btnContract.style.background = "#73ab93ff"; // rojo
    btnContract.style.color = "white";
    btnContract.style.width = "100%";
    btnContract.style.marginTop = "6px";

    btnContract.addEventListener("click", () => {
        Engine.adjustSelectedNodes(-25);
    });

    this.propsEditor.appendChild(btnContract);
} else {
    btnContract.style.display = "block";
}
// ============================================================
// 🔥 Botón eliminar — siempre el último elemento visible
// ============================================================
let btnEliminar = document.getElementById("btnDeleteNode");
if (!btnEliminar) {
    btnEliminar = document.createElement("button");
    btnEliminar.id = "btnDeleteNode";
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
    // Moverlo al final del panel
    this.propsEditor.appendChild(btnEliminar);
    btnEliminar.textContent = "🗑️ Eliminar selección";
}
btnEliminar.style.display = "block";

    // 🔖 Título del panel
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
        const labelAsignadoGroup = document.getElementById("lblAsignadoGroup");
        const inputAsignadoGroup = document.getElementById("inputAsignadoGroup");
        if (labelAsignadoGroup) labelAsignadoGroup.style.display = "none";
        if (inputAsignadoGroup) inputAsignadoGroup.style.display = "none";
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

        // 🟣 MODO GRUPO: varios nodos seleccionados
        if (Interactions.selectedNodes && Interactions.selectedNodes.size > 1) {

            Interactions.selectedNodes.forEach(id => {
                const nodo = Engine.getNode(id);
                if (!nodo) return;

                nodo.tipo = newTipo;

                // Redibujar cada nodo con la nueva forma
                Renderer.deleteNodeVisual(nodo.id);
                Renderer.renderNode(nodo);

                // Volver a marcarlo como seleccionado múltiple
                const div = document.getElementById(nodo.id);
                if (div) div.classList.add("selected-multi");
            });

            Renderer.updateConnections();
            Engine.saveHistory();

            // Mantener el panel de grupo
            UI.showGroupProperties();
            return;
        }

        // 🟢 MODO NODO ÚNICO (comportamiento anterior)
        if (!UI.currentNodeId) return;

        const nodo = Engine.getNode(UI.currentNodeId);
        if (!nodo) return;

        nodo.tipo = newTipo;

        // 🔁 Redibujar nodo con la nueva forma
        Renderer.deleteNodeVisual(nodo.id);
        Renderer.renderNode(nodo);
        Renderer.updateConnections();

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
   💡 Sincronizar desplazamiento de botones flotantes
   Solo se mueven si hay algún panel lateral visible
============================================================ */
function syncFloatingButtons() {
    const panels = [
      document.querySelector("#rightPanel"),
      document.querySelector(".assign-panel"),
      document.querySelector(".cambios-panel"),
      document.querySelector(".tesauro-panel")
    ];
  
    const buttons = [
      document.querySelector(".floating-assign-btn"),
      document.querySelector(".floating-cambios-btn"),
      document.querySelector(".floating-tesauro-btn")
    ];
  
    // 🔍 Detectar si hay algún panel visible
    const anyVisible = panels.some(p => p && p.classList.contains("visible"));
  
    // 🔄 Aplicar desplazamiento solo si hay alguno abierto
    buttons.forEach(btn => {
      if (!btn) return;
      btn.style.transition = "right 0.3s ease";
      btn.style.right = anyVisible ? "360px" : "20px";
    });
  }
  
  // 👂 Observar cambios de visibilidad en los paneles
  const observer = new MutationObserver(syncFloatingButtons);
  ["#rightPanel", ".assign-panel", ".cambios-panel", ".tesauro-panel"].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) observer.observe(el, { attributes: true, attributeFilter: ["class"] });
  });
  
  // 🧩 Sincronizar también al cargar y tras clics generales
  window.addEventListener("load", syncFloatingButtons);
  document.addEventListener("click", syncFloatingButtons);
  /* ============================================================
   🔒 Cerrar paneles laterales (asignaciones / cambios / tesauro)
   al abrir el panel derecho de propiedades
============================================================ */
function collapseSidePanelsWhenRightPanelOpens() {
    const rightPanel = document.querySelector("#rightPanel");
    const panels = [
      document.querySelector(".assign-panel"),
      document.querySelector(".cambios-panel"),
      document.querySelector(".tesauro-panel")
    ];
  
    if (!rightPanel) return;
  
    const observer = new MutationObserver(() => {
      const isVisible = rightPanel.classList.contains("visible");
  
      if (isVisible) {
        // 🔹 Cerrar todos los paneles laterales
        panels.forEach(p => {
          if (p && p.classList.contains("visible")) {
            p.classList.remove("visible");
          }
        });
      }
    });
  
    // 👀 Observar cambios de visibilidad del panel derecho
    observer.observe(rightPanel, { attributes: true, attributeFilter: ["class"] });
  }
  
  // Activar al cargar
  window.addEventListener("DOMContentLoaded", collapseSidePanelsWhenRightPanelOpens);

  /* ============================================================
   📏 Utilidad: calcular desplazamiento lateral activo (en px)
============================================================ */
function getActivePanelOffset() {
    const rightPanel = document.getElementById("rightPanel");
    if (rightPanel && rightPanel.classList.contains("visible")) {
      return rightPanel.offsetWidth || 350; // ancho real del panel
    }
    return 0;
  }
/* ============================================================
   ARRANQUE
============================================================ */
window.addEventListener("DOMContentLoaded", () => UI.init());

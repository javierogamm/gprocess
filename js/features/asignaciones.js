/* ============================================================
   ASIGNACIONES.JS
   Panel flotante de Asignaciones a Grupo / Usuario
   ------------------------------------------------------------
   - Botón flotante arriba a la derecha del canvas
   - Muestra barra lateral con listas agrupadas
   - Al hacer clic → resalta nodos asignados
============================================================ */

const Asignaciones = {

    btn: null,
    panel: null,
    groupsDiv: null,
    usersDiv: null,

    /* ============================================================
       INICIALIZACIÓN
    ============================================================ */
    init() {
        // Crear botón si no existe
        if (!document.getElementById("btnAsignaciones")) {
            const btn = document.createElement("button");
            btn.id = "btnAsignaciones";
            btn.className = "floating-assign-btn";
            btn.textContent = "📋 Asignaciones";
            document.body.appendChild(btn);
        }

        // Crear panel lateral si no existe
        if (!document.getElementById("assignPanel")) {
            const panel = document.createElement("div");
            panel.id = "assignPanel";
            panel.className = "assign-panel hidden";
            panel.innerHTML = `
                    <h3>👥 Asignaciones</h3>

                    <!-- ⭐ NUEVO: input oculto para cargar el archivo -->
                    <input type="file" id="fileImportAssign" accept=".csv" style="display:none;" />

                    <div id="assignGroups" class="assign-section"></div>
                    <div id="assignUsers" class="assign-section"></div>
                    <button id="btnPasteGrupos" class="assign-import-btn">📋 Cargar grupos (pegar)</button>
                    <button id="btnPasteUsuarios" class="assign-import-btn">📋 Cargar usuarios (pegar)</button>

                `;
            document.body.appendChild(panel);
        }

        this.btn = document.getElementById("btnAsignaciones");
        this.panel = document.getElementById("assignPanel");
        this.groupsDiv = document.getElementById("assignGroups");
        this.usersDiv = document.getElementById("assignUsers");
        
        
                // Evento principal
        this.btn.addEventListener("click", () => {
            this.panel.classList.toggle("visible");
            if (this.panel.classList.contains("visible")) {
                this.render();
            } else {
                this.clearHighlights();
            }
        });

        
        // Cerrar al hacer clic fuera
        document.addEventListener("click", (e) => {
            if (
                this.panel.classList.contains("visible") &&
                !this.panel.contains(e.target) &&
                e.target !== this.btn
            ) {
                this.panel.classList.remove("visible");
                this.clearHighlights();
            }
        });
            // ⭐ POPUP DE PEGADO MANUAL (si no existe)
        if (!document.getElementById("assignPasteModal")) {
            const modal = document.createElement("div");
            modal.id = "assignPasteModal";
            modal.className = "assign-paste-modal hidden";
            modal.innerHTML = `
                <div class="assign-paste-box">
                    <h3 id="assignPasteTitle">Importar</h3>

                    <textarea id="assignPasteTextarea"
                            placeholder="Pega aquí una lista, una entrada por línea…"></textarea>

                    <div class="assign-paste-buttons">
                        <button id="assignPasteImport" class="btn-import">Importar</button>
                        <button id="assignPasteCancel" class="btn-cancel">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
                // ⭐ REFERENCIAS AL POPUP
                this.modal = document.getElementById("assignPasteModal");
                this.modalTitle = document.getElementById("assignPasteTitle");
                this.modalTextarea = document.getElementById("assignPasteTextarea");
                this.modalBtnImport = document.getElementById("assignPasteImport");
                this.modalBtnCancel = document.getElementById("assignPasteCancel");

                // ⭐ Referencias a los botones del panel
                this.btnPasteGrupos = document.getElementById("btnPasteGrupos");
                this.btnPasteUsuarios = document.getElementById("btnPasteUsuarios");

                // ⭐ Variable interna para saber si cargamos GRUPOS o USUARIOS
                this.pasteMode = null;

                // ⭐ Abrir popup en modo GRUPOS
                this.btnPasteGrupos.addEventListener("click", () => {
                    this.pasteMode = "grupos";
                    this.modalTitle.textContent = "Cargar grupos";
                    this.modalTextarea.value = "";
                    this.modal.classList.remove("hidden");
                });

                // ⭐ Abrir popup en modo USUARIOS
                this.btnPasteUsuarios.addEventListener("click", () => {
                    this.pasteMode = "usuarios";
                    this.modalTitle.textContent = "Cargar usuarios";
                    this.modalTextarea.value = "";
                    this.modal.classList.remove("hidden");
                });

                // ⭐ CANCELAR → cerrar popup
                this.modalBtnCancel.addEventListener("click", () => {
                    this.modal.classList.add("hidden");
                });

                // ⭐ IMPORTAR LÍNEAS PEGADAS
            this.modalBtnImport.addEventListener("click", () => {
                const texto = this.modalTextarea.value.trim();
                if (!texto) {
                    alert("No hay contenido para importar.");
                    return;
                }

                const lineas = texto
                    .split(/\r?\n/)
                    .map(l => l.trim())
                    .filter(l => l.length > 0);

                if (lineas.length === 0) {
                    alert("No hay líneas válidas.");
                    return;
                }

                if (this.pasteMode === "grupos") {
                    lineas.forEach(g => Engine.asignaciones.grupos.add(g));
                    alert("✔ Grupos importados correctamente.");
                }

                if (this.pasteMode === "usuarios") {
                    lineas.forEach(u => Engine.asignaciones.usuarios.add(u));
                    alert("✔ Usuarios importados correctamente.");
                }

                // cerrar popup
                this.modal.classList.add("hidden");

                // refrescar panel
                this.render();
            });

    },

    /* ============================================================
       RENDERIZAR CONTENIDO
    ============================================================ */
  render() {
    if (!Engine || !Engine.data) return;

    this.groupsDiv.innerHTML = "";
    this.usersDiv.innerHTML = "";

    /* ============================================================
       1) POOL GLOBAL DE ASIGNACIONES
       ============================================================ */
    const poolGrupos = Array.from(Engine.asignaciones?.grupos || []);
    const poolUsuarios = Array.from(Engine.asignaciones?.usuarios || []);

    /* ============================================================
       2) CONTADORES DE ASIGNACIÓN REAL (por nodos)
       ============================================================ */
    const conteoGrupos = {};
    const conteoUsuarios = {};

    Engine.data.nodos.forEach(n => {
        // ⭐ Soportar arrays múltiples
        const grupos = n.asignadosGrupos || [];
        const usuarios = n.asignadosUsuarios || [];

        // Si no tiene asignaciones, contar como "Sin asignar"
        if (grupos.length === 0) {
            conteoGrupos["Sin asignar"] = (conteoGrupos["Sin asignar"] || 0) + 1;
        } else {
            grupos.forEach(g => {
                const nombre = g.trim();
                if (nombre) {
                    conteoGrupos[nombre] = (conteoGrupos[nombre] || 0) + 1;
                }
            });
        }

        if (usuarios.length === 0) {
            conteoUsuarios["Sin asignar"] = (conteoUsuarios["Sin asignar"] || 0) + 1;
        } else {
            usuarios.forEach(u => {
                const nombre = u.trim();
                if (nombre) {
                    conteoUsuarios[nombre] = (conteoUsuarios[nombre] || 0) + 1;
                }
            });
        }
    });

    /* ============================================================
       3) Unir POOL + ASIGNACIONES por nodos → sin duplicados
       ============================================================ */
    const todosGrupos = new Set([
        ...poolGrupos,
        ...Object.keys(conteoGrupos)
    ]);

    const todosUsuarios = new Set([
        ...poolUsuarios,
        ...Object.keys(conteoUsuarios)
    ]);

    /* ============================================================
       4) Pintar GRUPOS
       ============================================================ */
    let htmlGrupos = "<h4>👥 Grupos</h4>";

    todosGrupos.forEach(nombre => {
        const count = conteoGrupos[nombre] || 0;
        htmlGrupos += `
            <div class="assign-item" data-type="grupo" data-name="${nombre}">
                ${nombre} (${count})
            </div>
        `;
    });

    this.groupsDiv.innerHTML = htmlGrupos;

    /* ============================================================
       5) Pintar USUARIOS
       ============================================================ */
    let htmlUsuarios = "<h4>🙋‍♂️ Usuarios</h4>";

    todosUsuarios.forEach(nombre => {
        const count = conteoUsuarios[nombre] || 0;
        htmlUsuarios += `
            <div class="assign-item" data-type="usuario" data-name="${nombre}">
                ${nombre} (${count})
            </div>
        `;
    });

    this.usersDiv.innerHTML = htmlUsuarios;

    /* ============================================================
       6) Eventos de highlight
       ============================================================ */
    this.panel.querySelectorAll(".assign-item").forEach(el => {
        el.addEventListener("click", () => {
            const tipo = el.dataset.type;
            const name = el.dataset.name;
            const isActive = el.classList.toggle("active");

            this.panel.querySelectorAll(".assign-item").forEach(i => {
                if (i !== el) i.classList.remove("active");
            });

            this.clearHighlights();
            if (isActive) this.highlight(tipo, name);
        });
    });
}
,

    /* ============================================================
       ILUMINAR NODOS
    ============================================================ */
    highlight(tipo, name) {
        Engine.data.nodos.forEach(n => {
            let match = false;

            if (tipo === "grupo") {
                const grupos = n.asignadosGrupos || [];
                if (name === "Sin asignar" && grupos.length === 0) {
                    match = true;
                } else if (grupos.includes(name)) {
                    match = true;
                }
            }

            if (tipo === "usuario") {
                const usuarios = n.asignadosUsuarios || [];
                if (name === "Sin asignar" && usuarios.length === 0) {
                    match = true;
                } else if (usuarios.includes(name)) {
                    match = true;
                }
            }

            if (match) {
                const div = document.getElementById(n.id);
                if (div) div.classList.add("node-highlight");
            }
        });
    },

    /* ============================================================
       LIMPIAR ILUMINACIÓN
    ============================================================ */
    clearHighlights() {
        document.querySelectorAll(".node-highlight").forEach(el => {
            el.classList.remove("node-highlight");
        });
    }
};

/* ============================================================
   ARRANQUE AUTOMÁTICO
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    Asignaciones.init();
});

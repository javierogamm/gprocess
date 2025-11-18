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
                <div id="assignGroups" class="assign-section"></div>
                <div id="assignUsers" class="assign-section"></div>
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
    },

    /* ============================================================
       RENDERIZAR CONTENIDO
    ============================================================ */
    render() {
        if (!Engine || !Engine.data) return;
        this.groupsDiv.innerHTML = "";
        this.usersDiv.innerHTML = "";

        // --- AGRUPAR POR GRUPO ---
        const grupos = {};
        Engine.data.nodos.forEach(n => {
            const g = n.asignadoA?.trim() || "Sin asignar";
            if (!grupos[g]) grupos[g] = [];
            grupos[g].push(n);
        });

        let htmlGrupos = "<h4>👥 Grupos</h4>";
        for (const [nombre, nodos] of Object.entries(grupos)) {
            htmlGrupos += `<div class="assign-item" data-type="grupo" data-name="${nombre}">${nombre} (${nodos.length})</div>`;
        }
        this.groupsDiv.innerHTML = htmlGrupos;

        // --- AGRUPAR POR USUARIO ---
        const usuarios = {};
        Engine.data.nodos.forEach(n => {
            const u = n.asignadoUsuario?.trim() || "Sin asignar";
            if (!usuarios[u]) usuarios[u] = [];
            usuarios[u].push(n);
        });

        let htmlUsuarios = "<h4>🙋‍♂️ Usuarios</h4>";
        for (const [nombre, nodos] of Object.entries(usuarios)) {
            htmlUsuarios += `<div class="assign-item" data-type="usuario" data-name="${nombre}">${nombre} (${nodos.length})</div>`;
        }
        this.usersDiv.innerHTML = htmlUsuarios;

        // Activar eventos
        this.panel.querySelectorAll(".assign-item").forEach(el => {
            el.addEventListener("click", () => {
                const tipo = el.dataset.type;
                const name = el.dataset.name;
                const isActive = el.classList.toggle("active");

                // Limpiar otros
                this.panel.querySelectorAll(".assign-item").forEach(i => {
                    if (i !== el) i.classList.remove("active");
                });

                this.clearHighlights();
                if (isActive) this.highlight(tipo, name);
            });
        });
    },

    /* ============================================================
       ILUMINAR NODOS
    ============================================================ */
    highlight(tipo, name) {
        Engine.data.nodos.forEach(n => {
            const match =
                (tipo === "grupo" && (n.asignadoA?.trim() || "Sin asignar") === name) ||
                (tipo === "usuario" && (n.asignadoUsuario?.trim() || "Sin asignar") === name);
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

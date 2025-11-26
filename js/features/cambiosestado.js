/* ============================================================
   CAMBIOSESTADO.JS
   Panel flotante de Cambios de Estado
   ------------------------------------------------------------
   - Botón flotante 🔄
   - Lista los cambios de estado únicos de las conexiones
   - Al pulsar uno, resalta los nodos destino de ese cambio
============================================================ */

const CambiosEstado = {

    btn: null,
    panel: null,
    listDiv: null,

    /* ============================================================
       INICIALIZACIÓN
    ============================================================ */
    init() {
        // Crear botón si no existe
        if (!document.getElementById("btnCambiosEstado")) {
            const btn = document.createElement("button");
            btn.id = "btnCambiosEstado";
            btn.className = "floating-cambios-btn";
            btn.textContent = "🔄 Cambios de estado";
            document.body.appendChild(btn);
        }

        // Crear panel lateral si no existe
        if (!document.getElementById("panelCambios")) {
            const panel = document.createElement("div");
            panel.id = "panelCambios";
            panel.className = "cambios-panel hidden";
            panel.innerHTML = `
                <h3>🔄 Cambios de estado</h3>
                <div id="cambiosList" class="cambios-section"></div>
            `;
            document.body.appendChild(panel);
        }

        this.btn = document.getElementById("btnCambiosEstado");
        this.panel = document.getElementById("panelCambios");
        this.listDiv = document.getElementById("cambiosList");

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
        this.listDiv.innerHTML = "";

        // Obtener todos los cambios de estado únicos
        const cambios = {};
        Engine.data.conexiones.forEach(c => {
            const cambio = c.cambioEstado?.trim();
            if (cambio) {
                if (!cambios[cambio]) cambios[cambio] = [];
                cambios[cambio].push(c);
            }
        });

        if (Object.keys(cambios).length === 0) {
            this.listDiv.innerHTML = "<p style='color:#555;'>No hay cambios de estado definidos.</p>";
            return;
        }

        let html = "<h4>Estados destino</h4>";
        for (const [estado, conexiones] of Object.entries(cambios)) {
            html += `<div class="cambio-item" data-name="${estado}">${estado} (${conexiones.length})</div>`;
        }
        this.listDiv.innerHTML = html;

        // Activar eventos
        this.panel.querySelectorAll(".cambio-item").forEach(el => {
            el.addEventListener("click", () => {
                const estado = el.dataset.name;
                const isActive = el.classList.toggle("active");

                // Limpiar otros
                this.panel.querySelectorAll(".cambio-item").forEach(i => {
                    if (i !== el) i.classList.remove("active");
                });

                this.clearHighlights();
                if (isActive) this.highlight(estado);
            });
        });
    },

/* ============================================================
   ILUMINAR NODOS DESTINO Y SU SUBÁRBOL HASTA SIGUIENTE CAMBIO
============================================================ */
highlight(estado) {
    // 🔹 Buscar conexiones que llevan a ese cambio de estado
    Engine.data.conexiones.forEach(conn => {
        if (conn.cambioEstado?.trim() === estado) {
            const nodoDestino = Engine.getNode(conn.to);
            if (nodoDestino) {
                this._resaltaSubarbol(nodoDestino);
            }
        }
    });
},

// 🔹 Función recursiva para iluminar hijos y nietos hasta otro cambio de estado
_resaltaSubarbol(nodo) {
    const div = document.getElementById(nodo.id);
    if (div) div.classList.add("node-highlight-cambio");

    // Recorremos todas las salidas del nodo
    if (nodo.outList && nodo.outList.length > 0) {
        nodo.outList.forEach(salida => {
            const conn = Engine.getConnection(salida.connId);
            if (!conn) return;

            // 🚫 Si esta conexión tiene cambio de estado, detenemos aquí
            if (conn.cambioEstado?.trim()) return;

            const hijo = Engine.getNode(salida.id);
            if (hijo) this._resaltaSubarbol(hijo);
        });
    }
}
,
    /* ============================================================
       LIMPIAR ILUMINACIÓN
    ============================================================ */
    clearHighlights() {
        document.querySelectorAll(".node-highlight-cambio").forEach(el => {
            el.classList.remove("node-highlight-cambio");
        });
    }
};

/* ============================================================
   ARRANQUE AUTOMÁTICO
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    CambiosEstado.init();
});

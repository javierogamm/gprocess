/* ============================================================
   TESAURO MANAGER — Popup completo de gestión avanzada
   ------------------------------------------------------------
   - Pantalla completa tipo modal
   - Muestra TODOS los tesauros en una tabla
   - Selector → gestiona sus valores con inputs controlados
   - Popup adicional para "Referenciar Tesauros" masivo
   - Sincroniza siempre con DataTesauro.campos y Engine
============================================================ */

const TesauroManager = {

    modal: null,
    table: null,
    btnClose: null,
    btnSave: null,
    btnOpenRefPopup: null,
    refModal: null,

    // 🔹 Selección múltiple de filas
    selectedRows: new Set(),
    lastSelectedRow: null,

    /* ---------------------------------------------
       Inicializar (solo una vez)
    --------------------------------------------- */
    init() {
        if (this.modal) return; // ya existe

        // === Crear el modal principal ===
        const div = document.createElement("div");
        div.id = "tesauroManagerModal";
        div.style.position = "fixed";
        div.style.inset = "0";
        div.style.background = "rgba(0,0,0,0.55)";
        div.style.display = "none";
        div.style.zIndex = "99999";
        div.style.justifyContent = "center";
        div.style.alignItems = "center";
        div.style.backdropFilter = "blur(2px)";

        // === Caja interna ===
        div.innerHTML = `
            <div id="tmBox" style="
                background:white;
                width:90%;
                height:85%;
                border-radius:12px;
                padding:20px;
                display:flex;
                flex-direction:column;
                box-shadow:0 6px 20px rgba(0,0,0,0.35);
                overflow:hidden;
            ">
                <h2 style="
                    margin:0 0 15px 0;
                    text-align:center;
                    font-size:22px;
                    color:#0f172a;
                ">
                    🧩 Gestor Completo de Tesauros
                </h2>

                <div style="flex:1; overflow:auto;">
                    <table id="tmTable" style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#e2e8f0;">
                                <th style="padding:8px; border:1px solid #cbd5e1;">Referencia</th>
                                <th style="padding:8px; border:1px solid #cbd5e1;">Nombre</th>
                                <th style="padding:8px; border:1px solid #cbd5e1;">Tipo</th>
                                <th style="padding:8px; border:1px solid #cbd5e1;">Valores (selector)</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>

                <button id="tmOpenRefPopup" style="
                    width:100%;
                    margin:10px 0;
                    background:#fef3c7;
                    border:1px solid #f59e0b;
                    border-radius:6px;
                    padding:10px;
                    cursor:pointer;
                    font-weight:bold;
                ">
                    🧪 Referenciar Tesauros
                </button>

                <div style="display:flex; gap:10px; margin-top:12px;">
                    <button id="tmClose" style="
                        flex:1;
                        background:#f1f5f9;
                        border:1px solid #cbd5e1;
                        padding:10px;
                        border-radius:6px;
                        cursor:pointer;
                        font-weight:bold;
                    ">Cerrar</button>

                    <button id="tmSave" style="
                        flex:1;
                        background:#10b981;
                        color:white;
                        border:none;
                        padding:10px;
                        border-radius:6px;
                        cursor:pointer;
                        font-weight:bold;
                    ">💾 Guardar cambios</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);

        this.modal = div;
        this.table = div.querySelector("#tmTable tbody");
        this.btnClose = div.querySelector("#tmClose");
        this.btnSave = div.querySelector("#tmSave");
        this.btnOpenRefPopup = div.querySelector("#tmOpenRefPopup");

        // Eventos
        this.btnClose.addEventListener("click", () => this.close());
        this.btnSave.addEventListener("click", () => this.save());
        this.btnOpenRefPopup.addEventListener("click", () => this.openRefPopup());
    },

    /* ---------------------------------------------
       Abrir popup principal
    --------------------------------------------- */
    open() {
        this.init();
        this.render();
        this.modal.style.display = "flex";
    },

    /* ---------------------------------------------
       Cerrar popup principal
    --------------------------------------------- */
    close() {
        if (this.modal) this.modal.style.display = "none";
    },

    /* ============================================================
       POPUP REFERENCIAR TESAUROS
       - Pega lista de nombres
       - Usa DataTesauro.generarReferenciaDesdeNombre
       - Crea TESAUROS tipo "texto" en bloque
    ============================================================ */
    openRefPopup() {
        if (this.refModal) {
            this.refModal.style.display = "flex";
            return;
        }

        const div = document.createElement("div");
        div.style.position = "fixed";
        div.style.inset = "0";
        div.style.background = "rgba(0,0,0,0.45)";
        div.style.zIndex = "999999";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";

        div.innerHTML = `
            <div style="
                background:white;
                width:500px;
                padding:20px;
                border-radius:12px;
                box-shadow:0 4px 20px rgba(0,0,0,0.35);
                display:flex;
                flex-direction:column;
            ">
                <h2 style="margin:0 0 10px 0; text-align:center;">🧪 Referenciar Tesauros</h2>

                <label><strong>Pega nombres (uno por línea):</strong></label>
                <textarea id="refInput" style="
                    width:100%;
                    height:120px;
                    resize:vertical;
                    padding:8px;
                    margin:8px 0 12px 0;
                    border:1px solid #cbd5e1;
                    border-radius:6px;
                "></textarea>

                <button id="refPreview" style="
                    background:#fef3c7; border:1px solid #f59e0b;
                    padding:8px; border-radius:6px; margin-bottom:10px;
                    font-weight:bold; cursor:pointer;
                ">🔍 Generar referencias</button>

                <table style="width:100%; border-collapse:collapse; margin-bottom:15px;">
                    <thead>
                        <tr style="background:#e2e8f0;">
                            <th style="padding:6px; border:1px solid #cbd5e1;">Nombre</th>
                            <th style="padding:6px; border:1px solid #cbd5e1;">Referencia</th>
                        </tr>
                    </thead>
                    <tbody id="refTable"></tbody>
                </table>

                <div style="display:flex; gap:10px;">
                    <button id="refCancel" style="
                        flex:1; background:#f1f5f9; border:1px solid #cbd5e1;
                        padding:8px; border-radius:6px; cursor:pointer;
                    ">Cancelar</button>

                    <button id="refCreate" style="
                        flex:1; background:#10b981; color:white;
                        border:none; padding:8px; border-radius:6px;
                        cursor:pointer; font-weight:bold;
                    ">💾 Crear Tesauros</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);
        this.refModal = div;

        div.querySelector("#refCancel").addEventListener("click", () => {
            this.refModal.style.display = "none";
        });

        div.querySelector("#refPreview").addEventListener("click", () => this.refPreviewFn());
        div.querySelector("#refCreate").addEventListener("click", () => this.refCreateFn());
    },

    /* ---------------------------------------------
       Generar tabla de previsualización de referencias
    --------------------------------------------- */
    refPreviewFn() {
        if (!this.refModal) return;

        const textarea = this.refModal.querySelector("#refInput");
        const tbody = this.refModal.querySelector("#refTable");
        if (!textarea || !tbody) return;

        const raw = textarea.value || "";
        const lines = raw
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        tbody.innerHTML = "";

        if (!lines.length) return;

        const existentes = new Set(
            (DataTesauro.campos || []).map(c => (c.ref || "").toLowerCase())
        );

        lines.forEach(nombre => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #e2e8f0";

            const tdNombre = document.createElement("td");
            tdNombre.style.padding = "6px";
            tdNombre.style.border = "1px solid #cbd5e1";
            tdNombre.textContent = nombre;
            tdNombre.dataset.nombre = nombre;

            const tdRef = document.createElement("td");
            tdRef.style.padding = "6px";
            tdRef.style.border = "1px solid #cbd5e1";

            const input = document.createElement("input");
            input.type = "text";
            input.className = "ref-ref-input";
            input.style.width = "100%";
            input.style.padding = "4px";
            input.style.border = "1px solid #cbd5e1";
            input.style.borderRadius = "4px";

            const refSugerida = (DataTesauro && typeof DataTesauro.generarReferenciaDesdeNombre === "function")
                ? DataTesauro.generarReferenciaDesdeNombre(nombre)
                : nombre.replace(/\s+/g, "_");

            input.value = refSugerida;

            // si ya existe esa referencia → marcar en rojito
            if (existentes.has(refSugerida.toLowerCase())) {
                input.style.background = "#fee2e2";
            }

            tdRef.appendChild(input);

            tr.appendChild(tdNombre);
            tr.appendChild(tdRef);
            tbody.appendChild(tr);
        });
    },

    /* ---------------------------------------------
       Crear realmente los tesauros tipo "texto"
       a partir de la tabla de previsualización
    --------------------------------------------- */
    refCreateFn() {
        if (!this.refModal) return;

        const tbody = this.refModal.querySelector("#refTable");
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll("tr"));
        if (!rows.length) {
            alert("No hay nada que crear. Primero genera las referencias.");
            return;
        }

        const lista = DataTesauro.campos || [];
        const existentes = new Set(lista.map(c => (c.ref || "").toLowerCase()));

        let creados = 0;

        rows.forEach(row => {
            const tdNombre = row.querySelector("td[data-nombre]") || row.cells[0];
            const nombre = (tdNombre.dataset.nombre || tdNombre.textContent || "").trim();
            const inputRef = row.querySelector(".ref-ref-input");
            const ref = (inputRef?.value || "").trim();

            if (!nombre || !ref) return;

            const refLower = ref.toLowerCase();
            if (existentes.has(refLower)) {
                // ya existe esa referencia → saltar
                return;
            }

            existentes.add(refLower);

            const nuevo = {
                id: TesauroManager.generateId(),
                ref,
                nombre,
                tipo: "texto",
                opciones: []
            };

            lista.push(nuevo);
            creados++;
        });

        if (creados > 0) {
            DataTesauro.campos = lista;
            DataTesauro.sync();
            DataTesauro.render();
            this.render();
        }

        alert(`✅ Creados ${creados} tesauros nuevos.`);
        this.refModal.style.display = "none";
    },

    /* ---------------------------------------------
       Render tabla completa del gestor
    --------------------------------------------- */
    render() {
        if (!this.table) return;

        this.table.innerHTML = "";

        const lista = DataTesauro.campos || [];

        lista.forEach(c => {
            const row = document.createElement("tr");
            row.style.borderBottom = "1px solid #e2e8f0";
            row.style.cursor = "pointer";
            row.classList.add("tm-row");
            row.dataset.id = c.id;

            // restaurar selección si ya estaba
            if (TesauroManager.selectedRows.has(c.id)) {
                row.classList.add("tm-row-selected");
            }

            // === COLUMNA: Referencia ===
            const tdRef = document.createElement("td");
            tdRef.style.padding = "6px";
            tdRef.style.border = "1px solid #cbd5e1";
            tdRef.contentEditable = true;
            tdRef.dataset.field = "ref";
            tdRef.dataset.id = c.id;
            tdRef.innerText = c.ref || "";

            // === COLUMNA: Nombre ===
            const tdNombre = document.createElement("td");
            tdNombre.style.padding = "6px";
            tdNombre.style.border = "1px solid #cbd5e1";
            tdNombre.contentEditable = true;
            tdNombre.dataset.field = "nombre";
            tdNombre.dataset.id = c.id;
            tdNombre.innerText = c.nombre || "";

            // === COLUMNA: Tipo ===
            const tdTipo = document.createElement("td");
            tdTipo.style.padding = "6px";
            tdTipo.style.border = "1px solid #cbd5e1";
            tdTipo.dataset.id = c.id;

            tdTipo.innerHTML = `
               <select data-field="tipo" data-id="${c.id}" class="tmTipoSelect" style="width:100%; padding:4px;">
                    <option value="selector"  ${c.tipo === "selector" ? "selected" : ""}>Selector</option>
                    <option value="si_no"     ${c.tipo === "si_no" ? "selected" : ""}>Sí/No</option>
                    <option value="texto"     ${c.tipo === "texto" ? "selected" : ""}>Texto</option>
                    <option value="numerico"  ${c.tipo === "numerico" ? "selected" : ""}>Numérico</option>
                    <option value="moneda"    ${c.tipo === "moneda" ? "selected" : ""}>Moneda</option>
                    <option value="fecha"     ${c.tipo === "fecha" ? "selected" : ""}>Fecha</option>
                 </select>
            `;

            // === COLUMNA: Valores (si es selector) ===
            const tdValores = document.createElement("td");
            tdValores.style.padding = "6px";
            tdValores.style.border = "1px solid #cbd5e1";

            if (c.tipo === "selector") {
                const opts = Array.isArray(c.opciones) ? c.opciones : [];

                const htmlOpts = opts.map(o => {
                    const safeRef = (window.DataTesauro && typeof DataTesauro.escapeAttr === "function")
                        ? DataTesauro.escapeAttr(o.ref)
                        : (o.ref || "").replace(/"/g, "&quot;");
                    const safeVal = (window.DataTesauro && typeof DataTesauro.escapeAttr === "function")
                        ? DataTesauro.escapeAttr(o.valor)
                        : (o.valor || "").replace(/"/g, "&quot;");

                    return `
                        <div class="tm-opt-row" data-oid="${o.id}"
                             style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">

                            <input class="tm-opt-ref" type="text" value="${safeRef}"
                                   placeholder="Ref"
                                   style="flex:0.6; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">

                            <input class="tm-opt-valor" type="text" value="${safeVal}"
                                   placeholder="Valor"
                                   style="flex:1; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">

                            <button class="tm-opt-del"
                                    style="background:#fee2e2; border:1px solid #fca5a5;
                                           border-radius:4px; padding:4px 6px; cursor:pointer;">
                                🗑️
                            </button>
                        </div>
                    `;
                }).join("");

                tdValores.innerHTML = `
                    <div class="tm-opt-box" data-id="${c.id}" style="display:flex; flex-direction:column; gap:6px;">

                        <div class="tm-opt-list">
                            ${htmlOpts}
                        </div>

                        <div style="display:flex; gap:6px; margin-top:4px;">
                            <input class="tm-new-opt-ref" type="text"
                                   placeholder="Ref"
                                   style="flex:0.6; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">

                            <input class="tm-new-opt-valor" type="text"
                                   placeholder="Valor"
                                   style="flex:1; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">

                            <button class="tm-opt-add"
                                    style="background:#d1fae5; border:1px solid #10b981;
                                           border-radius:4px; padding:4px 6px; cursor:pointer;">
                                ➕
                            </button>
                        </div>

                    </div>
                `;
            } else {
                tdValores.innerHTML = `<i style="color:#94a3b8;">(no aplica)</i>`;
            }

            row.appendChild(tdRef);
            row.appendChild(tdNombre);
            row.appendChild(tdTipo);
            row.appendChild(tdValores);

            this.table.appendChild(row);
        });

        // ============================================================
        // ⭐ Cambio de tipo → cambio masivo si hay varias filas seleccionadas
        // ============================================================
        this.modal.querySelectorAll(".tmTipoSelect").forEach(sel => {
            sel.addEventListener("change", (e) => {
                const nuevoTipo = e.target.value;

                const applyTipo = (item) => {
                    item.tipo = nuevoTipo;
                    if (nuevoTipo === "selector") {
                        if (!Array.isArray(item.opciones)) {
                            item.opciones = [];
                        }
                    } else {
                        item.opciones = [];
                    }
                };

                // Si hay varias filas seleccionadas → cambio masivo
                if (TesauroManager.selectedRows && TesauroManager.selectedRows.size > 1) {
                    TesauroManager.selectedRows.forEach(id => {
                        const item = DataTesauro.campos.find(x => x.id === id);
                        if (!item) return;
                        applyTipo(item);
                    });

                    this.render();
                    return;
                }

                // Cambio normal (una sola fila)
                const id = e.target.dataset.id;
                const item = DataTesauro.campos.find(x => x.id === id);
                if (!item) return;

                applyTipo(item);

                this.render();

                // Si pasa a selector y es un único cambio → enfocar inputs de opciones
                if (nuevoTipo === "selector") {
                    const box = this.modal.querySelector(`.tm-opt-box[data-id='${id}']`);
                    if (box) {
                        const refInput = box.querySelector(".tm-new-opt-ref");
                        if (refInput) refInput.focus();
                    }
                }
            });
        });

        // -----------------------------------------------------------
        // ⭐ EVENTOS DE OPCIONES DE SELECTOR
        // -----------------------------------------------------------

        // ➕ Añadir opción
        this.modal.querySelectorAll(".tm-opt-add").forEach(btn => {
            btn.addEventListener("click", e => {
                const box = e.currentTarget.closest(".tm-opt-box");
                if (!box) return;

                const id = box.dataset.id;
                const item = DataTesauro.campos.find(x => x.id === id);
                if (!item) return;

                const refInput = box.querySelector(".tm-new-opt-ref");
                const valInput = box.querySelector(".tm-new-opt-valor");

                const ref = (refInput?.value || "").trim();
                const valor = (valInput?.value || "").trim();
                if (!ref || !valor) return;

                if (!Array.isArray(item.opciones)) item.opciones = [];

                item.opciones.push({
                    id: TesauroManager.generateId(),
                    ref,
                    valor
                });

                // limpiar inputs de alta
                if (refInput) refInput.value = "";
                if (valInput) valInput.value = "";

                this.render(); // refrescar UI
            });
        });

        // 🗑️ Borrar opción
        this.modal.querySelectorAll(".tm-opt-del").forEach(btn => {
            btn.addEventListener("click", e => {
                const rowOpt = e.currentTarget.closest(".tm-opt-row");
                if (!rowOpt) return;
                const oid = rowOpt.dataset.oid;

                const box = e.currentTarget.closest(".tm-opt-box");
                if (!box) return;

                const id = box.dataset.id;
                const item = DataTesauro.campos.find(x => x.id === id);
                if (!item || !Array.isArray(item.opciones)) return;

                item.opciones = item.opciones.filter(o => o.id !== oid);

                this.render();
            });
        });

        // ✏️ Cambios en inputs de opciones (REF / VALOR)
        this.modal.querySelectorAll(".tm-opt-ref, .tm-opt-valor").forEach(input => {
            input.addEventListener("input", e => {
                const rowOpt = e.currentTarget.closest(".tm-opt-row");
                if (!rowOpt) return;
                const oid = rowOpt.dataset.oid;

                const box = e.currentTarget.closest(".tm-opt-box");
                if (!box) return;
                const id = box.dataset.id;

                const item = DataTesauro.campos.find(x => x.id === id);
                if (!item || !Array.isArray(item.opciones)) return;

                const opt = item.opciones.find(o => o.id === oid);
                if (!opt) return;

                const refInput = rowOpt.querySelector(".tm-opt-ref");
                const valInput = rowOpt.querySelector(".tm-opt-valor");

                opt.ref = (refInput?.value || "").trim();
                opt.valor = (valInput?.value || "").trim();
            });
        });

        // ============================================================
        // 🎯 Selección múltiple de filas (Ctrl / Shift / click normal)
        // ============================================================
        const rows = Array.from(this.modal.querySelectorAll(".tm-row"));

        rows.forEach(row => {
            row.addEventListener("click", (e) => {
                const id = row.dataset.id;
                if (!id) return;

                // CTRL / CMD → alternar selección individual
                if (e.ctrlKey || e.metaKey) {
                    if (TesauroManager.selectedRows.has(id)) {
                        TesauroManager.selectedRows.delete(id);
                        row.classList.remove("tm-row-selected");
                    } else {
                        TesauroManager.selectedRows.add(id);
                        row.classList.add("tm-row-selected");
                    }
                    TesauroManager.lastSelectedRow = row;
                    return;
                }

                // SHIFT → seleccionar rango
                if (e.shiftKey && TesauroManager.lastSelectedRow) {
                    const allRows = Array.from(TesauroManager.modal.querySelectorAll(".tm-row"));
                    const start = allRows.indexOf(TesauroManager.lastSelectedRow);
                    const end = allRows.indexOf(row);

                    if (start !== -1 && end !== -1) {
                        const [min, max] = [Math.min(start, end), Math.max(start, end)];

                        TesauroManager.selectedRows.clear();
                        allRows.forEach((r, i) => {
                            r.classList.remove("tm-row-selected");
                            if (i >= min && i <= max) {
                                TesauroManager.selectedRows.add(r.dataset.id);
                                r.classList.add("tm-row-selected");
                            }
                        });
                    }
                    return;
                }

                // CLICK normal → seleccionar una sola fila
                TesauroManager.selectedRows.clear();
                rows.forEach(r => r.classList.remove("tm-row-selected"));

                TesauroManager.selectedRows.add(id);
                row.classList.add("tm-row-selected");
                TesauroManager.lastSelectedRow = row;
            });
        });
    },

    /* ---------------------------------------------
       Convertir opciones -> texto editable (no usado, pero lo dejamos por si acaso)
    --------------------------------------------- */
    serializeOptions(opts) {
        if (!Array.isArray(opts)) return "";
        return opts.map(o => `${o.ref} = ${o.valor}`).join("\n");
    },

    /* ---------------------------------------------
       Guardar cambios al DataTesauro (ref, nombre, tipo)
       Las opciones ya se van sincronizando en caliente
    --------------------------------------------- */
    save() {
        const lista = DataTesauro.campos;

        // 1) Guardar referencias y nombres (celdas contentEditable)
        this.modal.querySelectorAll("[contenteditable]").forEach(el => {
            const field = el.dataset.field;
            const id = el.dataset.id;
            const item = lista.find(x => x.id === id);
            if (item && (field === "ref" || field === "nombre")) {
                item[field] = el.innerText.trim();
            }
        });

        // 2) Guardar tipos (ya aplicados, pero por si acaso)
        this.modal.querySelectorAll("select[data-field='tipo']").forEach(sel => {
            const id = sel.dataset.id;
            const item = lista.find(x => x.id === id);
            if (item) {
                item.tipo = sel.value;
                if (item.tipo === "selector" && !Array.isArray(item.opciones)) {
                    item.opciones = [];
                }
                if (item.tipo !== "selector") {
                    item.opciones = [];
                }
            }
        });

        // Opciones ya sincronizadas vía eventos de inputs y botones

        // 4) Sincronizar con Engine + refrescar panel lateral
        DataTesauro.sync();
        DataTesauro.render();

        alert("✔ Tesauros actualizados correctamente.");
        this.close();
    },

    generateId() {
        return Math.random().toString(36).substring(2, 9);
    }
};

window.TesauroManager = TesauroManager;

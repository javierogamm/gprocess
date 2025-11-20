/* ============================================================
   DATATESAURO.JS
   Panel flotante de creación y gestión de campos tipo "tesauro"
   - Botón flotante 📚
   - Panel lateral derecho con lista de campos
   - Sincroniza con Engine.tesauro (guardar/exportar/importar)
   - Soporta campos tipo "selector" con valores (referencia/valor)
   - Clic en campo selector → colapsar/expandir lista de valores
   - Autogenera referencia en CamelCase según nombre (de lo general a lo particular)
============================================================ */

const DataTesauro = {
  btn: null,
  panel: null,
  listDiv: null,

  // Copia de trabajo que SIEMPRE se sincroniza con Engine.tesauro
  campos: [],

  /* ============================================================
     INICIALIZACIÓN
  ============================================================ */
  init() {
    // 🔘 Botón flotante
    if (!document.getElementById("btnTesauro")) {
      const btn = document.createElement("button");
      btn.id = "btnTesauro";
      btn.className = "floating-tesauro-btn";
      btn.textContent = "📚 Tesauro";
      document.body.appendChild(btn);
    }

    // 📜 Panel lateral
    if (!document.getElementById("panelTesauro")) {
      const panel = document.createElement("div");
      panel.id = "panelTesauro";
      panel.className = "tesauro-panel hidden";
      panel.innerHTML = `
        <h3>📚 Campos del Tesauro</h3>
        <div id="tesauroList" class="tesauro-list"></div>

      `;
      document.body.appendChild(panel);
    }

    this.btn = document.getElementById("btnTesauro");
    this.panel = document.getElementById("panelTesauro");
    this.listDiv = document.getElementById("tesauroList");

    /* ============================================================
       🎛️ Eventos
    ============================================================ */

    // Mostrar / ocultar panel
    this.btn.addEventListener("click", () => {
      this.panel.classList.toggle("visible");
      if (this.panel.classList.contains("visible")) this.render();
    });

    // 💾 Guardar nuevo campo
    const btnGuardar = document.getElementById("btnGuardarCampo");
    if (btnGuardar) {
      btnGuardar.addEventListener("click", () => {
        const ref = document.getElementById("tRef").value.trim();
        const nombre = document.getElementById("tNombre").value.trim();
        const tipo = document.getElementById("tTipo").value;

        if (!ref || !nombre) {
          alert("Completa al menos Referencia y Nombre.");
          return;
        }

        const nuevo = { id: this.generateId(), ref, nombre, tipo };
        if (tipo === "selector") nuevo.opciones = [];
        this.campos.push(nuevo);

        const Eng = window.Engine ?? (typeof Engine !== "undefined" ? Engine : null);
        if (Eng) {
          Eng.tesauro = [...this.campos];
          Eng.saveHistory?.();
          document.dispatchEvent(
            new CustomEvent("tesauroUpdated", { detail: { source: "DataTesauro:save" } })
          );
        }

        this.render();

        document.getElementById("tRef").value = "";
        document.getElementById("tNombre").value = "";
        document.getElementById("tTipo").value = "selector";
      });
    }

    // 🧠 Autogenerar referencia al escribir el nombre
    const inputRef = document.getElementById("tRef");
    const inputNombre = document.getElementById("tNombre");
    inputNombre.addEventListener("input", () => {
      const nombre = inputNombre.value.trim();
      const refAuto = this.generarReferenciaDesdeNombre(nombre);
      inputRef.value = refAuto;
    });

    // Al cargar, si Engine ya trae tesauro → sincroniza vista
    if (window.Engine && Array.isArray(Engine.tesauro) && Engine.tesauro.length) {
      this.campos = [...Engine.tesauro];
      this.render();
    }

    // Cuando Engine importe un JSON → refrescar
    document.addEventListener("tesauroUpdated", () => {
      if (window.Engine && Array.isArray(Engine.tesauro)) {
        this.campos = [...Engine.tesauro];
        this.render();
      }
    });
  },

  /* ============================================================
     AUTOGENERAR REFERENCIA DESDE NOMBRE (con excepciones combinables)
  ============================================================ */
  generarReferenciaDesdeNombre(nombre) {
    if (!nombre) return "";

    // 1️⃣ Palabras a ignorar
    const stopWords = [
      "de", "del", "la", "el", "los", "las", "un", "una",
      "para", "por", "en", "con", "sin", "al", "a", "y", "o", "u", "que"
    ];

    // 2️⃣ Excepciones con orden fijo (no se invierten)
    const excepciones = {
      "referencia catastral": "ReferenciaCatastral",
      "comunidad autonoma": "ComunidadAutonoma",
      "proyecto tecnico": "ProyectoTecnico",
      "proyecto basico": "ProyectoBasico",
      "proyecto de ejecucion": "ProyectoEjecucion",
      "memoria tecnica": "MemoriaTecnica",
      "licencia de actividades": "LicenciaActividades",
      "informe tecnico": "InformeTecnico",
      "documento de identidad": "DocumentoIdentidad",
      "codigo postal": "CodigoPostal"
    };

    // 3️⃣ Normalizar texto
    let texto = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    // 4️⃣ Detectar excepciones presentes
    const usadas = [];
    for (const key in excepciones) {
      if (texto.includes(key)) usadas.push({ key, ref: excepciones[key] });
    }

    // 5️⃣ Reemplazar excepciones en el texto por tokens temporales
    usadas.forEach((ex, i) => {
      const token = `__EXC${i}__`;
      texto = texto.replace(ex.key, token);
    });

    // 6️⃣ Dividir palabras (quitando stopwords)
    const palabras = texto.split(/\s+/).filter(p => p && !stopWords.includes(p));

    // 7️⃣ Reemplazar tokens de excepciones por su referencia fija
    const procesadas = palabras.map(p => {
      const match = p.match(/__EXC(\d+)__/);
      if (match) {
        const i = parseInt(match[1]);
        return usadas[i].ref; // ← mete la referencia ya en CamelCase
      }
      return p;
    });

    if (procesadas.length === 0) return "";

    // 8️⃣ Invertir orden de las palabras (solo las normales, las excepciones se mantienen fijas)
    const invertidas = procesadas.reverse();

    // 9️⃣ Formatear en CamelCase
    const camel = invertidas
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");

    return camel;
  },

/* ============================================================
   RENDERIZAR LISTA DE CAMPOS AGRUPADOS POR TIPO (colapsables)
   ✅ Con autogeneración de referencia y descolapso automático
============================================================ */
render() {
  if (!this.listDiv) return;

  // 🔹 Definir grupos
  const grupos = [
    { tipo: "selector", titulo: "Selector I18N" },
    { tipo: "si_no", titulo: "Sí / No" },
    { tipo: "texto", titulo: "Texto" },
    { tipo: "numerico", titulo: "Numérico" }
  ];

  // 🔹 Inicializar colapsables (por defecto, cerrados)
  if (this.collapsed_crear === undefined) this.collapsed_crear = true;
  grupos.forEach(g => {
    if (this[`collapsed_${g.tipo}`] === undefined) this[`collapsed_${g.tipo}`] = true;
  });

  // ===========================================================
  // 📦 HTML del bloque principal
  // ===========================================================
  let html = `
  <!-- 🔹 Bloque Crear nuevo campo -->
  <div class="tesauro-group">
    <div class="tesauro-group-header" data-group="crear"
         style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;
                background:#e5e7eb; padding:6px; border-radius:6px; margin-bottom:6px;">
      <strong>➕ Crear nuevo campo</strong>
      <span class="arrow">${this.collapsed_crear ? "▶" : "▼"}</span>
    </div>

    <div class="tesauro-group-body" data-body="crear"
         style="display:${this.collapsed_crear ? "none" : "block"}; padding:8px;
                border:1px solid #ddd; border-radius:6px; margin-bottom:8px;">
      <label>Nombre</label>
      <input id="tNombre" type="text" placeholder="Ej: Documento principal"
             style="width:100%; margin-bottom:4px;">
      <label>Referencia</label>
      <input id="tRef" type="text" placeholder="Ej: ref_doc"
             style="width:100%; margin-bottom:4px;">
      <label>Tipo</label>
      <select id="tTipo" style="width:100%; margin-bottom:6px;">
        <option value="selector">Selector</option>
        <option value="si_no">Sí / No</option>
        <option value="numerico">Numérico</option>
        <option value="texto">Texto</option>
      </select>
      <button id="btnGuardarCampo" class="btn btn-guardar" style="width:100%;">💾 Guardar campo</button>
    </div>
  </div>`;

  // ===========================================================
  // 🧩 Listado de campos agrupados
  // ===========================================================
  if (!this.campos || this.campos.length === 0) {
    html += `<p style="color:#555; margin-top:10px;">No hay campos creados todavía.</p>`;
  } else {
    grupos.forEach(gr => {
      const camposTipo = this.campos.filter(c => c.tipo === gr.tipo);
      const collapsed = this[`collapsed_${gr.tipo}`];
      const arrow = collapsed ? "▶" : "▼";

      html += `
        <div class="tesauro-group">
          <div class="tesauro-group-header" data-group="${gr.tipo}"
               style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;
                      background:#e5e7eb; padding:6px; border-radius:6px; margin-top:6px;">
            <strong>${gr.titulo}</strong>
            <span class="arrow">${arrow}</span>
          </div>
          <div class="tesauro-group-body" data-body="${gr.tipo}"
               style="display:${collapsed ? "none" : "block"}; border:1px solid #ddd;
                      border-radius:6px; padding:6px; margin-bottom:8px;">`;

      if (camposTipo.length === 0) {
        html += `<p style="color:#777;">(sin campos ${gr.titulo})</p>`;
      } else {
        camposTipo.forEach(c => { html += this.renderTesauroItem(c); });
      }

      html += `</div></div>`;
    });
  }

  // ===========================================================
  // 🧩 Inyectar y vincular eventos dinámicos
  // ===========================================================
  this.listDiv.innerHTML = html;

  /* ------------------------------------------
     🎛️ Colapsar/expandir grupos
  ------------------------------------------ */
  this.listDiv.querySelectorAll(".tesauro-group-header").forEach(h => {
    h.addEventListener("click", () => {
      const g = h.dataset.group;
      this[`collapsed_${g}`] = !this[`collapsed_${g}`];
      this.render();
    });
  });

  /* ------------------------------------------
     🧠 Autogenerar referencia dinámicamente
  ------------------------------------------ */
  const inputNombre = this.listDiv.querySelector("#tNombre");
  const inputRef = this.listDiv.querySelector("#tRef");
  if (inputNombre && inputRef) {
    inputNombre.addEventListener("input", () => {
      const nombre = inputNombre.value.trim();
      const refAuto = this.generarReferenciaDesdeNombre(nombre);
      inputRef.value = refAuto;
    });
  }

  /* ------------------------------------------
     💾 Guardar nuevo campo
     🔸 Ahora descolapsa automáticamente su grupo
  ------------------------------------------ */
  const btnGuardar = this.listDiv.querySelector("#btnGuardarCampo");
  if (btnGuardar) {
    btnGuardar.addEventListener("click", () => {
      const ref = document.getElementById("tRef").value.trim();
      const nombre = document.getElementById("tNombre").value.trim();
      const tipo = document.getElementById("tTipo").value;
      if (!ref || !nombre) return alert("Completa Referencia y Nombre.");

      const nuevo = { id: this.generateId(), ref, nombre, tipo };
      if (tipo === "selector") nuevo.opciones = [];
      this.campos.push(nuevo);

      // ✅ Descolapsar automáticamente el grupo del tipo recién creado
      this[`collapsed_${tipo}`] = false;

      this.sync();
      this.render();
    });
  }

  /* ------------------------------------------
     🗑️ Eliminar campo
  ------------------------------------------ */
  this.listDiv.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.target.dataset.id;
      this.campos = this.campos.filter(c => c.id !== id);
      this.sync();
      this.render();
    });
  });

  /* ------------------------------------------
     ➕ Añadir valor (selector)
  ------------------------------------------ */
  this.listDiv.querySelectorAll(".btn-add-opt").forEach(btn => {
    btn.addEventListener("click", e => {
      const campoId = e.currentTarget.dataset.id;
      const item = e.currentTarget.closest(".tesauro-item");
      const refInput = item.querySelector(".opt-ref");
      const valorInput = item.querySelector(".opt-valor");
      const ref = (refInput?.value || "").trim();
      const valor = (valorInput?.value || "").trim();
      if (!ref || !valor) return alert("Indica 'Referencia' y 'Valor'.");

      const campo = this.campos.find(x => x.id === campoId);
      if (!campo) return;
      if (!Array.isArray(campo.opciones)) campo.opciones = [];

      campo.opciones.push({ id: this.generateId(), ref, valor });
      this.sync();
      this.render();
    });
  });

  /* ------------------------------------------
     🧲 Drag & Drop
  ------------------------------------------ */
  this.listDiv.querySelectorAll(".drag-pill").forEach(pill => {
    pill.addEventListener("dragstart", ev => {
      const payload = this.buildDragPayloadFromEl(pill);
      if (!payload) return;
      const json = JSON.stringify(payload);
      ev.dataTransfer.setData("application/x-tesauro", json);
      ev.dataTransfer.setData("text/plain", json);
      ev.dataTransfer.effectAllowed = "copy";
      document.body.classList.add("drag-tesauro-active");
    });
    pill.addEventListener("dragend", () => {
      document.body.classList.remove("drag-tesauro-active");
    });
  });
},

/* ============================================================
   SUBFUNCIÓN para renderizar cada item del grupo
============================================================ */
renderTesauroItem(c) {
  const isSelector = c.tipo === "selector";
  const opts = Array.isArray(c.opciones) ? c.opciones : [];

  let html = `
  <div class="tesauro-item" data-id="${c.id}" style="border:1px solid #e5e7eb; padding:6px; border-radius:6px; margin-bottom:6px;">
    <div class="tesauro-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${c.nombre}</strong>
        <span style="color:#555;">(${c.ref})</span><br>
        <small>Tipo: ${this.prettyTipo(c.tipo)}</small>
      </div>
      <button class="btn-eliminar" data-id="${c.id}" title="Eliminar">🗑️</button>
    </div>`;

  if (isSelector) {
    const items = opts.map(o => `
      <li class="opt-item" data-oid="${o.id}" style="display:flex; justify-content:space-between; padding:2px 0; border-bottom:1px dashed #ddd;">
        <div><code>${o.ref}</code> — ${o.valor}</div>
        <button class="btn-del-opt" data-id="${c.id}" data-oid="${o.id}" title="Eliminar valor">🗑️</button>
      </li>`).join("");
    html += `
      <div class="selector-add" style="margin-top:6px;">
        <input type="text" class="opt-valor" placeholder="Valor visible" style="width:48%;">
        <input type="text" class="opt-ref" placeholder="Ref (p.ej. ALTA)" style="width:30%;">
        <button class="btn-add-opt" data-id="${c.id}" style="width:18%;">+</button>
      </div>
      <ul style="list-style:none; margin:4px 0; padding:0;">${items}</ul>`;
  } else if (c.tipo === "si_no") {
    html += `
      <div style="margin-top:6px;">
        <span class="drag-pill" draggable="true" data-dnd="si_no" data-campo-ref="${this.escapeAttr(c.ref)}" data-valor="Sí"
              style="padding:2px 8px; border:1px solid #10b981; color:#065f46; border-radius:10px; background:#ecfdf5;">Sí</span>
        <span class="drag-pill" draggable="true" data-dnd="si_no" data-campo-ref="${this.escapeAttr(c.ref)}" data-valor="No"
              style="padding:2px 8px; border:1px solid #ef4444; color:#7f1d1d; border-radius:10px; background:#fef2f2;">No</span>
      </div>`;
  } else if (c.tipo === "texto" || c.tipo === "numerico") {
    html += `
      <div style="margin-top:6px;">
        <span class="drag-pill" draggable="true" data-dnd="${c.tipo}" data-campo-ref="${this.escapeAttr(c.ref)}" data-needs-input="true"
              style="font-size:12px; border:1px solid #cbd5e1; padding:2px 8px; border-radius:10px; background:#fff;">✎ Arrastrar para escribir…</span>
      </div>`;
  }

  html += `</div>`;
  return html;
}
,
  /* ============================================================
     HELPERS DnD
  ============================================================ */
  buildDragPayloadFromEl(el) {
    const tipo = el.getAttribute("data-dnd");
    const nombre = el.getAttribute("data-campo-nombre") || "";
    const refCampo = el.getAttribute("data-campo-ref") || "";
    const needsInput = el.getAttribute("data-needs-input") === "true";

    if (tipo === "selector") {
      return {
        tipo, nombre, refCampo,
        optRef: el.getAttribute("data-opt-ref") || "",
        valor: el.getAttribute("data-opt-valor") || ""
      };
    }
    if (tipo === "si_no") {
      return { tipo, nombre, refCampo, valor: el.getAttribute("data-valor") || "" };
    }
    if (tipo === "texto" || tipo === "numerico") {
      return { tipo, nombre, refCampo, needsInput };
    }
    return null;
  },

  escapeAttr(txt) {
    return (txt || "").replace(/"/g, "&quot;");
  },

  /* ============================================================
     SINCRONIZAR CON ENGINE
  ============================================================ */
  sync() {
    const Eng = window.Engine ?? (typeof Engine !== "undefined" ? Engine : null);
    if (Eng) {
      Eng.tesauro = [...this.campos];
      Eng.saveHistory?.();
      document.dispatchEvent(
        new CustomEvent("tesauroUpdated", { detail: { source: "DataTesauro:sync" } })
      );
    }
  },

  /* ============================================================
     HELPERS
  ============================================================ */
  prettyTipo(tipo) {
    switch (tipo) {
      case "selector": return "Selector";
      case "si_no": return "Sí / No";
      case "numerico": return "Numérico";
      case "texto": return "Texto";
      default: return tipo;
    }
  },

  generateId() {
    return Math.random().toString(36).substring(2, 9);
  }
};
/* ============================================================
   🔒 Cierra el panel del Tesauro cuando se interactúa con otra parte del editor
============================================================ */
document.addEventListener("click", (e) => {
  if (!DataTesauro.panel) return;

  // 🔸 Si el panel NO está visible, no hacemos nada
  if (!DataTesauro.panel.classList.contains("visible")) return;

  // 🔸 No cerrar si se hace clic dentro del propio panel o en su botón
  if (DataTesauro.panel.contains(e.target) || e.target.id === "btnTesauro") return;

  // 🔸 Si el clic fue en cualquier parte del canvas (nodos, conexiones o fondo)
  const esNodo = e.target.closest(".node");
  const esConexion = e.target.closest("svg path");
  const esCanvas = e.target.closest("#canvasArea") || e.target.closest("#nodesContainer");
  const esUI = e.target.closest("#propsEditor") || e.target.closest("#propsConn");

  if (esNodo || esConexion || esCanvas || esUI) {
    DataTesauro.panel.classList.remove("visible");
  }
});

// Botón exportar Tesauro
document.addEventListener("DOMContentLoaded", () => {
  const btnTesCSV = document.getElementById("btnExportTesauro");
  if (btnTesCSV) {
    btnTesCSV.addEventListener("click", () => DataTesauro.exportTesauroCSV());
  }
});

/* ============================================================
   EXPORTAR TESAURO A CSV NORMALIZADO 
   (Sobrescribir/Eliminar = "No", Clasificación = "5.00.00. SIN CLASIFICACIÓN",
    Propiedad tipo campo 1 = "Botones" si es Sí/No)
============================================================ */
/* ============================================================
   EXPORTAR TESAURO A DOS CSVs:
   1️⃣ Tesauro.csv → todos los campos
   2️⃣ Tesauro_Valores.csv → solo los selectores con sus valores
============================================================ */
DataTesauro.exportTesauroCSV = function() {
  const lista = (window.Engine?.tesauro?.length ? Engine.tesauro : this.campos) || [];
  if (!lista.length) {
    alert("No hay campos de tesauro definidos para exportar.");
    return;
  }

  // ===========================================================
  // 1️⃣ TESAURO PRINCIPAL
  // ===========================================================
  const header1 = [
    "Nombre Entidad","Sobrescribir","Eliminar","Clasificación","Referencia",
    "Nombre Castellano","Nombre Catalán","Nombre Valenciano","Nombre Gallego","Nombre Euskera","Nombre Balear",
    "Nombre Inglés","Nombre Francés","Nombre Alemán","Nombre Italiano",
    "Ayuda Castellano","Ayuda Catalán","Ayuda Valenciano","Ayuda Gallego","Ayuda Euskera","Ayuda Balear",
    "Ayuda Inglés","Ayuda Francés","Ayuda Alemán","Ayuda Italiano",
    "Tipo de campo","Propiedad del tipo de campo 1","Propiedad del tipo de campo 2","Propiedad del tipo de campo 3","Propiedad del tipo de campo 4",
    "Momento de captura","Agrupación","Obligatorio","Campo asunto"
  ];

  const traducirTipo = (t) => {
    switch (t) {
      case "selector": return "Selector I18N";
      case "texto": return "Texto";
      case "numerico": return "Numérico";
      case "si_no": return "Sí/No";
      default: return t || "";
    }
  };

  const rows1 = lista.map(c => {
    const tipoVisible = traducirTipo(c.tipo);
    const propiedad1 = (c.tipo === "si_no") ? "Botones" : ""; // ✅ Botones para Sí/No

    return [
      "",                                // Nombre Entidad
      "No",                              // Sobrescribir
      "No",                              // Eliminar
      "5.00.00. SIN CLASIFICACIÓN",      // Clasificación
      c.ref || "",                       // Referencia
      c.nombre || "",                    // Nombre Castellano
      "", "", "", "", "",                // Otros idiomas
      "", "", "", "",                    // Idiomas extra
      "", "", "", "", "", "", "", "", "", "", // Ayudas
      tipoVisible,                       // Tipo de campo
      propiedad1,                        // Propiedad 1
      "", "", "",                        // Propiedades 2-4
      "", "", "", ""                     // Momento, Agrupación, Obligatorio, Campo asunto
    ];
  });

  const csv1 = [header1.join(";"), ...rows1.map(r => r.map(clean).join(";"))].join("\n");
  downloadCSV("Tesauro.csv", csv1);

  // ===========================================================
  // 2️⃣ TESAURO VALORES (SOLO SELECTORES)
  // ===========================================================
  const selectores = lista.filter(c => c.tipo === "selector" && Array.isArray(c.opciones) && c.opciones.length);
  if (selectores.length) {
    const header2 = ["Referencia Tesauro", "Referencia I18N", "Idioma", "Valor"];
    const rows2 = [];

    selectores.forEach(sel => {
      sel.opciones.forEach(opt => {
        rows2.push([
          sel.ref || "",
          opt.ref || "",
          "Castellano",
          opt.valor || ""
        ]);
      });
    });

    const csv2 = [header2.join(";"), ...rows2.map(r => r.map(clean).join(";"))].join("\n");
    downloadCSV("Tesauro_Valores.csv", csv2);
  }

  console.log("📚 Exportación completada: Tesauro.csv + Tesauro_Valores.csv");

  // ===========================================================
  // UTILIDADES INTERNAS
  // ===========================================================
  function downloadCSV(nombre, contenido) {
    const bom = "\uFEFF";
    const blob = new Blob([bom + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clean(t) {
    return (t || "").toString().replace(/\n/g, " ").replace(/;/g, ",").trim();
  }
};/* ============================================================
   EXPORTAR VALORES DE CAMPOS SELECTOR A CSV (I18N)
   Formato:
   Referencia Tesauro | Referencia I18N | Idioma | Valor
============================================================ */
DataTesauro.exportTesauroValoresCSV = function() {
  const lista = (window.Engine?.tesauro?.length ? Engine.tesauro : this.campos) || [];
  if (!lista.length) {
    alert("No hay campos de tesauro definidos para exportar.");
    return;
  }

  // Filtramos solo los selectores con opciones
  const selectores = lista.filter(c => c.tipo === "selector" && Array.isArray(c.opciones) && c.opciones.length);
  if (!selectores.length) {
    alert("No hay campos de tipo 'selector' con opciones para exportar.");
    return;
  }

  const header = ["Referencia Tesauro", "Referencia I18N", "Idioma", "Valor"];
  const rows = [];

  selectores.forEach(sel => {
    sel.opciones.forEach(opt => {
      rows.push([
        sel.ref || "",      // Referencia del tesauro
        opt.ref || "",      // Referencia I18N (de la opción)
        "Castellano",       // Idioma fijo
        opt.valor || ""     // Valor visible
      ]);
    });
  });

  const csv = [header.join(";"), ...rows.map(r => r.map(clean).join(";"))].join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Tesauro_Valores.csv";
  a.click();
  URL.revokeObjectURL(url);

  console.log("📚 Exportación completada: Tesauro_Valores.csv");

  function clean(t) {
    return (t || "").toString().replace(/\n/g, " ").replace(/;/g, ",").trim();
  }
};
/* ============================================================
   ARRANQUE
============================================================ */
window.addEventListener("DOMContentLoaded", () => DataTesauro.init());
window.DataTesauro = DataTesauro;

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
    alert("Completa Referencia y Nombre.");
    return;
  }

  const editingId = btnGuardar.dataset.editing;

  if (editingId) {
    // ⭐ ACTUALIZAR EXISTENTE ⭐
    const campo = this.campos.find(c => c.id === editingId);
    if (campo) {
      campo.ref = ref;
      campo.nombre = nombre;
      campo.tipo = tipo;

      if (tipo === "selector" && !campo.opciones) campo.opciones = [];
    }

    // Volver a modo "Crear"
    btnGuardar.textContent = "💾 Guardar campo";
    delete btnGuardar.dataset.editing;

  } else {
    // ⭐ CREAR NUEVO CAMPO ⭐
    const nuevo = { id: this.generateId(), ref, nombre, tipo };
    if (tipo === "selector") nuevo.opciones = [];
    this.campos.push(nuevo);
  }

  // Sincronizar y refrescar UI
  this.sync();
  this.render();
});
    }

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
     TRANSFORMAR CONDICIONES A TESAUROS (desde conexiones)
  ============================================================ */
  transformarCondicionesDesdeConexiones(conexiones, options = {}) {
    const { mostrarAlertas = true } = options;

    if (!Array.isArray(conexiones)) {
      if (mostrarAlertas) {
        alert("❌ El JSON no contiene un array válido de conexiones.");
      }
      return { totalDetectados: 0, creados: 0 };
    }

    const mapa = {};
    for (const conn of conexiones) {
      const nombre = (conn?.condicionNombre || "").trim();
      const valor = (conn?.condicionValor || "").trim();
      if (!nombre) continue;

      if (!mapa[nombre]) mapa[nombre] = new Set();
      if (valor) mapa[nombre].add(valor);
    }

    const nuevos = [];

    for (const [nombre, valoresSet] of Object.entries(mapa)) {
      const valores = Array.from(valoresSet);
      if (valores.length === 0) continue;

      const refCond = this.generarReferenciaDesdeNombre(nombre);
      const lowerVals = valores.map(v => v.toLowerCase());

      const normalizados = [...new Set(
        lowerVals.map(v =>
          (v || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
        )
      )];

      if (normalizados.includes("si") || normalizados.includes("no")) {
        nuevos.push({
          id: this.generateId(),
          ref: refCond,
          nombre,
          tipo: "si_no",
          opciones: []
        });
      } else if (valores.length > 1) {
        const opts = valores.map(v => ({
          id: this.generateId(),
          ref: this.generarReferenciaDesdeNombre(v),
          valor: v
        }));
        nuevos.push({
          id: this.generateId(),
          ref: refCond,
          nombre,
          tipo: "selector",
          opciones: opts
        });
      } else {
        nuevos.push({
          id: this.generateId(),
          ref: refCond,
          nombre,
          tipo: "texto",
          opciones: []
        });
      }
    }

    if (!nuevos.length) {
      if (mostrarAlertas) {
        alert("⚠️ No se detectaron condiciones válidas en las conexiones del JSON.");
      }
      return { totalDetectados: 0, creados: 0 };
    }

    const refsExistentes = new Set(this.campos.map(c => c.ref));
    const nuevosUnicos = nuevos.filter(c => !refsExistentes.has(c.ref));

    if (nuevosUnicos.length) {
      this.campos.push(...nuevosUnicos);
      console.log(`🧩 ${nuevosUnicos.length} nuevos tesauros añadidos desde JSON.`);
    } else {
      console.log("ℹ️ Todos los tesauros del JSON ya existían, no se añadieron duplicados.");
    }

    this.sync();
    this.render();

    if (mostrarAlertas) {
      alert(`✅ Tesauros añadidos correctamente (${nuevosUnicos.length} nuevos).`);
    }

    return { totalDetectados: nuevos.length, creados: nuevosUnicos.length };
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
    { tipo: "numerico", titulo: "Numérico" },
    { tipo: "moneda",    titulo: "Moneda" },
    { tipo: "fecha",     titulo: "Fecha" }
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
        <option value="moneda">Moneda</option>
        <option value="fecha">Fecha</option>
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
}

// ===========================================================
// 📦 Renderizar grupos de tipos existentes
// ===========================================================
grupos.forEach(gr => {
  const camposTipo = this.campos.filter(c => c.tipo === gr.tipo);
  const collapsed = this[`collapsed_${gr.tipo}`];
  const arrow = collapsed ? "▶" : "▼";

  html += `
    <div class="tesauro-group">
      <div class="tesauro-group-header" data-group="${gr.tipo}"
           style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;
                  background:#e5e7eb; padding:6px; border-radius:6px; margin-top:6px;">
       <strong>${gr.titulo} (${camposTipo.length})</strong>
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

// ===========================================================
// 🆕 BOTONES SIEMPRE VISIBLES (importar y transformar)
// ===========================================================
html += `
  <div class="tesauro-import-zone" style="margin-top:16px; border-top:1px solid #ccc; padding-top:8px;">
            <!-- ⭐ NUEVO BOTÓN: Importar Tesauro CSV -->
    <button id="btnImportTesauro" class="btn tesauro-accent-btn"
            style="width:100%; margin-top:8px; border-radius:6px; font-weight:bold;">
      📥 Importar Tesauro CSV
    </button>

    <button id="btnImportTesauroPaste" class="btn tesauro-accent-btn"
            style="width:100%; margin-top:8px; border-radius:6px; font-weight:bold;">
      📋 Importar Tesauros (copypaste)
    </button>

    <!-- Input oculto real (1 o 2 archivos) -->
    <input 
        type="file" 
        id="inputTesauroFiles" 
        accept=".csv" 
        multiple 
        style="display:none;">
  </div>

  <div class="tesauro-transform-zone" style="margin-top:10px;">
    <button id="btnTransformCondiciones" class="btn tesauro-accent-btn"
            style="width:100%; border-radius:6px; font-weight:bold;">
      ⚡ Transformar condiciones a Tesauros
    </button>

    <input id="inputTransformCondiciones" type="file" accept=".json"
           style="display:none;">

    <!-- ⭐ NUEVO BOTÓN VERDE -->
    <button id="btnTesauroManager" class="btn btn-manager tesauro-accent-btn"
            style="
              width:100%;
              margin-top:8px;
              border-radius:6px;
              font-weight:bold;
            ">
      🧩 Gestor Completo de Tesauros
    </button>

  </div>
`;

  // ===========================================================
  // 🧩 Inyectar y vincular eventos dinámicos
  // ===========================================================
  this.listDiv.innerHTML = html;

  const btnManager = this.listDiv.querySelector("#btnTesauroManager");
if (btnManager) {
    btnManager.addEventListener("click", () => {
        console.log("🧩 Abriendo TesauroManager…");
        if (window.TesauroManager?.open) {
            TesauroManager.open();
        } else {
            alert("TesauroManager.js no está cargado.");
        }
    });
}

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

// ⚡ === EVENTO TRANSFORMAR CONDICIONES A TESAUROS (desde conexiones del JSON) ===
const btnTransform = this.listDiv.querySelector("#btnTransformCondiciones");
const inputTransform = this.listDiv.querySelector("#inputTransformCondiciones");

if (btnTransform && inputTransform) {
  btnTransform.addEventListener("click", () => {
    inputTransform.value = "";
    inputTransform.click(); // abre el selector JSON
  });

  inputTransform.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const jsonText = await file.text();
      const data = JSON.parse(jsonText);

      this.transformarCondicionesDesdeConexiones(data.conexiones, { mostrarAlertas: true });
    } catch (err) {
      console.error(err);
      alert("❌ Error al procesar el JSON: " + err.message);
    }
  });
}

// 🆕 === IMPORTACIÓN TESAURO: botón + selector de archivos ===
const btnImport = this.listDiv.querySelector("#btnImportTesauro");
const btnImportPaste = this.listDiv.querySelector("#btnImportTesauroPaste");

if (btnImport) {

  // Crear input file oculto
  let inputFiles = document.getElementById("inputTesauroFiles");
  if (!inputFiles) {
    inputFiles = document.createElement("input");
    inputFiles.id = "inputTesauroFiles";
    inputFiles.type = "file";
    inputFiles.accept = ".csv";
    inputFiles.multiple = true;  // ⭐ Permite seleccionar 1 o 2 archivos
    inputFiles.style.display = "none";
    document.body.appendChild(inputFiles);
  }

  // Al pulsar el botón → abrir selector
  btnImport.addEventListener("click", () => {
    inputFiles.value = "";
    inputFiles.click();
  });

  // Procesar archivos seleccionados
  inputFiles.addEventListener("change", async (e) => {
    const files = [...e.target.files];
    if (files.length < 1) {
      console.warn("❌ Debes seleccionar al menos un CSV.");
      return;
    }

    console.log("🔥 Archivos seleccionados:");
    files.forEach(f => console.log(" - ", f.name));

    const contents = await Promise.all(files.map(f => f.text()));

    let mainCSV = null;
    let valCSV  = null;

    // Detectar qué CSV es cuál
    for (let i = 0; i < contents.length; i++) {
      const text = contents[i].trimStart().split("\n")[0].toLowerCase();

      if (text.includes("nombre entidad") && text.includes("referencia") && text.includes("castellano")) {
        mainCSV = contents[i];
        console.log("📄 Detectado como Tesauro PRINCIPAL:", files[i].name);
      }

      if (text.startsWith("referencia tesauro;") || 
          text.startsWith("referencia;i18n") || 
          text.includes("idioma;valor")) {
        valCSV = contents[i];
        console.log("📄 Detectado como Tesauro VALORES:", files[i].name);
      }
    }

    // Si no hay CSV principal → error
    if (!mainCSV) {
      console.warn("❌ No se ha encontrado el archivo principal de tesauros.");
      alert("❌ Debes seleccionar al menos el archivo Tesauro.csv");
      return;
    }

    // Si no hay valores → sigue OK pero avisa
    if (!valCSV) {
      console.warn("⚠ No se detectó archivo de valores. Los selectores quedarán sin opciones.");
    }

    console.log("🔥 LLAMANDO A importTesauroFromCSV() (modo selector)");
    DataTesauro.importTesauroFromCSV(mainCSV, valCSV);
  });
}

if (btnImportPaste) {
  btnImportPaste.addEventListener("click", () => {
    if (typeof this.openPasteImportModal === "function") {
      this.openPasteImportModal();
    }
  });
}

/* ------------------------------------------
   💾 Guardar nuevo campo
------------------------------------------ */
const btnGuardar = this.listDiv.querySelector("#btnGuardarCampo");
if (btnGuardar) {
  btnGuardar.addEventListener("click", () => {
    const ref = document.getElementById("tRef").value.trim();
    const nombre = document.getElementById("tNombre").value.trim();
    const tipo = document.getElementById("tTipo").value;

    if (!ref || !nombre) return alert("Completa Referencia y Nombre.");

    // Crear campo
    const nuevo = { id: this.generateId(), ref, nombre, tipo };

    if (tipo === "selector") {
      nuevo.opciones = [];
      nuevo._needsOptions = true; // ⭐ OBLIGA A METER OPCIONES
    }

    this.campos.push(nuevo);

    // Abrir grupo del tipo
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

    // Añadir la opción
    campo.opciones.push({
      id: this.generateId(),
      ref,
      valor
    });

    // ⭐ Si estaba marcado como needing-options y ya hay al menos 1 → limpiamos
    if (campo._needsOptions && campo.opciones.length > 0) {
      delete campo._needsOptions;
    }

    this.sync();
    this.render();
  });
});
// ⭐ EDITAR CAMPO (edición en el panel) ⭐
this.listDiv.querySelectorAll(".btn-editar").forEach(btn => {
  btn.addEventListener("click", e => {
    const id = e.currentTarget.dataset.id;
    const campo = this.campos.find(c => c.id === id);
    if (!campo) return;

    // Abrir panel si estaba colapsado
    this.collapsed_crear = false;
    this.render();

    // Rellenar los campos del formulario
    const inputNombre = document.getElementById("tNombre");
    const inputRef    = document.getElementById("tRef");
    const inputTipo   = document.getElementById("tTipo");
    const btnGuardar  = document.getElementById("btnGuardarCampo");

    inputNombre.value = campo.nombre;
    inputRef.value    = campo.ref;
    inputTipo.value   = campo.tipo;

    // Cambiar botón "Guardar" → "Actualizar"
    btnGuardar.textContent = "💾 Actualizar campo";
    btnGuardar.dataset.editing = id; // Marcar que estamos editando

    // Desplegar grupo de edición
    this.collapsed_crear = false;
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
/* ------------------------------------------
   🗑️ Eliminar valor dentro de selector
------------------------------------------ */
this.listDiv.querySelectorAll(".btn-del-opt").forEach(btn => {
  btn.addEventListener("click", e => {
    const campoId = e.currentTarget.dataset.id;
    const optId = e.currentTarget.dataset.oid;

    const campo = this.campos.find(c => c.id === campoId);
    if (!campo || !Array.isArray(campo.opciones)) return;

    campo.opciones = campo.opciones.filter(o => o.id !== optId);

    this.sync();
    this.render();
  });
});

  // ------------------------------------------
// 🎛️ Toggle edición
// ------------------------------------------
this.listDiv.querySelectorAll(".btn-editar").forEach(btn => {
  btn.addEventListener("click", e => {
    const id = e.target.dataset.id;
    const item = this.campos.find(x => x.id === id);
    item._editMode = !item._editMode;
    this.render();
  });
});

// ------------------------------------------
// ❌ Cancelar edición
// ------------------------------------------
this.listDiv.querySelectorAll(".btn-cancel-edit").forEach(btn => {
  btn.addEventListener("click", e => {
    const id = e.target.dataset.id;
    const item = this.campos.find(x => x.id === id);
    item._editMode = false;
    this.render();
  });
});

// 💾 Guardar cambios
this.listDiv.querySelectorAll(".btn-save-edit").forEach(btn => {
  btn.addEventListener("click", e => {
    const id = e.target.dataset.id;
    const item = this.campos.find(x => x.id === id);

    const card = btn.closest(".tesauro-item");
    const nombre = card.querySelector(".edit-nombre").value.trim();
    const ref = card.querySelector(".edit-ref").value.trim();
    const tipoNuevo = card.querySelector(".edit-tipo").value;
    const tipoAnterior = item.tipo;

    item.nombre = nombre;
    item.ref = ref;

    // ⭐ Si el tipo ha cambiado a SELECTOR → marcar necesidad de opciones
    if (tipoNuevo === "selector" && tipoAnterior !== "selector") {
      item.tipo = "selector";
      item.opciones = [];
      item._needsOptions = true;   // ⬅️💥 aquí está la magia
    }

    // ⭐ Si cambia a cualquier otra cosa → borrar opciones y marcadores
    else if (tipoNuevo !== "selector") {
      item.tipo = tipoNuevo;
      item.opciones = [];
      delete item._needsOptions;
    }

    // ⭐ Si es selector y ya lo era → mantener opciones existentes
    else {
      item.tipo = "selector";
    }

    item._editMode = false;

    this.sync();
    this.render();
  });
});
},

/* ============================================================
   SUBFUNCIÓN para renderizar cada item del grupo
============================================================ */
renderTesauroItem(c) {
  const isSelector = c.tipo === "selector";
  const opts = Array.isArray(c.opciones) ? c.opciones : [];

  // Toggle edición
  const editMode = c._editMode === true;

  let html = `
  <div class="tesauro-item" data-id="${c.id}" 
       style="border:1px solid #e5e7eb; padding:6px; border-radius:6px; margin-bottom:6px;">

    <div class="tesauro-header"
         style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">

      <div style="flex:1;">
        <strong>${c.nombre}</strong>
        <span style="color:#555;">(${c.ref})</span><br>
        <small>Tipo: ${this.prettyTipo(c.tipo)}</small>
      </div>

      <div style="display:flex; flex-direction:row; gap:4px; align-items:center;">
          <button class="btn-editar" data-id="${c.id}" title="Editar"
            style="background:#f3f4f6; border:1px solid #cbd5e1; border-radius:6px;
                   width:26px; height:26px; display:inline-flex; justify-content:center; align-items:center; padding:0; margin:0;">⚙️</button>

         <button class="btn-eliminar" data-id="${c.id}" title="Eliminar"
            style="background:#fee2e2; border:1px solid #fca5a5; border-radius:6px;
                   width:26px; height:26px; display:inline-flex; justify-content:center; align-items:center; padding:0; margin:0;">🗑️</button>
      </div>

    </div>
  `;

  // ============================================================
  // 🔧 FORMULARIO DE EDICIÓN INLINE
  // ============================================================
  if (editMode) {
    html += `
      <div class="edit-block" style="margin-top:6px; padding:8px; background:#eef2ff; border-radius:6px;">
        
        <label style="font-size:12px; color:#374151;">Nombre</label>
        <input type="text" class="edit-nombre" value="${c.nombre}" 
               style="width:100%; margin-bottom:4px;">

        <label style="font-size:12px; color:#374151;">Referencia</label>
        <input type="text" class="edit-ref" value="${c.ref}" 
               style="width:100%; margin-bottom:4px;">

        <label style="font-size:12px; color:#374151;">Tipo</label>
        <select class="edit-tipo" style="width:100%; margin-bottom:6px;">
          <option value="selector" ${c.tipo==="selector"?"selected":""}>Selector</option>
          <option value="si_no" ${c.tipo==="si_no"?"selected":""}>Sí / No</option>
          <option value="texto" ${c.tipo==="texto"?"selected":""}>Texto</option>
          <option value="numerico" ${c.tipo==="numerico"?"selected":""}>Numérico</option>
        </select>

        <div style="display:flex; gap:6px; margin-top:8px;">
          <button class="btn-save-edit" data-id="${c.id}" 
                  style="flex:1; background:#2563eb; color:white; border:none; padding:6px; border-radius:6px;">
            Guardar
          </button>
          <button class="btn-cancel-edit" data-id="${c.id}" 
                  style="flex:1; background:#e5e7eb; border:none; padding:6px; border-radius:6px;">
            Cancelar
          </button>
        </div>
      </div>
    `;
  }

  // ============================================================
  // 💬 CONTENIDO NORMAL
  // ============================================================
  if (!editMode) {

    // ------------------------------------
    // ⭐ SELECTOR
    // ------------------------------------
    if (isSelector) {

      // ⭐ AVISO DE QUE FALTAN OPCIONES
      if (c._needsOptions && opts.length === 0) {
        html += `
          <div style="
            background:#fef3c7;
            padding:6px;
            border-radius:6px;
            margin-bottom:8px;
            border:1px solid #fcd34d;
            color:#92400e;
            font-size:12px;">
            ⚠ Este campo es un <strong>selector vacío</strong>. Añade al menos una opción.
          </div>
        `;
      }

const items = opts.map(o => `
  <li class="opt-item" data-oid="${o.id}" 
      style="display:flex; justify-content:space-between; align-items:center; padding:4px 6px; 
             margin:3px 0; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;">
    <span class="drag-pill"
      draggable="true"
      data-dnd="selector"
      data-campo-nombre="${this.escapeAttr(c.nombre)}"
      data-campo-ref="${this.escapeAttr(c.ref)}"
      data-opt-ref="${this.escapeAttr(o.ref)}"
      data-opt-valor="${this.escapeAttr(o.valor)}"
      style="display:inline-block; padding:2px 8px; border-radius:9999px; 
             background:#dbeafe; color:#1e40af; font-size:13px; font-weight:500; cursor:grab;">
  • ${o.valor}
</span>
    <button class="btn-del-opt" data-id="${c.id}" data-oid="${o.id}" 
            title="Eliminar valor"
            style="border:none; background:transparent; cursor:pointer; font-size:14px;">🗑️</button>
  </li>
`).join("");
      html += `
        <div class="selector-add" style="margin-top:6px;">
          <input type="text" class="opt-valor" placeholder="Valor visible" style="width:48%;">
          <input type="text" class="opt-ref" placeholder="Ref (p.ej. ALTA)" style="width:30%;">
          <button class="btn-add-opt" data-id="${c.id}" style="width:18%;">+</button>
        </div>

        <ul style="list-style:none; margin:4px 0; padding:0;">${items}</ul>
      `;
    }

// ------------------------------------
// SI/NO
// ------------------------------------
else if (c.tipo === "si_no") {
  html += `
    <div style="margin-top:6px;">
      <span class="drag-pill" draggable="true"
            data-dnd="si_no"
            data-campo-nombre="${this.escapeAttr(c.nombre)}"
            data-campo-ref="${this.escapeAttr(c.ref)}"
            data-valor="Sí"
            style="padding:2px 8px; border:1px solid #10b981; color:#065f46; border-radius:10px; background:#ecfdf5;">Sí</span>
      <span class="drag-pill" draggable="true"
            data-dnd="si_no"
            data-campo-nombre="${this.escapeAttr(c.nombre)}"
            data-campo-ref="${this.escapeAttr(c.ref)}"
            data-valor="No"
            style="padding:2px 8px; border:1px solid #ef4444; color:#7f1d1d; border-radius:10px; background:#fef2f2;">No</span>
    </div>`;
}

// ------------------------------------
// TEXTO / NUMERICO
// ------------------------------------
else if (c.tipo === "texto" || c.tipo === "numerico" || c.tipo === "moneda" || c.tipo === "fecha") 
  
  {  
  html += `
    <div style="margin-top:6px;">
      <span class="drag-pill" draggable="true"
            data-dnd="${c.tipo}"
            data-campo-nombre="${this.escapeAttr(c.nombre)}"
            data-campo-ref="${this.escapeAttr(c.ref)}"
            data-needs-input="true"
            style="font-size:12px; border:1px solid #cbd5e1; padding:2px 8px; border-radius:10px; background:#fff;">
        ✎ Arrastrar para escribir…
      </span>
    </div>`;
}

  }

  html += `</div>`;
  return html;
}


, // 👈 coma si no hay

// 🧩 === IMPORTADOR POR COPYPESTE DE TESAUROS ===
openPasteImportModal() {
  if (this.pasteImportModal) {
    this.pasteImportModal.style.display = "flex";
    const textarea = this.pasteImportModal.querySelector("#tesauroPasteInput");
    if (textarea) textarea.value = "";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "tesauroPasteModal";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "999999";

  modal.innerHTML = `
    <div style="
      background:white;
      width:620px;
      max-width:95%;
      padding:20px;
      border-radius:12px;
      box-shadow:0 6px 20px rgba(0,0,0,0.35);
      display:flex;
      flex-direction:column;
      gap:12px;
    ">
      <h2 style="margin:0; text-align:center;">📋 Importar Tesauros (copypaste)</h2>

      <p style="margin:0; color:#475569; font-size:14px;">
        Pega aquí la tabla copiada (Excel / app). Se aceptan dos formatos:
        (1) B=Referencia, C=Nombre, D=Tipo; (2) A=Momento, B=Agrupación, C=Referencia,
        D=Nombre, E=Tipo.
      </p>

      <textarea id="tesauroPasteInput" style="
        width:100%;
        min-height:160px;
        resize:vertical;
        padding:10px;
        border:1px solid #cbd5e1;
        border-radius:8px;
        font-family:inherit;
      "></textarea>

      <div style="display:flex; gap:10px;">
        <button id="tesauroPasteCancel" style="
          flex:1; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;
        ">Cancelar</button>
        <button id="tesauroPasteLoad" style="
          flex:1; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;
        ">Cargar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  this.pasteImportModal = modal;

  modal.querySelector("#tesauroPasteCancel").addEventListener("click", () => {
    this.pasteImportModal.style.display = "none";
  });

  modal.querySelector("#tesauroPasteLoad").addEventListener("click", () => {
    const text = modal.querySelector("#tesauroPasteInput")?.value || "";
    this.startPasteImportFlow(text);
  });
},

startPasteImportFlow(rawText) {
  const parsed = this.parsePasteTesauros(rawText);
  if (!parsed.length) {
    alert("❌ No se detectaron filas válidas. Revisa el copypaste.");
    return;
  }

  this.pasteImportModal.style.display = "none";

  const selectors = parsed.filter(item => item.needsI18nConfig);
  this.pasteImportState = {
    campos: parsed,
    selectorsQueue: selectors,
    opcionesPorRef: {}
  };

  if (selectors.length === 0) {
    this.applyPasteImport();
    return;
  }

  this.openSelectorConfigModal();
},

parsePasteTesauros(rawText) {
  const lines = (rawText || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const resultados = [];

  lines.forEach(line => {
    if (this.isPasteNoiseLine(line)) return;

    const cols = this.normalizePasteColumns(this.splitPasteColumns(line));
    if (cols.length < 3) return;

    const parsed = this.parsePasteColumns(cols);
    if (!parsed) return;

    if (!parsed.ref || !parsed.nombre) return;

    const normalized = this.mapPasteTipo(parsed.tipoRaw);

    resultados.push({
      id: this.generateId(),
      ref: parsed.ref,
      nombre: parsed.nombre,
      tipo: normalized.tipo,
      opciones: [],
      needsI18nConfig: normalized.needsI18nConfig,
      momento: parsed.momento,
      agrupacion: parsed.agrupacion
    });
  });

  return resultados;
},

splitPasteColumns(line) {
  let cols = line.split("\t");
  if (cols.length === 1) {
    cols = line.split(/\s{2,}/g);
  }
  return cols.map(c => c.trim());
},

normalizePasteColumns(cols) {
  const normalized = [...cols];
  const last = normalized[normalized.length - 1];
  if (last && last.toLowerCase() === "borrar") {
    normalized.pop();
  }
  return normalized;
},

parsePasteColumns(cols) {
  const hasExtendedFormat = cols.length >= 5 && (cols[2] || cols[3] || cols[4]);
  if (hasExtendedFormat) {
    return {
      momento: (cols[0] || "").trim(),
      agrupacion: (cols[1] || "").trim(),
      ref: (cols[2] || "").trim(),
      nombre: (cols[3] || "").trim(),
      tipoRaw: (cols[4] || "").trim()
    };
  }

  return {
    momento: "",
    agrupacion: "",
    ref: (cols[1] || "").trim(),
    nombre: (cols[2] || "").trim(),
    tipoRaw: (cols[3] || "").trim()
  };
},

isPasteNoiseLine(line) {
  const normalized = line.toLowerCase();
  return (
    normalized === "borrar" ||
    normalized.includes("añadir otra traducción") ||
    normalized === "acciones" ||
    normalized === "referencia\tvalor" ||
    normalized.includes("referencia\tvalor\t")
  );
},

mapPasteTipo(tipoRaw) {
  const normalized = (tipoRaw || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (normalized.includes("selector")) {
    return {
      tipo: "selector",
      needsI18nConfig: normalized.includes("i18n")
    };
  }

  if (normalized.includes("si/no") || normalized.includes("si-no") || normalized.includes("si / no")) {
    return { tipo: "si_no", needsI18nConfig: false };
  }

  if (normalized.includes("fecha")) {
    return { tipo: "fecha", needsI18nConfig: false };
  }

  if (normalized.includes("num")) {
    return { tipo: "numerico", needsI18nConfig: false };
  }

  if (normalized.includes("moneda")) {
    return { tipo: "moneda", needsI18nConfig: false };
  }

  return { tipo: "texto", needsI18nConfig: false };
},

openSelectorConfigModal() {
  if (!this.pasteImportState?.selectorsQueue?.length) {
    this.applyPasteImport();
    return;
  }

  const selector = this.pasteImportState.selectorsQueue.shift();

  if (this.selectorConfigModal) {
    this.selectorConfigModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = "tesauroSelectorModal";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "1000000";

  modal.innerHTML = `
    <div style="
      background:white;
      width:620px;
      max-width:95%;
      padding:20px;
      border-radius:12px;
      box-shadow:0 6px 20px rgba(0,0,0,0.35);
      display:flex;
      flex-direction:column;
      gap:12px;
    ">
      <h2 style="margin:0; text-align:center;">
        🧩 Opciones para ${this.escapeAttr(selector.nombre)}
      </h2>

      <p style="margin:0; color:#475569; font-size:14px;">
        Pega la tabla de referencias para este selector. Se detectan referencias y valores,
        ignorando las etiquetas de idioma.
      </p>

      <textarea id="selectorPasteInput" style="
        width:100%;
        min-height:140px;
        resize:vertical;
        padding:10px;
        border:1px solid #cbd5e1;
        border-radius:8px;
        font-family:inherit;
      "></textarea>

      <button id="selectorParse" style="
        padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;
      ">Cargar referencias</button>

      <div id="selectorValuesContainer" style="max-height:260px; overflow:auto;"></div>

      <div style="display:flex; gap:10px;">
        <button id="selectorCancel" style="
          flex:1; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;
        ">Cancelar</button>
        <button id="selectorConfirm" style="
          flex:1; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold;
        ">Guardar y continuar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  this.selectorConfigModal = modal;

  const container = modal.querySelector("#selectorValuesContainer");
  const parseBtn = modal.querySelector("#selectorParse");

  const renderRefs = (refs) => {
    if (!refs.length) {
      container.innerHTML = "<p style='color:#64748b;'>Sin referencias detectadas.</p>";
      return;
    }

    container.innerHTML = `
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#e2e8f0;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Referencia</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Valor literal</th>
          </tr>
        </thead>
        <tbody>
          ${refs.map(({ ref, valor }) => `
            <tr>
              <td style="padding:6px; border:1px solid #cbd5e1;">${this.escapeAttr(ref)}</td>
              <td style="padding:6px; border:1px solid #cbd5e1;">
                <input data-ref="${this.escapeAttr(ref)}" class="selector-valor-input"
                  value="${this.escapeAttr(valor || "")}"
                  style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;" />
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  };

  parseBtn.addEventListener("click", () => {
    const text = modal.querySelector("#selectorPasteInput")?.value || "";
    const refs = this.parseSelectorRefs(text);
    renderRefs(refs);
  });

  modal.querySelector("#selectorCancel").addEventListener("click", () => {
    modal.remove();
    this.selectorConfigModal = null;
    this.pasteImportState = null;
  });

  modal.querySelector("#selectorConfirm").addEventListener("click", () => {
    const inputs = Array.from(modal.querySelectorAll(".selector-valor-input"));
    if (!inputs.length) {
      alert("❌ Debes cargar referencias antes de continuar.");
      return;
    }

    const opciones = [];
    let missing = false;

    inputs.forEach(input => {
      const ref = input.dataset.ref;
      const valor = (input.value || "").trim();
      if (!valor) missing = true;
      opciones.push({ id: this.generateId(), ref, valor });
    });

    if (missing) {
      alert("❌ Completa el valor literal de todas las referencias.");
      return;
    }

    this.pasteImportState.opcionesPorRef[selector.ref] = opciones;

    modal.remove();
    this.selectorConfigModal = null;
    this.openSelectorConfigModal();
  });
},

parseSelectorRefs(rawText) {
  const lines = (rawText || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const tokens = [];
  lines.forEach(line => {
    if (this.isPasteNoiseLine(line)) return;
    line
      .split(/\t+/)
      .map(c => c.trim())
      .filter(Boolean)
      .forEach(token => tokens.push(token));
  });

  const refs = [];
  const seen = new Set();
  const isLanguageLabel = (value) => {
    const normalized = (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    return [
      "castellano",
      "catalan",
      "valenciano",
      "gallego",
      "euskera",
      "balear",
      "ingles",
      "frances",
      "aleman",
      "italiano"
    ].includes(normalized);
  };

  let i = 0;
  while (i < tokens.length) {
    const candidateRef = tokens[i];
    if (!candidateRef || isLanguageLabel(candidateRef) || candidateRef.toLowerCase() === "referencia") {
      i += 1;
      continue;
    }

    let j = i + 1;
    while (j < tokens.length && isLanguageLabel(tokens[j])) {
      j += 1;
    }
    const valor = j < tokens.length ? tokens[j] : "";

    if (!seen.has(candidateRef)) {
      seen.add(candidateRef);
      refs.push({ ref: candidateRef, valor });
    }

    i = j + 1;
  }

  return refs;
},

applyPasteImport() {
  const state = this.pasteImportState;
  if (!state) return;

  const existingByRef = new Map((this.campos || []).map(c => [c.ref, c]));
  let created = 0;
  let updated = 0;

  state.campos.forEach(item => {
    const existing = existingByRef.get(item.ref);
    const opciones = state.opcionesPorRef[item.ref];

    if (existing) {
      existing.nombre = item.nombre;
      existing.tipo = item.tipo;
      if (item.momento) existing.momento = item.momento;
      if (item.agrupacion) existing.agrupacion = item.agrupacion;

      if (item.tipo === "selector") {
        if (Array.isArray(opciones)) {
          existing.opciones = opciones;
          delete existing._needsOptions;
        } else if (!Array.isArray(existing.opciones) || existing.opciones.length === 0) {
          existing.opciones = [];
          existing._needsOptions = true;
        }
      }

      updated += 1;
      return;
    }

    const nuevo = {
      id: this.generateId(),
      ref: item.ref,
      nombre: item.nombre,
      tipo: item.tipo,
      opciones: [],
      momento: item.momento,
      agrupacion: item.agrupacion
    };

    if (item.tipo === "selector") {
      if (Array.isArray(opciones)) {
        nuevo.opciones = opciones;
      } else {
        nuevo._needsOptions = true;
      }
    }

    this.campos.push(nuevo);
    created += 1;
  });

  this.sync();
  this.render();
  alert(`✅ Importación completada: ${created} creados, ${updated} actualizados.`);

  this.pasteImportState = null;
},

// 🧩 === IMPORTADOR REAL DE TESAURO (basado en CSV exportado) ===
importTesauroFromCSV(mainCSV, valCSV = null) {
  try {

    const parse = (txt) => {
      const lines = txt.split(/\r?\n/).filter(l => l.trim());
      return lines.map(l => l.split(";").map(c => c.trim()));
    };

    const findColumn = (header, label, fallbackIndex) => {
      const idx = header.findIndex(h => h.toLowerCase() === label.toLowerCase());
      return idx >= 0 ? idx : fallbackIndex;
    };

    const normalizeText = (value) => (value || "").toString().trim();

    console.log("====== 📥 IMPORT TESAURO ======");

  // -----------------------------
// 1) PARSEAR TESAURO PRINCIPAL
// -----------------------------
const rows1 = parse(mainCSV);

if (rows1.length <= 1) {
  throw new Error("Tesauro.csv vacío o inválido");
}

const header1 = rows1[0].map(c => c.trim());
const idxRef = findColumn(header1, "Referencia", 4);
const idxNombre = findColumn(header1, "Nombre Castellano", 5);
const idxTipo = findColumn(header1, "Tipo de campo", 25);
const idxProp1 = findColumn(header1, "Propiedad del tipo de campo 1", 26);

const campos = [];

for (let i = 1; i < rows1.length; i++) {
  const cols = rows1[i];
  const ref = normalizeText(cols[idxRef]);
  if (!ref) continue; // referencia necesaria

  const nombre = normalizeText(cols[idxNombre]) || ref;
  const tipoRaw = normalizeText(cols[idxTipo]).toLowerCase();
  const prop1   = normalizeText(cols[idxProp1]).toLowerCase();

  // 🧠 Detección extendida de tipos
  let tipo = "texto";
  if (tipoRaw.includes("selector")) tipo = "selector";
  else if (tipoRaw.includes("sí") || tipoRaw.includes("si/")) tipo = "si_no";
  else if (tipoRaw.includes("num")) tipo = "numerico";
  else if (tipoRaw.includes("moneda")) tipo = "moneda";
  else if (tipoRaw.includes("fecha")) tipo = "fecha";
  // 🚀 Casos donde el CSV trae “Texto” pero la propiedad 1 dice “Sin hora” → forzamos fecha
  else if (prop1.includes("sin hora")) tipo = "fecha";

  campos.push({
    id: this.generateId(),
    ref, nombre, tipo,
    opciones: []
  });
}


    console.log("✔️ Campos importados del tesauro:", campos.length);
    console.table(campos.map(c => ({ ref: c.ref, nombre: c.nombre, tipo: c.tipo })));


    // ================================================
    // 2) DETECTAR SI EXISTEN SELECTORES
    // ================================================
    const haySelectores = campos.some(c => c.tipo === "selector");

    console.log("¿Hay campos selector?", haySelectores);


    // ================================================
    // 3) SI HAY SELECTOR -> NECESITAMOS VALORES
    // ================================================
    if (haySelectores) {

      if (!valCSV) {
        console.warn("⚠️ No hay fichero de valores pero hay selectores → los selectores quedarán VACÍOS");
      } else {

        console.log("📄 Procesando Tesauro_Valores.csv…");

        const rows2 = parse(valCSV);
        const header2 = rows2[0] ? rows2[0].map(c => c.trim()) : [];
        const idxRefTes = findColumn(header2, "Referencia Tesauro", 0);
        const idxRefOpt = findColumn(header2, "Referencia I18N", 1);
        const idxValor = findColumn(header2, "Valor", 3);

        for (let i = 1; i < rows2.length; i++) {
          const v = rows2[i];

          const refTes = normalizeText(v[idxRefTes]);
          const refOpt = normalizeText(v[idxRefOpt]);
          const valor  = normalizeText(v[idxValor]);

          const campo = campos.find(c => c.ref === refTes && c.tipo === "selector");

          if (campo) {
            campo.opciones.push({
              id: this.generateId(),
              ref: refOpt || "",
              valor: valor || ""
            });
          }
        }

        console.log("✔️ Opciones asignadas a selectores:");
        campos
          .filter(c => c.tipo === "selector")
          .forEach(c =>
            console.log(`   ${c.ref} → ${c.opciones.length} opciones`)
          );
      }
    }

// 🧩 MEZCLAR SIN DUPLICAR Y MANTENER TIPOS
const refsExistentes = new Map(this.campos.map(c => [c.ref.toLowerCase(), c]));
const nuevosUnicos = [];

for (const nuevo of campos) {
  const refLower = nuevo.ref.toLowerCase();
  const existente = refsExistentes.get(refLower);

  if (!existente) {
    nuevosUnicos.push(nuevo);
  } else {
    // 🧠 Si ya existe pero el CSV tiene tipo más específico (no "texto"), actualiza tipo
    if (existente.tipo === "texto" && nuevo.tipo !== "texto") {
      existente.tipo = nuevo.tipo;
      console.log(`🔄 Actualizado tipo de ${existente.ref} → ${existente.tipo}`);
    }
  }
}

if (nuevosUnicos.length) {
  this.campos.push(...nuevosUnicos);
  console.log(`🧩 ${nuevosUnicos.length} nuevos campos añadidos al tesauro.`);
} else {
  console.log("ℹ️ No se añadieron nuevos campos (todos ya existían).");
}

// ✅ Sincronizar y refrescar
if (window.Engine) Engine.tesauro = [...this.campos];
this.sync();
this.render();

alert(`✅ Tesauro importado correctamente (${nuevosUnicos.length} nuevos o actualizados).`);

  } catch (err) {
    console.error("❌ Error al importar Tesauro:", err);
    alert("❌ Error al importar Tesauro: " + err.message);
  }
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
    if (
      tipo === "texto" ||
      tipo === "numerico" ||
      tipo === "moneda" ||
      tipo === "fecha"
    ) {
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
      case "fecha": return "Fecha";
      case "moneda": return "Moneda";
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
    btnTesCSV.addEventListener("click", () => {

      // 1️⃣ Export Tesauro principal
      DataTesauro.exportTesauroCSV();

      

      // 3️⃣ Export Vinculación Tesauros
      DataTesauro.exportTesauroVinculacionCSV();

    });
  }
});
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

  // === PROMPT DE ENTIDAD (igual que exportFlujoCSV) ===
  if (window.Engine) {
    let entidad = prompt("Informe nombre de la entidad a configurar:", Engine.fichaProyecto.entidad || "");
    if (!entidad) entidad = "Informe nombre de la entidad a configurar";
    Engine.fichaProyecto.entidad = entidad;
  }
  // === PROMPT DE AGRUPACIÓN (solo para Tesauro) ===
  if (window.Engine) {
    let agrup = prompt("Indique Agrupación:", Engine.fichaProyecto.agrupacion || "");
    if (!agrup) agrup = "";
    Engine.fichaProyecto.agrupacion = agrup;
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
      case "fecha": return "Fecha";
      case "moneda": return "Moneda";
      default: return t || "";
    }
  };

  const rows1 = lista.map(c => {
    const tipoVisible = traducirTipo(c.tipo);

    // ⭐ CORRECCIÓN: propiedad1
    let propiedad1 = "";
    if (c.tipo === "selector") propiedad1 = "Desplegable";   // ⬅️ NUEVO
    if (c.tipo === "si_no") propiedad1 = "Botones";
    if (c.tipo === "fecha") propiedad1 = "Sin hora";

    return [
      Engine.fichaProyecto.entidad || "",   // Nombre Entidad
      "No",                                 // Sobrescribir
      "No",                                 // Eliminar
      "5.00.00. SIN CLASIFICACIÓN",         // Clasificación
      c.ref || "",                          // Referencia
      c.nombre || "",                       // Nombre Castellano
      "", "", "", "", "",                   // Otros idiomas
      "", "", "", "",                       // Idiomas extra
      "", "", "", "", "", "", "", "", "", "", // Ayudas
      tipoVisible,                           // Tipo de campo
      propiedad1,                             // ⭐ Propiedad del tipo de campo 1
      "", "", "",                             // Propiedades 2-4
      c.momento || "Solicitud",           // ← Momento real del tesauro
      c.agrupacion || "Agrupación",       // ← Agrupación real del tesauro        "",                                      // Obligatorio
        ""                                       // Campo asunto
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

};


/* ============================================================
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
   EXPORTAR VINCULACIÓN TESAUROS
   Formato:
   Nombre Entidad | Sobrescribir | Eliminar | Referencia | Actividad |
   Momento de captura | Agrupación | Obligatorio | Campo asunto
============================================================ */
DataTesauro.exportTesauroVinculacionCSV = function() {

  const lista = (window.Engine?.tesauro?.length ? Engine.tesauro : this.campos) || [];

  if (!lista.length) {
    alert("No hay campos de tesauro definidos para exportar.");
    return;
  }

  // Si no existe ficha proyecto, evitar errores
  const entidad    = Engine.fichaProyecto?.entidad     || "";
  const actividad  = Engine.fichaProyecto?.actividad   || "";
  const agrupacion = Engine.fichaProyecto?.agrupacion  || "";
  const momento    = "Tramitación"; // regla fija

  // Cabeceras
  const header = [
    "Nombre Entidad",
    "Sobrescribir",
    "Eliminar",
    "Referencia",
    "Actividad",
    "Momento de captura",
    "Agrupación",
    "Obligatorio",
    "Campo asunto"
  ];

    const rows = lista.map(c => {
    return [
      entidad,
      "No",
      "No",
      c.ref || "",
      actividad,
      c.momento || "Solicitud",       // ← Momento real del tesauro
      c.agrupacion || "Agrupación",   // ← Agrupación real
      "",
      ""
    ];
  });

  const csv = [header.join(";"), ...rows.map(r => r.map(clean).join(";"))].join("\n");

  // Descargar
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Vinculacion_Tesauros.csv";
  a.click();
  URL.revokeObjectURL(url);

  console.log("📄 Exportado Vinculación_Tesauros.csv");

  function clean(t) {
    return (t || "").toString().replace(/\n/g, " ").replace(/;/g, ",").trim();
  }
};

/* ============================================================
   ARRANQUE
============================================================ */
window.addEventListener("DOMContentLoaded", () => DataTesauro.init());
window.DataTesauro = DataTesauro;

// Exponer para pruebas en Node
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DataTesauro };
}

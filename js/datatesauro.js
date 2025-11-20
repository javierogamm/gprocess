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

        <h4>➕ Nuevo campo</h4>
         <label>Nombre</label>
        <input id="tNombre" type="text" placeholder="Ej: Documento principal" />

        <label>Referencia</label>
        <input id="tRef" type="text" placeholder="Ej: ref_doc" />

       

        <label>Tipo</label>
        <select id="tTipo">
          <option value="selector">Selector</option>
          <option value="si_no">Sí / No</option>
          <option value="numerico">Numérico</option>
          <option value="texto">Texto</option>
        </select>

        <button id="btnGuardarCampo" class="btn btn-guardar">💾 Guardar campo</button>
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
   RENDERIZAR LISTA DE CAMPOS (con DnD a conexiones)
============================================================ */
  render() {
    if (!this.listDiv) return;

    if (this.campos.length === 0) {
      this.listDiv.innerHTML = `<p style="color:#555;">No hay campos creados todavía.</p>`;
      return;
    }

    let html = "";
    this.campos.forEach(c => {
      const isSelector = c.tipo === "selector";
      const opts = Array.isArray(c.opciones) ? c.opciones : [];
      const collapsed = c.colapsado ?? false;

      html += `
        <div class="tesauro-item" data-id="${c.id}">
          <div class="tesauro-header" data-id="${c.id}" style="display:flex; align-items:center; gap:8px; justify-content:space-between; cursor:${isSelector ? "pointer" : "default"};">
            <div>
              <strong>${c.nombre}</strong>
              <span style="color:#555;">(${c.ref})</span><br>
              <small>Tipo: ${this.prettyTipo(c.tipo)}</small>
            </div>
            <div>
              ${isSelector ? `<span class="arrow">${collapsed ? "▶" : "▼"}</span>` : ""}
              <button class="btn-eliminar" data-id="${c.id}">🗑️</button>
            </div>
          </div>
      `;

      /* ---------- Bloque por tipo ---------- */
      if (isSelector) {
        const hiddenAttr = collapsed ? "style='display:none;'" : "";
        const items = opts.map(o => `
          <li class="opt-item" data-oid="${o.id}" style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:4px 0; border-bottom:1px dashed #ddd;">
            <div>
              <code style="background:#f6f6f6; padding:2px 6px; border-radius:6px;">${o.ref}</code>
              &nbsp;—&nbsp;${o.valor}
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="drag-pill" draggable="true"
                    data-dnd="selector"
                    data-campo-nombre="${this.escapeAttr(c.nombre)}"
                    data-campo-ref="${this.escapeAttr(c.ref)}"
                    data-opt-ref="${this.escapeAttr(o.ref)}"
                    data-opt-valor="${this.escapeAttr(o.valor)}"
                    title="Arrastrar a una conexión"
                    style="font-size:12px; padding:2px 6px; border:1px solid #cbd5e1; border-radius:10px; background:#fff;">⤴ Arrastrar</span>
              <button class="btn-del-opt" data-id="${c.id}" data-oid="${o.id}" title="Eliminar valor">🗑️</button>
            </div>
          </li>
        `).join("");

        html += `
<div class="selector-add" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
  <input type="text" class="opt-valor" 
         placeholder="Valor visible" 
         style="flex:0 0 50%; padding:4px 6px;">
  <input type="text" class="opt-ref" 
         placeholder="Ref (p.ej. ALTA)" 
         style="flex:0 0 30%; text-align:center; padding:4px 6px;">
  <button class="btn-add-opt" data-id="${c.id}" 
          style="flex:1; max-width:40px; padding:4px 0; font-size:16px;">+</button>
</div>            <ul class="opt-list" style="list-style:none; margin:0; padding:0;">
              ${items || `<li style="color:#777;">(sin valores)</li>`}
            </ul>
          </div>
        `;
      } else if (c.tipo === "si_no") {
        html += `
          <div class="tesauro-bool" style="margin-top:8px; display:flex; gap:8px;">
            <span class="drag-pill" draggable="true"
                  data-dnd="si_no"
                  data-campo-nombre="${this.escapeAttr(c.nombre)}"
                  data-campo-ref="${this.escapeAttr(c.ref)}"
                  data-valor="Sí"
                  title="Arrastrar a una conexión"
                  style="font-size:12px; padding:2px 8px; border:1px solid #10b981; color:#065f46; border-radius:10px; background:#ecfdf5;">Sí</span>
            <span class="drag-pill" draggable="true"
                  data-dnd="si_no"
                  data-campo-nombre="${this.escapeAttr(c.nombre)}"
                  data-campo-ref="${this.escapeAttr(c.ref)}"
                  data-valor="No"
                  title="Arrastrar a una conexión"
                  style="font-size:12px; padding:2px 8px; border:1px solid #ef4444; color:#7f1d1d; border-radius:10px; background:#fef2f2;">No</span>
          </div>
        `;
      } else if (c.tipo === "texto" || c.tipo === "numerico") {
        html += `
          <div class="tesauro-free" style="margin-top:8px;">
            <span class="drag-pill" draggable="true"
                  data-dnd="${c.tipo}"
                  data-campo-nombre="${this.escapeAttr(c.nombre)}"
                  data-campo-ref="${this.escapeAttr(c.ref)}"
                  data-needs-input="true"
                  title="Arrastrar a una conexión; al soltar te pedirá el valor"
                  style="font-size:12px; padding:2px 8px; border:1px solid #cbd5e1; border-radius:10px; background:#fff;">✎ Arrastrar para escribir…</span>
          </div>
        `;
      }

      html += `</div>`;
    });

    this.listDiv.innerHTML = html;

    // 🗑️ Eliminar campo
    this.listDiv.querySelectorAll(".btn-eliminar").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        this.campos = this.campos.filter(c => c.id !== id);
        this.sync();
        this.render();
      });
    });

    // ➕ Añadir valor (selector)
    this.listDiv.querySelectorAll(".btn-add-opt").forEach(btn => {
      btn.addEventListener("click", (e) => {
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

        if (campo.opciones.some(o => (o.ref || "").trim().toLowerCase() === ref.toLowerCase())) {
          const continuar = confirm("Ya existe una opción con esa referencia. ¿Añadir de todos modos?");
          if (!continuar) return;
        }

        campo.opciones.push({ id: this.generateId(), ref, valor });
        this.sync();

        if (refInput) refInput.value = "";
        if (valorInput) valorInput.value = "";
        this.render();
      });
    });

    // 🗑️ Eliminar valor (selector)
    this.listDiv.querySelectorAll(".btn-del-opt").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const campoId = e.currentTarget.dataset.id;
        const optId = e.currentTarget.dataset.oid;
        const campo = this.campos.find(x => x.id === campoId);
        if (!campo) return;
        campo.opciones = (campo.opciones || []).filter(o => o.id !== optId);
        this.sync();
        this.render();
      });
    });

    // ⬇️⬆️ Colapsar / expandir (solo selectores)
    this.listDiv.querySelectorAll(".tesauro-header").forEach(h => {
      h.addEventListener("click", (e) => {
        const id = h.dataset.id;
        const campo = this.campos.find(x => x.id === id);
        if (!campo || campo.tipo !== "selector") return;
        campo.colapsado = !campo.colapsado;
        this.render();
      });
    });

    // 🧲 DnD
    this.listDiv.querySelectorAll(".drag-pill").forEach(pill => {
      pill.addEventListener("dragstart", (ev) => {
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

/* ============================================================
   ARRANQUE
============================================================ */
window.addEventListener("DOMContentLoaded", () => DataTesauro.init());
window.DataTesauro = DataTesauro;

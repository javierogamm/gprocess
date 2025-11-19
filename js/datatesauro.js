/* ============================================================
   DATATESAURO.JS
   Panel flotante de creación y gestión de campos tipo "tesauro"
   - Botón flotante 📚
   - Panel lateral derecho con lista de campos
   - Sincroniza con Engine.tesauro (guardar/exportar/importar)
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
        <label>Referencia</label>
        <input id="tRef" type="text" placeholder="Ej: ref_doc" />

        <label>Nombre</label>
        <input id="tNombre" type="text" placeholder="Ej: Documento principal" />

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
        this.campos.push(nuevo);

        // **FIX** Sincronizar SIEMPRE con Engine.tesauro
        if (window.Engine) {
          Engine.tesauro = [...this.campos];
          Engine.saveHistory?.();
        }

        this.render();

        document.getElementById("tRef").value = "";
        document.getElementById("tNombre").value = "";
        document.getElementById("tTipo").value = "selector";
      });
    }

    // Al cargar, si Engine ya trae tesauro → sincroniza vista
    if (window.Engine && Array.isArray(Engine.tesauro) && Engine.tesauro.length) {
      this.campos = [...Engine.tesauro]; /* **FIX** spread correcto */
      this.render();
    }

    // Cuando Engine importe un JSON y dispare el evento → refrescar
    document.addEventListener("tesauroUpdated", () => {
      if (window.Engine && Array.isArray(Engine.tesauro)) {
        this.campos = [...Engine.tesauro]; /* **FIX** spread correcto */
        this.render();
      }
    });
  },

  /* ============================================================
     RENDERIZAR LISTA DE CAMPOS
  ============================================================ */
  render() {
    if (!this.listDiv) return;

    if (this.campos.length === 0) {
      this.listDiv.innerHTML = `<p style="color:#555;">No hay campos creados todavía.</p>`;
      return;
    }

    let html = "";
    this.campos.forEach(c => {
      html += `
        <div class="tesauro-item" data-id="${c.id}">
          <strong>${c.nombre}</strong> 
          <span style="color:#555;">(${c.ref})</span><br>
          <small>Tipo: ${this.prettyTipo(c.tipo)}</small>
          <button class="btn-eliminar" data-id="${c.id}">🗑️</button>
        </div>
      `;
    });
    this.listDiv.innerHTML = html;

    // 🗑️ Eliminación (y sincronización)
    this.listDiv.querySelectorAll(".btn-eliminar").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        this.campos = this.campos.filter(c => c.id !== id);

        if (window.Engine) {
          Engine.tesauro = [...this.campos]; /* **FIX** spread correcto */
          Engine.saveHistory?.();
        }

        this.render();
      });
    });
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
   ARRANQUE
============================================================ */
window.addEventListener("DOMContentLoaded", () => DataTesauro.init());

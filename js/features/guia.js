/* ============================================================
   GUIA.JS - Lanzador de la guía visual
   ------------------------------------------------------------
   - Botón "📘 Guía visual" en el panel izquierdo
   - Modal con la guía renderizada desde examples/guia_visual.md
   - Conversión básica de Markdown a HTML para lectura rápida
============================================================ */

const GuiaVisual = {
  btn: null,
  modal: null,
  content: null,
  closeBtn: null,
  hasLoaded: false,

  init() {
    this.ensureButton();
    this.ensureModal();

    if (!this.btn) return;

    this.btn.addEventListener("click", () => {
      this.open();
    });

    if (this.closeBtn && this.modal) {
      this.closeBtn.addEventListener("click", () => this.close());
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.close();
      });
    }
  },

  ensureButton() {
    this.btn = document.getElementById("btnGuiaVisual");
    if (!this.btn) {
      const leftPanel = document.getElementById("leftPanel");
      if (!leftPanel) return;
      this.btn = document.createElement("button");
      this.btn.id = "btnGuiaVisual";
      this.btn.className = "btn";
      this.btn.textContent = "📘 Guía visual";
      const h2 = leftPanel.querySelector("h2");
      if (h2 && h2.nextSibling) {
        leftPanel.insertBefore(this.btn, h2.nextSibling);
      } else {
        leftPanel.insertBefore(this.btn, leftPanel.firstChild);
      }
    }
  },

  ensureModal() {
    if (document.getElementById("guideModal")) {
      this.modal = document.getElementById("guideModal");
      this.content = this.modal.querySelector(".guide-content");
      this.closeBtn = this.modal.querySelector(".guide-close-btn");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "guideModal";
    modal.className = "modal hidden guide-modal";
    modal.innerHTML = `
      <div class="modal-content guide-modal-content">
        <div class="guide-header">
          <div>
            <h3>Guía visual del editor</h3>
            <p class="guide-subtitle">Áreas de interacción, nodos, handles, condiciones, asignaciones y carga por IA/JSON.</p>
          </div>
          <button class="guide-close-btn" aria-label="Cerrar">&times;</button>
        </div>
        <div class="guide-content">Cargando guía…</div>
        <div class="guide-footer">
          <small>Fuente: <code>examples/guia_visual.md</code></small>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.content = modal.querySelector(".guide-content");
    this.closeBtn = modal.querySelector(".guide-close-btn");
  },

  async open() {
    if (!this.modal) return;
    this.modal.classList.remove("hidden");
    if (!this.hasLoaded) {
      await this.loadGuide();
    }
  },

  close() {
    if (!this.modal) return;
    this.modal.classList.add("hidden");
  },

  async loadGuide() {
    if (!this.content) return;
    this.content.textContent = "Cargando guía…";
    try {
      const res = await fetch("examples/guia_visual.md");
      if (!res.ok) throw new Error("No se pudo descargar la guía");
      const md = await res.text();
      this.content.innerHTML = this.renderMarkdown(md);
      this.hasLoaded = true;
    } catch (err) {
      console.error("[GuiaVisual] Error cargando guía", err);
      this.content.innerHTML = `
        <p>No se pudo cargar la guía. Puedes abrirla directamente <a href="examples/guia_visual.md" target="_blank">aquí</a>.</p>
      `;
    }
  },

  renderMarkdown(md) {
    const lines = md.split(/\r?\n/);
    const htmlParts = [];
    let inList = false;

    const closeList = () => {
      if (inList) {
        htmlParts.push("</ul>");
        inList = false;
      }
    };

    lines.forEach((line) => {
      const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        closeList();
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        htmlParts.push(`<h${level}>${text}</h${level}>`);
        return;
      }

      if (/^[-*]\s+/.test(line)) {
        if (!inList) {
          htmlParts.push("<ul>");
          inList = true;
        }
        const itemText = line.replace(/^[-*]\s+/, "");
        htmlParts.push(`<li>${this.inlineMarkdown(itemText)}</li>`);
        return;
      }

      if (line.trim() === "") {
        closeList();
        return;
      }

      closeList();
      htmlParts.push(`<p>${this.inlineMarkdown(line)}</p>`);
    });

    closeList();
    return htmlParts.join("\n");
  },

  inlineMarkdown(text) {
    let html = text;
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");
    return html;
  },
};

window.GuiaVisual = GuiaVisual;

window.addEventListener("DOMContentLoaded", () => {
  GuiaVisual.init();
});

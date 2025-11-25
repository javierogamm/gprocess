/* ============================================================
   ASSISTANT.JS - Asistente lateral paso a paso
   ------------------------------------------------------------
   - Botón flotante para abrir el asistente
   - Panel lateral con pasos para crear nodos y conexiones
   - Crea nodos al cerrar la descripción y los conecta al vuelo
============================================================ */

const Assistant = {
  btn: null,
  panel: null,
  messages: null,
  formArea: null,
  lastNodeId: null,
  pendingFromId: null,
  currentStep: "idle",
  draft: null,

  init() {
    // Crear botón flotante
    this.btn = document.createElement("button");
    this.btn.id = "btnAssistant";
    this.btn.className = "floating-assistant-btn";
    this.btn.textContent = "🤖 Assistant";
    document.body.appendChild(this.btn);

    // Crear panel lateral
    this.panel = document.createElement("div");
    this.panel.id = "assistantPanel";
    this.panel.className = "assistant-panel assistant-closed";
    this.panel.innerHTML = `
      <div class="assistant-header">
        <div>
          <strong>Asistente de flujo</strong>
          <p class="assistant-subtitle">Ve creando tareas y conexiones paso a paso</p>
        </div>
        <button class="assistant-close" aria-label="Cerrar">×</button>
      </div>
      <div class="assistant-body">
        <div class="assistant-messages"></div>
        <div class="assistant-form"></div>
      </div>
    `;
    document.body.appendChild(this.panel);

    this.messages = this.panel.querySelector(".assistant-messages");
    this.formArea = this.panel.querySelector(".assistant-form");

    this.btn.addEventListener("click", () => this.togglePanel());
    this.panel.querySelector(".assistant-close")
        .addEventListener("click", () => this.close());

    this.reset();
  },

  togglePanel() {
    if (this.panel.classList.contains("assistant-open")) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    this.panel.classList.remove("assistant-closed");
    this.panel.classList.add("assistant-open");
  },

  close() {
    this.panel.classList.add("assistant-closed");
    this.panel.classList.remove("assistant-open");
  },

  reset() {
    this.messages.innerHTML = "";
    this.formArea.innerHTML = "";
    this.lastNodeId = null;
    this.pendingFromId = null;
    this.currentStep = "idle";

    this.addMessage("Hola 👋. Pulsa en \"Nuevo nodo\" para empezar a construir tu flujo.");
    this.renderIdleActions();
  },

  addMessage(text) {
    const msg = document.createElement("div");
    msg.className = "assistant-message";
    msg.textContent = text;
    this.messages.appendChild(msg);
    this.messages.scrollTop = this.messages.scrollHeight;
  },

  renderIdleActions() {
    this.formArea.innerHTML = `
      <div class="assistant-actions">
        <button class="assistant-primary" id="assistantStart">Nuevo nodo</button>
        <button class="assistant-secondary" id="assistantReset">Limpiar conversación</button>
      </div>
    `;

    this.formArea.querySelector("#assistantStart")
        .addEventListener("click", () => this.startNodeFlow());
    this.formArea.querySelector("#assistantReset")
        .addEventListener("click", () => this.reset());
  },

  startNodeFlow(connectFromId = null) {
    this.pendingFromId = connectFromId;
    this.draft = {
      titulo: "",
      tipo: "formulario",
      descripcion: "",
      tareaManual: false
    };
    this.currentStep = "titulo";
    this.renderStep();
  },

  renderStep() {
    if (this.currentStep === "titulo") {
      this.addMessage(this.pendingFromId ? "Nuevo nodo conectado al anterior" : "Definamos el siguiente nodo");
      this.formArea.innerHTML = `
        <form class="assistant-form-step">
          <label>Título del nodo</label>
          <input type="text" id="assistantTitulo" placeholder="Ej. Revisar solicitud" required />
          <div class="assistant-actions">
            <button type="submit" class="assistant-primary">Siguiente</button>
          </div>
        </form>
      `;

      this.formArea.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const titulo = this.formArea.querySelector("#assistantTitulo").value.trim();
        this.draft.titulo = titulo || "Nodo";
        this.currentStep = "tipo";
        this.renderStep();
      });
      return;
    }

    if (this.currentStep === "tipo") {
      this.formArea.innerHTML = `
        <form class="assistant-form-step">
          <label>Tipo de nodo</label>
          <select id="assistantTipo">
            <option value="formulario">Formulario</option>
            <option value="documento">Documento</option>
            <option value="libre">Libre</option>
            <option value="decision">Decisión</option>
            <option value="circuito">Circuito</option>
            <option value="plazo">Plazo</option>
            <option value="operacion_externa">Operación externa</option>
            <option value="notas">Nota</option>
          </select>
          <div class="assistant-actions">
            <button type="button" class="assistant-secondary" id="assistantBackTitulo">Atrás</button>
            <button type="submit" class="assistant-primary">Siguiente</button>
          </div>
        </form>
      `;

      this.formArea.querySelector("#assistantTipo").value = this.draft.tipo;

      this.formArea.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        this.draft.tipo = this.formArea.querySelector("#assistantTipo").value;
        this.currentStep = "descripcion";
        this.renderStep();
      });

      this.formArea.querySelector("#assistantBackTitulo")
          .addEventListener("click", () => {
            this.currentStep = "titulo";
            this.renderStep();
          });
      return;
    }

    if (this.currentStep === "descripcion") {
      this.formArea.innerHTML = `
        <form class="assistant-form-step">
          <label>Descripción breve</label>
          <textarea id="assistantDescripcion" rows="3" placeholder="¿Qué se hace en esta tarea?"></textarea>
          <label class="assistant-checkbox">
            <input type="checkbox" id="assistantTareaManual" /> Tarea manual
          </label>
          <div class="assistant-actions">
            <button type="button" class="assistant-secondary" id="assistantBackTipo">Atrás</button>
            <button type="submit" class="assistant-primary">Crear nodo</button>
          </div>
        </form>
      `;

      this.formArea.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        this.draft.descripcion = this.formArea.querySelector("#assistantDescripcion").value.trim();
        this.draft.tareaManual = this.formArea.querySelector("#assistantTareaManual").checked;
        this.finalizarNodo();
      });

      this.formArea.querySelector("#assistantBackTipo")
          .addEventListener("click", () => {
            this.currentStep = "tipo";
            this.renderStep();
          });
    }
  },

  finalizarNodo() {
    const nodo = Engine.createNode(this.draft.tipo);
    Engine.updateNode(nodo.id, {
      titulo: this.draft.titulo,
      descripcion: this.draft.descripcion,
      tareaManual: this.draft.tareaManual
    });

    this.addMessage(`✅ Nodo creado: ${this.draft.titulo}`);

    if (this.pendingFromId) {
      const conn = Engine.createConnection(this.pendingFromId, nodo.id, "bottom", "top");
      if (conn) {
        this.addMessage("↗️ Conexión añadida con el nodo anterior");
      }
      this.pendingFromId = null;
    }

    this.lastNodeId = nodo.id;
    this.currentStep = "accionesFinal";
    this.renderNextOptions();
  },

  renderNextOptions() {
    const hayOtrosNodos = (Engine.data?.nodos?.length || 0) > 1;

    this.formArea.innerHTML = `
      <div class="assistant-next">
        <p>¿Qué quieres hacer ahora?</p>
        <div class="assistant-actions">
          <button class="assistant-primary" id="assistantOtro">Crear siguiente nodo</button>
          <button class="assistant-secondary" id="assistantExistente" ${hayOtrosNodos ? "" : "disabled"}>Ir a una tarea existente</button>
          <button class="assistant-secondary" id="assistantFin">Terminar</button>
        </div>
      </div>
    `;

    this.formArea.querySelector("#assistantOtro")
        .addEventListener("click", () => this.startNodeFlow(this.lastNodeId));

    const btnExistente = this.formArea.querySelector("#assistantExistente");
    btnExistente.addEventListener("click", () => {
      if (btnExistente.disabled) return;
      this.askExistingConnection();
    });

    this.formArea.querySelector("#assistantFin")
        .addEventListener("click", () => this.renderIdleActions());
  },

  askExistingConnection() {
    if (!Engine.data?.nodos?.length) {
      this.addMessage("No hay nodos disponibles");
      this.renderNextOptions();
      return;
    }

    const options = Engine.data.nodos
      .filter(n => n.id !== this.lastNodeId)
      .map(n => `<option value="${n.id}">${n.titulo || n.id}</option>`)
      .join("");

    if (!options) {
      this.addMessage("No hay otras tareas a las que enlazar todavía.");
      this.renderNextOptions();
      return;
    }

    this.formArea.innerHTML = `
      <form class="assistant-form-step">
        <label>Selecciona la tarea destino</label>
        <select id="assistantDestino">${options}</select>
        <div class="assistant-grid">
          <div>
            <label>Condición</label>
            <input id="assistantCondNombre" placeholder="Nombre" />
          </div>
          <div>
            <label>&nbsp;</label>
            <input id="assistantCondValor" placeholder="Valor" />
          </div>
        </div>
        <div class="assistant-actions">
          <button type="button" class="assistant-secondary" id="assistantBackOpciones">Atrás</button>
          <button type="submit" class="assistant-primary">Crear conexión</button>
        </div>
      </form>
    `;

    this.formArea.querySelector("#assistantBackOpciones")
        .addEventListener("click", () => this.renderNextOptions());

    this.formArea.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const destino = this.formArea.querySelector("#assistantDestino").value;
      const condNombre = this.formArea.querySelector("#assistantCondNombre").value.trim();
      const condValor = this.formArea.querySelector("#assistantCondValor").value.trim();

      const conn = Engine.createConnection(this.lastNodeId, destino, "right", "left");
      if (conn && (condNombre || condValor)) {
        Engine.updateConnectionCondition(conn.id, condNombre, condValor);
      }

      if (conn) {
        this.addMessage("🔗 Conexión creada hacia la tarea seleccionada");
      }

      this.lastNodeId = destino;
      this.pendingFromId = destino;
      this.renderNextOptions();
    });
  }
};

window.addEventListener("DOMContentLoaded", () => {
  Assistant.init();
  window.Assistant = Assistant;
});

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
  pendingCondition: null,
  pendingLayoutHint: null,
  workingNodeId: null,
  activeOutputsFor: null,
  currentStep: "idle",
  draft: null,
  closedEnds: new Set(),
  postOutputsCallbacks: [],
  multiFlowContext: null,
  exampleFlows: [],
  examplesLoaded: false,
  suggestionsByType: {},

  init() {
    // Reutilizar o crear botón flotante
    this.btn = document.getElementById("btnAssistant");
    if (!this.btn) {
      this.btn = document.createElement("button");
      this.btn.id = "btnAssistant";
      this.btn.className = "floating-assistant-btn";
      this.btn.textContent = "🤖 Assistant";
      document.body.appendChild(this.btn);
    }

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
        <div class="assistant-form"></div>
        <div class="assistant-log">
          <div class="assistant-log-title">Log de acciones</div>
          <div class="assistant-messages"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.panel);

    this.messages = this.panel.querySelector(".assistant-messages");
    this.formArea = this.panel.querySelector(".assistant-form");

    this.btn.addEventListener("click", () => this.togglePanel());
    this.panel.querySelector(".assistant-close")
        .addEventListener("click", () => this.close());

    this.reset();
    this.loadExampleFlows();
    this.attachFloatingButtons();
  },

  attachFloatingButtons() {
    let group = document.getElementById("floatingControlGroup");
    if (!group) {
      group = document.createElement("div");
      group.id = "floatingControlGroup";
      group.className = "floating-control-group";
      document.body.appendChild(group);
    }

    const wizardBtn = document.getElementById("btnWizard");
    if (wizardBtn && wizardBtn.parentElement !== group) {
      group.appendChild(wizardBtn);
    }

    if (!wizardBtn) {
      setTimeout(() => {
        const maybeWizard = document.getElementById("btnWizard");
        if (maybeWizard && maybeWizard.parentElement !== group) {
          group.appendChild(maybeWizard);
        }
      }, 200);
    }

    if (this.btn.parentElement !== group) {
      group.appendChild(this.btn);
    }
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
    this.pendingCondition = null;
    this.pendingLayoutHint = null;
    this.workingNodeId = null;
    this.activeOutputsFor = null;
    this.currentStep = "idle";
    this.closedEnds = new Set();
    this.postOutputsCallbacks = [];
    this.multiFlowContext = null;
    this.exampleFlows = this.exampleFlows || [];

    this.setWorkingNode(null);

    this.addMessage("Hola 👋. Antes de empezar prepara los Grupos y Usuarios para autocompletar.");
    this.renderInitialSetup();
  },

  async loadExampleFlows() {
    const staticSeeds = {
      formulario: [
        "Formulario de revisión de la solicitud",
        "Formulario de revisión de la subsanación",
        "Baremación de puntos",
        "Cálculo de la tasa",
        "Aportación de datos",
        "Formulario nexo",
        "Revisión de datos del expediente"
      ],
      documento: [
        "Informe jurídico",
        "Informe técnico",
        "Informe técnico urbanístico",
        "Requerimiento de subsanación",
        "Notificación al interesado",
        "Acta",
        "Bases de la convocatoria",
        "Bases de la subvención",
        "Informe de baremación",
        "Certificado",
        "Providencia de inicio"
      ],
      plazo: [
        "Plazo de subsanación",
        "Plazo de alegaciones",
        "Plazo de revisión",
        "Plazo de espera"
      ],
      circuito: [
        "Concesión",
        "Denegación",
        "Desistimiento",
        "Aprobación provisional",
        "Aprobación definitiva",
        "Liquidación provisional",
        "Liquidación definitiva"
      ],
      libre: ["Aviso a", "Encargo a"],
      operacion_externa: [
        "Consulta de bases de datos",
        "Consulta PID /Via Oberta"
      ]
    };

    const merged = Object.entries(staticSeeds).flatMap(([tipo, titulos]) =>
      titulos.map((titulo) => ({ tipo, titulo }))
    );

    const dedup = [];
    const seen = new Set();
    merged.forEach((m) => {
      if (!m?.titulo) return;
      const key = `${m.tipo || "cualquiera"}::${m.titulo}`;
      if (seen.has(key)) return;
      seen.add(key);
      dedup.push(m);
    });

    this.exampleFlows = dedup;
    this.suggestionsByType = dedup.reduce((map, item) => {
      const key = item.tipo || "cualquiera";
      if (!map[key]) map[key] = [];
      if (!map[key].includes(item.titulo)) {
        map[key].push(item.titulo);
      }
      return map;
    }, {});
    Object.keys(this.suggestionsByType).forEach((key) => {
      this.suggestionsByType[key] = this.suggestionsByType[key].sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" })
      );
    });
    this.examplesLoaded = dedup.length > 0;
    if (this.examplesLoaded) {
      const tipos = new Set(dedup.map((d) => d.tipo || "cualquiera"));
      this.addMessage(
        `📚 Sugerencias precargadas (${dedup.length} títulos en ${tipos.size} tipos).`
      );
      if (this.currentStep === "titulo") {
        this.renderStep();
      }
    }
  },

  extractTitlesFromFlow(flowJson) {
    if (!flowJson) return [];
    const nodes = [];
    const candidates = [flowJson?.nodos, flowJson?.nodes, flowJson];
    candidates.forEach((arr) => {
      if (Array.isArray(arr)) nodes.push(...arr);
    });

    return nodes
      .filter((n) => n && n.titulo)
      .map((n) => ({ tipo: n.tipo || n.kind || null, titulo: n.titulo }));
  },

  addMessage(text) {
    const msg = document.createElement("div");
    msg.className = "assistant-message";
    msg.textContent = text;
    this.messages.appendChild(msg);
    this.messages.scrollTop = this.messages.scrollHeight;
  },

  renderInitialSetup() {
    this.formArea.innerHTML = `
      <form class="assistant-form-step">
        <label>Pega Grupos (uno por línea)</label>
        <textarea id="assistantGrupos" rows="3" placeholder="Secretaría\nIntervención\nContratación"></textarea>
        <label>Pega Usuarios (uno por línea)</label>
        <textarea id="assistantUsuarios" rows="3" placeholder="gestor1\ntecnico2"></textarea>
        <div class="assistant-actions">
          <button type="submit" class="assistant-primary">Continuar</button>
        </div>
      </form>
    `;

    this.formArea.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.ingresarPool();
    });
  },

  ingresarPool() {
    const gruposRaw = this.formArea.querySelector("#assistantGrupos").value;
    const usuariosRaw = this.formArea.querySelector("#assistantUsuarios").value;

    const grupos = gruposRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const usuarios = usuariosRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    grupos.forEach((g) => Engine.asignaciones.grupos.add(g));
    usuarios.forEach((u) => Engine.asignaciones.usuarios.add(u));

    if (window.UI && typeof UI.updateAsignacionesList === "function") {
      UI.updateAsignacionesList();
    }

    this.addMessage(
      `Añadidos ${grupos.length} grupos y ${usuarios.length} usuarios al pool de asignación.`
    );
    this.renderIdleActions();
  },

  renderIdleActions() {
    this.formArea.innerHTML = `
      <div class="assistant-actions">
        <button class="assistant-primary" id="assistantStart">Nuevo nodo</button>
        <button class="assistant-secondary" id="assistantReset">Reiniciar asistente</button>
      </div>
    `;

    this.formArea.querySelector("#assistantStart")
        .addEventListener("click", () => this.startNodeFlow());
    this.formArea.querySelector("#assistantReset")
        .addEventListener("click", () => this.reset());
  },

  startNodeFlow(connectFromId = null, condition = null, layoutHint = null) {
    if (this.activeOutputsFor && connectFromId !== this.activeOutputsFor) {
      const bloqueado = Engine.getNode(this.activeOutputsFor);
      this.addMessage(
        `⚠️ Termina primero las salidas del nodo "${bloqueado?.titulo || this.activeOutputsFor}".`
      );
      this.askOutputsForNode(this.activeOutputsFor);
      return;
    }

    this.pendingFromId = connectFromId;
    this.pendingCondition = condition;
    this.pendingLayoutHint = layoutHint;
    this.draft = {
      titulo: "",
      tipo: "formulario",
      descripcion: "",
      tareaManual: false,
      asignadoA: "",
      asignadoUsuario: ""
    };
    this.currentStep = "tipo";
    this.renderStep();
  },

  nombreSugerido(tipo) {
    const typed = (this.suggestionsByType?.[tipo] || []).slice();
    const generales = (this.suggestionsByType?.cualquiera || [])
      .filter((t) => !typed.includes(t));

    const combinadas = [...typed, ...generales];
    if (combinadas.length) return combinadas;

    return ["Tarea administrativa", "Paso del expediente"];
  },

  renderConditionInputs() {
    const tesauro = Array.from(Engine.tesauro || []);
    const opcionesNombre = tesauro
      .map((t) => `<option value="${t.nombre}">${t.tipo || "campo"}</option>`)
      .join("");
    const opcionesValor = tesauro
      .flatMap((t) => t.opciones || [])
      .map((op) => `<option value="${op}"></option>`)
      .join("");

    return `
      <label>Condición de salida</label>
      <input id="assistantCondNombre" list="assistantTesauroNombres" placeholder="Nombre de condición" />
      <datalist id="assistantTesauroNombres">${opcionesNombre}</datalist>
      <input id="assistantCondValor" list="assistantTesauroValores" placeholder="Valor o respuesta" />
      <datalist id="assistantTesauroValores">${opcionesValor}</datalist>
    `;
  },

  renderStep() {
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
        this.currentStep = "titulo";
        this.renderStep();
      });

      this.formArea.querySelector("#assistantBackTitulo").addEventListener("click", () => {
        this.renderIdleActions();
      });
      return;
    }

    if (this.currentStep === "titulo") {
      const sugerencias = this.nombreSugerido(this.draft.tipo);
      this.addMessage(this.pendingFromId ? "Nuevo nodo conectado al anterior" : "Definamos el siguiente nodo");
      this.formArea.innerHTML = `
        <form class="assistant-form-step">
          <label>Título del nodo</label>
          <div class="assistant-suggestions">
            ${sugerencias
              .map((s) => `<button type="button" class="assistant-chip" data-title="${s}">${s}</button>`)
              .join("")}
          </div>
          <input type="text" id="assistantTitulo" placeholder="Ej. Revisar solicitud" required />
          <div class="assistant-actions">
            <button type="button" class="assistant-secondary" id="assistantBackTipo">Atrás</button>
            <button type="submit" class="assistant-primary">Siguiente</button>
          </div>
        </form>
      `;

      this.formArea.querySelectorAll(".assistant-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          this.formArea.querySelector("#assistantTitulo").value = chip.dataset.title;
        });
      });

      this.formArea.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const titulo = this.formArea.querySelector("#assistantTitulo").value.trim();
        this.draft.titulo = titulo || "Nodo";
        this.currentStep = "descripcion";
        this.renderStep();
      });

      this.formArea.querySelector("#assistantBackTipo")
          .addEventListener("click", () => {
            this.currentStep = "tipo";
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
            <button type="submit" class="assistant-primary">Siguiente</button>
          </div>
        </form>
      `;

      this.formArea.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        this.draft.descripcion = this.formArea.querySelector("#assistantDescripcion").value.trim();
        this.draft.tareaManual = this.formArea.querySelector("#assistantTareaManual").checked;
        this.currentStep = "asignacion";
        this.renderStep();
      });

      this.formArea.querySelector("#assistantBackTipo")
          .addEventListener("click", () => {
            this.currentStep = "tipo";
            this.renderStep();
          });
      return;
    }

    if (this.currentStep === "asignacion") {
      const grupos = Array.from(Engine.asignaciones?.grupos || []);
      const usuarios = Array.from(Engine.asignaciones?.usuarios || []);

      this.formArea.innerHTML = `
        <form class="assistant-form-step">
          <label>¿A qué grupo se asigna?</label>
          <input list="assistantGruposList" id="assistantAsignGrupo" placeholder="Selecciona o escribe" />
          <datalist id="assistantGruposList">
            ${grupos.map((g) => `<option value="${g}"></option>`).join("")}
          </datalist>
          <label>¿A qué usuario se asigna?</label>
          <input list="assistantUsuariosList" id="assistantAsignUsuario" placeholder="Selecciona o escribe" />
          <datalist id="assistantUsuariosList">
            ${usuarios.map((u) => `<option value="${u}"></option>`).join("")}
          </datalist>
          <div class="assistant-actions">
            <button type="button" class="assistant-secondary" id="assistantBackDescripcion">Atrás</button>
            <button type="submit" class="assistant-primary">Crear nodo</button>
          </div>
        </form>
      `;

      this.formArea.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        this.draft.asignadoA = this.formArea.querySelector("#assistantAsignGrupo")?.value.trim();
        this.draft.asignadoUsuario = this.formArea.querySelector("#assistantAsignUsuario")?.value.trim();
        this.finalizarNodo();
      });

      this.formArea.querySelector("#assistantBackDescripcion")
          .addEventListener("click", () => {
            this.currentStep = "descripcion";
            this.renderStep();
          });
      return;
    }
  },

  finalizarNodo() {
    const coords = this.computeNextPosition();
    const nodo = Engine.createNode(this.draft.tipo, coords.x, coords.y);
    Engine.updateNode(nodo.id, {
      titulo: this.draft.titulo,
      descripcion: this.draft.descripcion,
      tareaManual: this.draft.tareaManual,
      asignadoA: this.draft.asignadoA,
      asignadoUsuario: this.draft.asignadoUsuario
    });

    if (this.draft.asignadoA) Engine.asignaciones.grupos.add(this.draft.asignadoA);
    if (this.draft.asignadoUsuario) Engine.asignaciones.usuarios.add(this.draft.asignadoUsuario);
    if (window.UI && typeof UI.updateAsignacionesList === "function") {
      UI.updateAsignacionesList();
    }

    this.addMessage(`✅ Nodo creado: ${this.draft.titulo}`);

    if (this.pendingFromId) {
      const conn = Engine.createConnection(this.pendingFromId, nodo.id, "bottom", "top");
      if (conn && this.pendingCondition) {
        const tes = this.ensureTesauroForCondition(
          this.pendingCondition.nombre,
          this.pendingCondition.valor
        );
        if (tes) this.addMessage(`🧩 Condición guardada en tesauro: ${tes.nombre}`);
        Engine.updateConnectionCondition(
          conn.id,
          this.pendingCondition.nombre,
          this.pendingCondition.valor
        );
      }
      if (conn) {
        this.addMessage("↗️ Conexión añadida con el nodo anterior");
      }
      this.pendingFromId = null;
      this.pendingCondition = null;
      this.pendingLayoutHint = null;
    }

    this.lastNodeId = nodo.id;
    this.setWorkingNode(nodo.id);
    this.currentStep = "salidas";
    this.askOutputsForNode(nodo.id);
  },

  askOutputsForNode(nodeId) {
    const nodo = Engine.data.nodos.find((n) => n.id === nodeId);
    if (!nodo) return this.renderIdleActions();

    this.activeOutputsFor = nodeId;
    this.setWorkingNode(nodeId);

    const context = this.renderNodeContext(nodo);

    this.formArea.innerHTML = `
      <form class="assistant-form-step">
        ${context}
        <div class="assistant-prompt">
          <p>¿Cuántas salidas tiene "${nodo.titulo}"?</p>
          <span>Primero terminamos este nodo antes de crear el siguiente</span>
        </div>
        <div class="assistant-choice-grid">
          <label class="assistant-choice-card">
            <input type="radio" name="salidas" value="0" />
            <div>
              <strong>0</strong>
              <p>Finaliza aquí</p>
            </div>
          </label>
          <label class="assistant-choice-card">
            <input type="radio" name="salidas" value="1" />
            <div>
              <strong>1 salida</strong>
              <p>Indicamos condición y destino</p>
            </div>
          </label>
          <label class="assistant-choice-card">
            <input type="radio" name="salidas" value="2" />
            <div>
              <strong>2 o más</strong>
              <p>Configura bifurcaciones</p>
            </div>
          </label>
        </div>
        <div class="assistant-actions">
          <button type="submit" class="assistant-primary">Definir salidas</button>
        </div>
      </form>
    `;

    this.formArea.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const value = this.formArea.querySelector("input[name='salidas']:checked")?.value;
      if (value === undefined) return;

      if (value === "0") return this.handleZeroOutputs(nodeId);
      if (value === "1") return this.handleSingleOutput(nodeId);
      return this.handleMultipleOutputs(nodeId);
    });
  },

  handleZeroOutputs(nodeId) {
    this.closedEnds.add(nodeId);
    this.addMessage("Nodo marcado como final sin salidas.");
    this.afterOutputsComplete(nodeId);
  },

  handleSingleOutput(nodeId) {
    const options = Engine.data.nodos
      .filter((n) => n.id !== nodeId)
      .map((n) => `<option value="${n.id}">${n.titulo || n.id}</option>`)
      .join("");

    const nodo = Engine.getNode(nodeId);
    const context = nodo ? this.renderNodeContext(nodo) : "";

    this.formArea.innerHTML = `
      <form class="assistant-form-step">
        ${context}
        ${this.renderConditionInputs()}
        <label>Destino</label>
        <select id="assistantDestino">
          <option value="new">Crear nuevo nodo</option>
          ${options}
        </select>
        <div class="assistant-actions">
          <button type="submit" class="assistant-primary">Continuar</button>
        </div>
      </form>
    `;

    this.formArea.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const condNombre = this.formArea.querySelector("#assistantCondNombre").value.trim();
      const condValor = this.formArea.querySelector("#assistantCondValor").value.trim();
      const destino = this.formArea.querySelector("#assistantDestino").value;

      if (destino === "new") {
        this.postOutputsCallbacks.push(() => this.afterOutputsComplete(nodeId));
        this.startNodeFlow(nodeId, { nombre: condNombre, valor: condValor }, {
          branchIndex: 0,
          branchTotal: 1
        });
        return;
      }

      const conn = Engine.createConnection(nodeId, destino, "bottom", "top");
      if (conn && (condNombre || condValor)) {
        const tes = this.ensureTesauroForCondition(condNombre, condValor);
        if (tes) this.addMessage(`🧩 Condición guardada en tesauro: ${tes.nombre}`);
        Engine.updateConnectionCondition(conn.id, condNombre, condValor);
      }
      this.addMessage("🔗 Conexión creada");
      this.afterOutputsComplete(nodeId);
    });
  },

  handleMultipleOutputs(nodeId) {
    this.multiFlowContext = { fromId: nodeId, total: 0, completed: 0 };
    const nodo = Engine.getNode(nodeId);
    const context = nodo ? this.renderNodeContext(nodo) : "";
    this.formArea.innerHTML = `
      <form class="assistant-form-step">
        ${context}
        <label>Número de salidas</label>
        <input id="assistantNumeroSalidas" type="number" min="2" value="2" />
        <div class="assistant-actions">
          <button type="submit" class="assistant-primary">Configurar</button>
        </div>
      </form>
    `;

    this.formArea.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const cantidad = parseInt(this.formArea.querySelector("#assistantNumeroSalidas").value, 10) || 2;
      this.multiFlowContext.total = Math.max(2, cantidad);
      this.renderMultiOutputStep();
    });
  },

  renderMultiOutputStep() {
    const ctx = this.multiFlowContext;
    if (!ctx) return this.renderIdleActions();
    if (ctx.completed >= ctx.total) {
      this.multiFlowContext = null;
      this.afterOutputsComplete(ctx.fromId);
      return;
    }

    this.activeOutputsFor = ctx.fromId;
    this.setWorkingNode(ctx.fromId);

    const options = Engine.data.nodos
      .filter((n) => n.id !== ctx.fromId)
      .map((n) => `<option value="${n.id}">${n.titulo || n.id}</option>`)
      .join("");

    const nodo = Engine.getNode(ctx.fromId);
    const context = nodo ? this.renderNodeContext(nodo, ctx) : "";

    this.formArea.innerHTML = `
      <form class="assistant-form-step">
        ${context}
        <label>Salida ${ctx.completed + 1} de ${ctx.total}</label>
        ${this.renderConditionInputs()}
        <label>Destino</label>
        <select id="assistantDestino">
          <option value="new">Crear nuevo nodo</option>
          ${options}
        </select>
        <div class="assistant-actions">
          <button type="submit" class="assistant-primary">Guardar salida</button>
        </div>
      </form>
    `;

    this.formArea.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const condNombre = this.formArea.querySelector("#assistantCondNombre").value.trim();
      const condValor = this.formArea.querySelector("#assistantCondValor").value.trim();
      const destino = this.formArea.querySelector("#assistantDestino").value;

      if (destino === "new") {
        this.postOutputsCallbacks.push(() => {
          ctx.completed += 1;
          this.renderMultiOutputStep();
        });
        this.startNodeFlow(
          ctx.fromId,
          { nombre: condNombre, valor: condValor },
          { branchIndex: ctx.completed, branchTotal: ctx.total }
        );
        return;
      }

      const conn = Engine.createConnection(ctx.fromId, destino, "bottom", "top");
      if (conn && (condNombre || condValor)) {
        const tes = this.ensureTesauroForCondition(condNombre, condValor);
        if (tes) this.addMessage(`🧩 Condición guardada en tesauro: ${tes.nombre}`);
        Engine.updateConnectionCondition(conn.id, condNombre, condValor);
      }
      ctx.completed += 1;
      this.renderMultiOutputStep();
    });
  },

  afterOutputsComplete(nodeId) {
    this.activeOutputsFor = null;
    this.setWorkingNode(null);
    const callbacks = [...this.postOutputsCallbacks];
    this.postOutputsCallbacks = [];
    if (callbacks.length) {
      callbacks.shift()();
      this.postOutputsCallbacks = callbacks;
      return;
    }

    this.addMessage("💾 Guardado del estado actual del editor.");
    Engine.saveHistory();
    this.promptOpenEnds();
  },

  promptOpenEnds() {
    const abiertos = Engine.data.nodos.filter((n) => {
      const out = Engine.data.conexiones.filter((c) => c.from === n.id);
      return out.length === 0 && !this.closedEnds.has(n.id);
    });

    if (!abiertos.length) {
      this.addMessage("Todos los nodos tienen salidas definidas o están marcados como finales.");
      this.renderIdleActions();
      return;
    }

    const siguiente = abiertos[0];
    this.addMessage(`El nodo "${siguiente.titulo}" no tiene salidas. ¿El flujo termina ahí?`);
    this.formArea.innerHTML = `
      <div class="assistant-actions">
        <button class="assistant-secondary" id="assistantFinaliza">Sí, finaliza</button>
        <button class="assistant-primary" id="assistantConectar">No, conectar</button>
      </div>
    `;

    this.formArea.querySelector("#assistantFinaliza").addEventListener("click", () => {
      this.closedEnds.add(siguiente.id);
      this.promptOpenEnds();
    });

    this.formArea.querySelector("#assistantConectar").addEventListener("click", () => {
      this.askOutputsForNode(siguiente.id);
    });
  },

  renderNodeContext(nodo, ctx = null) {
    const branch = ctx?.total
      ? `<span class="assistant-context-badge">${ctx.completed + 1}/${ctx.total}</span>`
      : "";
    return `
      <div class="assistant-context">
        <span class="assistant-context-label">Nodo actual</span>
        <strong>${nodo.titulo || nodo.id}</strong>
        ${branch}
      </div>
    `;
  },

  setWorkingNode(nodeId) {
    if (this.workingNodeId === nodeId) return;
    document.querySelectorAll(".node.assistant-focus").forEach((el) =>
      el.classList.remove("assistant-focus")
    );
    this.workingNodeId = nodeId;
    if (!nodeId) return;
    const el = document.getElementById(nodeId);
    if (el) {
      el.classList.add("assistant-focus");
    }
    if (Engine && typeof Engine.selectNode === "function") {
      Engine.selectNode(nodeId);
    }
  }
};

Assistant.computeNextPosition = function () {
  const GRID = (window.Interactions && Interactions.GRID_SIZE) || 20;
  const parent = this.pendingFromId
    ? Engine.getNode(this.pendingFromId)
    : (this.lastNodeId ? Engine.getNode(this.lastNodeId) : null);

  const base = parent || { x: this.getCanvasCenter().x - 100, y: 40, width: 200, height: 80 };
  const gapY = 180;
  const gapX = 240;

  let x = base.x;
  let y = (parent ? base.y + (base.height || 100) + gapY : base.y);

  if (this.pendingLayoutHint && typeof this.pendingLayoutHint.branchIndex === "number") {
    const { branchIndex, branchTotal } = this.pendingLayoutHint;
    const offset = (branchIndex - (branchTotal - 1) / 2) * gapX;
    x = base.x + offset;
  }

  x = Math.round(x / GRID) * GRID;
  y = Math.round(y / GRID) * GRID;

  return { x: Math.max(20, x), y: Math.max(20, y) };
};

Assistant.getCanvasCenter = function () {
  const area = document.getElementById("canvasArea");
  const container = Renderer?.container;
  if (!area || !container) return { x: 200, y: 60 };

  const rectArea = area.getBoundingClientRect();
  const rectCanvas = container.getBoundingClientRect();

  return {
    x: rectArea.left + rectArea.width / 2 - rectCanvas.left,
    y: rectArea.top + 40 - rectCanvas.top
  };
};

Assistant.ensureTesauroForCondition = function (nombre, valor) {
  if (!nombre && valor) nombre = valor;
  if (!nombre) return null;
  const list = Engine.tesauro || [];
  const existing = list.find(
    (c) => c.nombre?.toLowerCase?.() === nombre.toLowerCase()
  );
  if (existing) return existing;

  const cleanValor = (valor || "").trim();
  const normalized = cleanValor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  let tipo = "texto";
  let opciones = undefined;

  if (cleanValor) {
    if (["si", "sí", "no"].includes(normalized)) {
      tipo = "si_no";
    } else if (!isNaN(Number(cleanValor))) {
      tipo = "numerico";
    } else {
      tipo = "selector";
      opciones = [cleanValor];
    }
  }

  const refGen = window.DataTesauro?.generarReferenciaDesdeNombre;
  const ref = refGen ? refGen(nombre) : nombre.replace(/\s+/g, "").slice(0, 20) || nombre;
  const newId = window.DataTesauro?.generateId?.() || Engine.generateId();
  const nuevo = { id: newId, nombre, ref, tipo };
  if (opciones) nuevo.opciones = opciones;

  Engine.tesauro = [...list, nuevo];

  if (window.DataTesauro) {
    DataTesauro.campos = [...Engine.tesauro];
    DataTesauro.sync?.();
    DataTesauro.render?.();
  } else {
    Engine.saveHistory?.();
  }

  return nuevo;
};

window.addEventListener("DOMContentLoaded", () => {
  Assistant.init();
  window.Assistant = Assistant;
});

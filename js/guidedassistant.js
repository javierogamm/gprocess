/* ============================================================
   GUIDEDASSISTANT.JS - Asistente Hiper-Guiado para Procedimientos
   ------------------------------------------------------------
   - Asistente paso a paso para crear procedimientos desde cero
   - Encadena preguntas individuales: tipo, grupo, usuario, nodos siguientes
   - Sugiere títulos basados en tareas administrativas
   - Genera tesauros automáticamente con las conexiones
   - Todo con selectores (pero permite escribir también)
============================================================ */

const GuidedAssistant = {
    // Referencias DOM
    btn: null,
    modal: null,
    content: null,
    progressBar: null,
    isVisible: false,

    // Estado del asistente
    state: {
        step: 0,
        fichaProyecto: {
            procedimiento: "",
            actividad: "",
            descripcion: "",
            entidad: ""
        },
        nodos: [],
        conexiones: [],
        currentNode: null,
        nextNodes: [],
        tesaurosCreados: new Set(),
        canvasMap: {},
        nodePositions: {},
        layoutCursorY: 100,
        finalizedNodes: new Set(),
        pendingManualContinuation: null
    },

    // Sugerencias de títulos por tipo de nodo
    suggestions: {
        formulario: [
            "Revisión de la solicitud",
            "Evaluación técnica",
            "Análisis de documentación",
            "Verificación de requisitos",
            "Comprobación de datos",
            "Revisión de la subsanación"
        ],
        documento: [
            "Requerimiento de subsanación",
            "Informe técnico",
            "Notificación de resolución",
            "Certificado de expediente",
            "Documento acreditativo",
            "Acta de inspección"
        ],
        plazo: [
            "Plazo de subsanación",
            "Plazo de alegaciones",
            "Plazo de presentación",
            "Plazo de trámite",
            "Plazo de resolución"
        ],
        circuito: [
            "Resolución de concesión",
            "Resolución de denegación",
            "Resolución provisional",
            "Resolución definitiva",
            "Circuito de firma"
        ],
        decision: [
            "¿Procede subsanación?",
            "¿Es favorable?",
            "¿Cumple requisitos?",
            "¿Necesita informe?",
            "¿Está completo?"
        ],
        operacion_externa: [
            "Consulta base de datos",
            "Validación externa",
            "Registro en sistema",
            "Notificación telemática"
        ],
        libre: [
            "Tarea libre",
            "Acción personalizada"
        ]
    },

    /* ============================================================
       INICIALIZACIÓN
    ============================================================ */
    init() {
        console.log("🚀 [GuidedAssistant.init] Inicializando asistente guiado");

        // Crear botón flotante
        if (!document.getElementById("btnGuidedAssistant")) {
            const btn = document.createElement("button");
            btn.id = "btnGuidedAssistant";
            btn.className = "floating-guided-btn";
            btn.innerHTML = "🎯 Asistente Guiado";
            btn.title = "Crear procedimiento paso a paso";
            document.body.appendChild(btn);
        }

        // Crear modal
        if (!document.getElementById("guidedAssistantModal")) {
            const modal = document.createElement("div");
            modal.id = "guidedAssistantModal";
            modal.className = "guided-modal hidden";
            modal.innerHTML = `
                <div class="guided-modal-backdrop"></div>
                <div class="guided-modal-content">
                    <div class="guided-header">
                        <h3>🎯 Asistente Guiado de Procedimientos</h3>
                        <button id="guidedCloseBtn" class="guided-close-btn">&times;</button>
                    </div>
                    <div class="guided-progress">
                        <div class="guided-progress-bar" id="guidedProgressBar"></div>
                    </div>
                    <div class="guided-body" id="guidedContent">
                        <!-- Contenido dinámico -->
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // *** NUEVO: Forzar formato panel lateral para ver el editor ***
            modal.style.position = "fixed";
            modal.style.top = "0";
            modal.style.right = "0";
            modal.style.bottom = "0";
            modal.style.width = "420px";
            modal.style.zIndex = "99998";
            modal.style.display = "flex";
            modal.style.alignItems = "stretch";
            modal.style.justifyContent = "flex-end";
            modal.style.background = "transparent";

            const backdrop = modal.querySelector(".guided-modal-backdrop");
            if (backdrop) {
                backdrop.style.display = "none";
            }

            const contentPanel = modal.querySelector(".guided-modal-content");
            if (contentPanel) {
                contentPanel.style.height = "100%";
                contentPanel.style.width = "100%";
                contentPanel.style.borderRadius = "0";
            }
        }

        this.btn = document.getElementById("btnGuidedAssistant");
        this.modal = document.getElementById("guidedAssistantModal");
        this.content = document.getElementById("guidedContent");
        this.progressBar = document.getElementById("guidedProgressBar");

        // Asegurar que el panel arranca oculto y sin interferir en el layout
        this.setVisibility(false, { skipReset: true });

        // Eventos
        this.btn.addEventListener("click", () => this.open());

        document.getElementById("guidedCloseBtn").addEventListener("click", () => this.close());

        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal || e.target.classList.contains("guided-modal-backdrop")) {
                this.close();
            }
        });

        console.log("✅ [GuidedAssistant] Inicializado correctamente");
    },

    /* ============================================================
       ABRIR / CERRAR MODAL
    ============================================================ */
    setVisibility(show, { skipReset = false } = {}) {
        if (!this.modal) return;

        this.isVisible = show;
        this.modal.classList.toggle("hidden", !show);
        this.modal.setAttribute("aria-hidden", show ? "false" : "true");

        if (!show && !skipReset) {
            this.resetState();
        }
    },

    open() {
        this.resetState();
        this.setVisibility(true, { skipReset: true });
        this.showStep0_Welcome();
    },

    close(options = {}) {
        const { skipConfirm = false, preserveState = false } = options;

        if (!skipConfirm && this.state.step > 0 && this.state.nodos.length > 0) {
            if (!confirm("¿Seguro que quieres salir? Se perderá el progreso del asistente.")) {
                return;
            }
        }

        this.setVisibility(false, { skipReset: preserveState });
        if (!preserveState) {
            this.resetState();
        }
    },

    resetState() {
        this.state = {
            step: 0,
            fichaProyecto: {
                procedimiento: "",
                actividad: "",
                descripcion: "",
                entidad: ""
            },
            nodos: [],
            conexiones: [],
            currentNode: null,
            nextNodes: [],
            tesaurosCreados: new Set(),
            canvasMap: {},
            nodePositions: {},
            layoutCursorY: 100,
            finalizedNodes: new Set(),
            pendingManualContinuation: null
        };
    },

    updateProgress(percent) {
        if (this.progressBar) {
            this.progressBar.style.width = percent + "%";
        }
    },

    parseList(text) {
        return Array.from(new Set(
            text
                .split(/[,;\n]+/)
                .map(t => t.trim())
                .filter(Boolean)
        ));
    },

    getAutoPosition(tempId) {
        if (!this.state.nodePositions[tempId]) {
            this.state.nodePositions[tempId] = {
                x: 400,
                y: this.state.layoutCursorY
            };
            this.state.layoutCursorY += 140;
        }
        return this.state.nodePositions[tempId];
    },

    /* ============================================================
       PASO 0: BIENVENIDA Y DATOS DEL PROCEDIMIENTO
    ============================================================ */
    showStep0_Welcome() {
        this.updateProgress(0);
        this.content.innerHTML = `
            <div class="guided-welcome">
                <h4>👋 ¡Bienvenido al Asistente Guiado!</h4>
                <p>Te ayudaré a crear tu procedimiento paso a paso, preguntándote por cada tarea y sus conexiones.</p>

                <div class="guided-form">
                    <div class="guided-field">
                        <label>📋 Nombre del procedimiento *</label>
                        <input type="text" id="inputProcedimiento" placeholder="Ej: Licencia de obras">
                    </div>

                    <div class="guided-field">
                        <label>📁 Actividad</label>
                        <input type="text" id="inputActividad" placeholder="Ej: Urbanismo">
                    </div>

                    <div class="guided-field">
                        <label>📝 Descripción</label>
                        <textarea id="inputDescripcion" rows="3" placeholder="Describe brevemente el procedimiento..."></textarea>
                    </div>

                    <div class="guided-field">
                        <label>🏢 Entidad</label>
                        <input type="text" id="inputEntidad" placeholder="Ej: Ayuntamiento de...">
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.close()">Cancelar</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step0_Continue()">Continuar →</button>
                </div>
            </div>
        `;
    },

    step0_Continue() {
        const procedimiento = document.getElementById("inputProcedimiento").value.trim();
        if (!procedimiento) {
            alert("⚠️ El nombre del procedimiento es obligatorio");
            return;
        }

        this.state.fichaProyecto = {
            procedimiento: procedimiento,
            actividad: document.getElementById("inputActividad").value.trim(),
            descripcion: document.getElementById("inputDescripcion").value.trim(),
            entidad: document.getElementById("inputEntidad").value.trim()
        };

        this.state.step = 0.5;
        this.showStep0b_Asignaciones();
    },

    /* ============================================================
       PASO 0B: LISTAS DE GRUPOS / USUARIOS
    ============================================================ */
    showStep0b_Asignaciones() {
        this.updateProgress(10);
        this.content.innerHTML = `
            <div class="guided-step">
                <h4>👥 Añade tus grupos y usuarios</h4>
                <p>Pega las listas (una línea por elemento, o separadas por comas) para usarlas durante el asistente.</p>

                <div class="guided-form">
                    <div class="guided-field">
                        <label>Lista de grupos</label>
                        <textarea id="inputListaGrupos" rows="4" placeholder="Ej:\nUnidad Gestora\nSecretaría\nIntervención"></textarea>
                    </div>
                    <div class="guided-field">
                        <label>Lista de usuarios</label>
                        <textarea id="inputListaUsuarios" rows="4" placeholder="Ej:\nJuan Pérez\nAna García"></textarea>
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.showStep0_Welcome()">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step0b_SaveAssignments()">Continuar →</button>
                </div>
            </div>
        `;
    },

    step0b_SaveAssignments() {
        const gruposText = document.getElementById("inputListaGrupos")?.value || "";
        const usuariosText = document.getElementById("inputListaUsuarios")?.value || "";

        const grupos = this.parseList(gruposText);
        const usuarios = this.parseList(usuariosText);

        grupos.forEach(g => Engine.addGrupo(g));
        usuarios.forEach(u => Engine.addUsuario(u));

        if (window.UI && typeof UI.updateAsignacionesList === "function") {
            UI.updateAsignacionesList();
        }

        this.state.step = 1;
        this.showStep1_CreateFirstNode();
    },

    /* ============================================================
       PASO 1: CREAR PRIMER NODO
    ============================================================ */
    showStep1_CreateFirstNode() {
        this.updateProgress(20);
        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🎯 Paso 1: Primera tarea del procedimiento</h4>
                <p>Vamos a crear la primera tarea de tu procedimiento.</p>

                <div class="guided-form">
                    ${this.renderNodeTypeSelector()}
                    ${this.renderNodeTitleInput()}
                    ${this.renderGroupSelector()}
                    ${this.renderUserSelector()}
                    ${this.renderManualTaskCheckbox()}
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.goBack()">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step1_CreateNode()">Crear tarea →</button>
                </div>
            </div>
        `;

        // Eventos dinámicos
        this.attachNodeTypeChangeEvent();
        this.attachTitleSuggestionsEvent();
    },

    renderNodeTypeSelector() {
        return `
            <div class="guided-field">
                <label>🔷 Tipo de tarea *</label>
                <select id="selectNodeType" class="guided-select">
                    <option value="">-- Selecciona un tipo --</option>
                    <option value="formulario">📝 Formulario (revisión, evaluación)</option>
                    <option value="documento">📄 Documento (requerimiento, informe)</option>
                    <option value="plazo">⏰ Plazo (tiempo de espera)</option>
                    <option value="circuito">🔄 Circuito (resolución, firma)</option>
                    <option value="decision">🔀 Decisión (bifurcación)</option>
                    <option value="operacion_externa">🔌 Operación Externa</option>
                    <option value="libre">🆓 Libre</option>
                </select>
            </div>
        `;
    },

    renderNodeTitleInput() {
        return `
            <div class="guided-field">
                <label>✏️ Título de la tarea *</label>
                <input type="text" id="inputNodeTitle" class="guided-input" placeholder="Escribe o selecciona una sugerencia...">
                <div id="titleSuggestions" class="guided-suggestions"></div>
            </div>
        `;
    },

    renderGroupSelector() {
        const grupos = Array.from(Engine.asignaciones?.grupos || []);
        return `
            <div class="guided-field">
                <label>👥 Grupo asignado</label>
                <input list="groupList" id="inputGroup" class="guided-input" placeholder="Escribe o selecciona un grupo...">
                <datalist id="groupList">
                    ${grupos.map(g => `<option value="${g}">`).join('')}
                    <option value="Unidad Gestora">
                </datalist>
            </div>
        `;
    },

    renderUserSelector() {
        const usuarios = Array.from(Engine.asignaciones?.usuarios || []);
        return `
            <div class="guided-field">
                <label>👤 Usuario asignado</label>
                <input list="userList" id="inputUser" class="guided-input" placeholder="Escribe o selecciona un usuario...">
                <datalist id="userList">
                    ${usuarios.map(u => `<option value="${u}">`).join('')}
                </datalist>
            </div>
        `;
    },

    renderManualTaskCheckbox() {
        return `
            <div class="guided-field">
                <label class="guided-checkbox">
                    <input type="checkbox" id="checkManual">
                    <span>⚙️ Es una tarea manual (requiere intervención humana)</span>
                </label>
            </div>
        `;
    },

    attachNodeTypeChangeEvent() {
        const select = document.getElementById("selectNodeType");
        if (select) {
            select.addEventListener("change", (e) => {
                const tipo = e.target.value;
                this.updateTitleSuggestions(tipo);
                this.autoDetectManualTask(tipo);
            });
        }
    },

    attachTitleSuggestionsEvent() {
        const input = document.getElementById("inputNodeTitle");
        const suggestionsDiv = document.getElementById("titleSuggestions");

        if (input && suggestionsDiv) {
            input.addEventListener("focus", () => {
                const tipo = document.getElementById("selectNodeType").value;
                if (tipo) this.updateTitleSuggestions(tipo);
            });
        }
    },

    updateTitleSuggestions(tipo) {
        const suggestionsDiv = document.getElementById("titleSuggestions");
        if (!suggestionsDiv || !tipo) return;

        const suggestions = this.suggestions[tipo] || [];
        if (suggestions.length === 0) {
            suggestionsDiv.innerHTML = "";
            return;
        }

        suggestionsDiv.innerHTML = `
            <div class="guided-suggestions-list">
                ${suggestions.map(s => `
                    <button class="guided-suggestion-item" onclick="GuidedAssistant.selectSuggestion('${s}')">${s}</button>
                `).join('')}
            </div>
        `;
    },

    selectSuggestion(title) {
        const input = document.getElementById("inputNodeTitle");
        if (input) {
            input.value = title;
            const sug = document.getElementById("titleSuggestions");
            if (sug) sug.innerHTML = "";
        }
    },

    autoDetectManualTask(tipo) {
        const checkbox = document.getElementById("checkManual");
        if (!checkbox) return;

        const manualTypes = ["formulario", "circuito"];
        const autoTypes = ["plazo"];

        if (manualTypes.includes(tipo)) {
            checkbox.checked = true;
        } else if (autoTypes.includes(tipo)) {
            checkbox.checked = false;
        }
    },

    step1_CreateNode() {
        const tipo = document.getElementById("selectNodeType").value;
        const titulo = document.getElementById("inputNodeTitle").value.trim();
        const grupo = document.getElementById("inputGroup").value.trim();
        const usuario = document.getElementById("inputUser").value.trim();
        const manual = document.getElementById("checkManual").checked;

        if (!tipo) {
            alert("⚠️ Selecciona un tipo de tarea");
            return;
        }
        if (!titulo) {
            alert("⚠️ Escribe un título para la tarea");
            return;
        }

        const nodo = {
            tipo: tipo,
            titulo: titulo,
            asignadoA: grupo,
            asignadoUsuario: usuario,
            tareaManual: manual,
            tempId: "temp_" + Math.random().toString(36).substring(2, 9)
        };

        this.getAutoPosition(nodo.tempId);
        this.state.nodos.push(nodo);
        this.state.currentNode = nodo;

        if (grupo) Engine.addGrupo(grupo);
        if (usuario) Engine.addUsuario(usuario);

        this.renderPreview();

        this.state.step = 2;
        this.showStep2_WhatNext();
    },

    /* ============================================================
       PASO 2: ¿QUÉ OCURRE DESPUÉS?
    ============================================================ */
    showStep2_WhatNext() {
        const currentNode = this.state.currentNode;
        this.state.step = 2;
        this.updateProgress(40 + (this.state.nodos.length * 10));

        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🔗 Paso 2: ¿Qué ocurre después de "${currentNode.titulo}"?</h4>
                <p>Indica cuántas tareas siguen a esta, o si vuelve a una tarea anterior.</p>

                <div class="guided-form">
                    <div class="guided-choice-buttons">
                        <button class="guided-choice-btn" onclick="GuidedAssistant.step2_NoNext()">
                            🏁 Es la tarea final
                        </button>
                        <button class="guided-choice-btn" onclick="GuidedAssistant.step2_OneNext()">
                            ➡️ Una tarea más
                        </button>
                        <button class="guided-choice-btn" onclick="GuidedAssistant.step2_MultipleNext()">
                            🔀 Varias tareas (bifurcación)
                        </button>
                        <!-- *** NUEVO: volver a tarea anterior *** -->
                        <button class="guided-choice-btn" onclick="GuidedAssistant.step2_PreviousTask()">
                            ↩️ Volver a una tarea anterior
                        </button>
                        <!-- *** NUEVO: usar bloque estándar de Wizard *** -->
                        <button class="guided-choice-btn" onclick="GuidedAssistant.step2_UseWizardFlow()">
                            🧙 Bloque estándar (Wizard)
                        </button>
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.goBack()">← Atrás</button>
                </div>
            </div>
        `;
    },

    step2_NoNext() {
        if (this.state.currentNode) {
            this.state.finalizedNodes.add(this.state.currentNode.tempId);
        }
        this.showStep5_AskMore();
    },

    step2_OneNext() {
        this.askWizardBeforeContinuing(() => {
            this.state.nextNodes = [{ fromNode: this.state.currentNode, hasCondition: false }];
            this.showStep3_AskCondition(0);
        });
    },

    step2_MultipleNext() {
        this.askWizardBeforeContinuing(() => this.showStep2b_HowManyNext());
    },

    askWizardBeforeContinuing(onManualContinuation) {
        this.state.pendingManualContinuation = onManualContinuation;
        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🧙 ¿Quieres que el siguiente tramo sea un bloque Wizard?</h4>
                <p>Si eliges Wizard, añadiremos un flujo predefinido justo después de "${this.state.currentNode.titulo}".</p>

                <div class="guided-choice-buttons">
                    <button class="guided-choice-btn" onclick="GuidedAssistant.step2_UseWizardFlow()">🧙 Sí, usar Wizard</button>
                    <button class="guided-choice-btn" onclick="GuidedAssistant.continueAfterWizardQuestion()">✏️ No, lo defino yo</button>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.showStep2_WhatNext()">← Atrás</button>
                </div>
            </div>
        `;
    },

    continueAfterWizardQuestion() {
        const cb = this.state.pendingManualContinuation;
        this.state.pendingManualContinuation = null;
        if (typeof cb === "function") cb();
    },

    showStep2b_HowManyNext() {
        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🔀 ¿Cuántas tareas siguen?</h4>

                <div class="guided-form">
                    <div class="guided-field">
                        <label>Número de tareas siguientes:</label>
                        <input type="number" id="inputNextCount" min="2" max="5" value="2" class="guided-input">
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.showStep2_WhatNext()">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step2b_Continue()">Continuar →</button>
                </div>
            </div>
        `;
    },

    step2b_Continue() {
        const count = parseInt(document.getElementById("inputNextCount").value, 10);
        if (count < 2 || count > 5) {
            alert("⚠️ El número debe estar entre 2 y 5");
            return;
        }

        this.state.nextNodes = [];
        for (let i = 0; i < count; i++) {
            this.state.nextNodes.push({ fromNode: this.state.currentNode, hasCondition: false });
        }

        this.showStep3_AskCondition(0);
    },

    /* === NUEVO: opción de volver a una tarea anterior ================== */
    step2_PreviousTask() {
        const candidatos = this.state.nodos.filter(
            n => this.state.currentNode && n.tempId !== this.state.currentNode.tempId
        );
        if (!candidatos.length) {
            alert("⚠️ Aún no hay tareas anteriores a las que volver.");
            return;
        }

        this.showStep2c_SelectPreviousTask(candidatos);
    },

    showStep2c_SelectPreviousTask(candidatos) {
        this.content.innerHTML = `
            <div class="guided-step">
                <h4>↩️ Volver a una tarea anterior</h4>
                <p>Selecciona la tarea a la que se volverá después de "${this.state.currentNode.titulo}".</p>

                <div class="guided-form">
                    <div class="guided-field">
                        <label>Tareas disponibles:</label>
                        <select id="selectPreviousTask" class="guided-select">
                            ${candidatos.map(n => `
                                <option value="${n.tempId}">${n.titulo} (${n.tipo})</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.showStep2_WhatNext()">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step2c_SavePreviousTask()">Continuar →</button>
                </div>
            </div>
        `;
    },

    step2c_SavePreviousTask() {
        const select = document.getElementById("selectPreviousTask");
        const tempId = select ? select.value : "";
        if (!tempId) {
            alert("⚠️ Selecciona una tarea");
            return;
        }

        this.state.nextNodes = [{
            fromNode: this.state.currentNode,
            hasCondition: false,
            mode: "existing",
            targetTempId: tempId
        }];

        this.showStep3_AskCondition(0);
    },

    /* === NUEVO: opción de usar bloque estándar Wizard ================== */
    step2_UseWizardFlow() {
        this.state.pendingManualContinuation = null;
        if (!window.Wizard || typeof Wizard.getDiagramTemplate !== "function") {
            alert("⚠️ No se pueden cargar las plantillas de Wizard (no disponible).");
            return;
        }

        this.showStep2_WizardFlowSelection();
    },

    showStep2_WizardFlowSelection() {
        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🧙 Añadir bloque estándar (Wizard)</h4>
                <p>Elige un flujo predefinido de Wizard para que continúe después de "${this.state.currentNode.titulo}".</p>

                <div class="guided-form">
                    <div class="guided-field">
                        <label>Plantilla de flujo:</label>
                        <select id="selectWizardTemplate" class="guided-select">
                            <option value="">-- Elige una plantilla --</option>
                            <option value="tramiteCompleto">📄 Procedimiento Tipo Completo</option>
                            <option value="subsanacion">📝 Flujo de Subsanación</option>
                            <option value="resolucionProvisionalAlegaciones">📝 Resolución Provisional con Alegaciones</option>
                        </select>
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.showStep2_WhatNext()">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step2_ApplyWizardTemplate()">Añadir bloque →</button>
                </div>
            </div>
        `;
    },

    step2_ApplyWizardTemplate() {
        const select = document.getElementById("selectWizardTemplate");
        const templateId = select ? select.value : "";
        if (!templateId) {
            alert("⚠️ Selecciona una plantilla de Wizard");
            return;
        }

        this.useWizardFlowAfterCurrent(templateId);
    },

    useWizardFlowAfterCurrent(templateId) {
        const tpl = Wizard.getDiagramTemplate(templateId);
        if (!tpl || !tpl.nodos || !tpl.conexiones) {
            alert("⚠️ Plantilla de Wizard no disponible.");
            return;
        }

        const basePrefix = "wiz_" + templateId + "_" + Date.now().toString(36) + "_";
        const idMap = new Map();

        // Crear nodos del bloque Wizard dentro del estado del asistente
        tpl.nodos.forEach((tNodo, index) => {
            const tempId = basePrefix + (tNodo.id || ("n" + index));
            const nodo = {
                tipo: tNodo.tipo,
                titulo: tNodo.titulo || ("Tarea " + (this.state.nodos.length + 1)),
                asignadoA: tNodo.asignadoA || "",
                asignadoUsuario: tNodo.asignadoUsuario || "",
                tareaManual: !!tNodo.tareaManual,
                tempId
            };
            this.state.nodos.push(nodo);
            idMap.set(tNodo.id, tempId);
        });

        // Calcular nodo de entrada del bloque
        const incoming = new Set(tpl.conexiones.map(c => c.to));
        const entryCandidates = tpl.nodos.filter(n => !incoming.has(n.id));
        const entryOriginalId = entryCandidates.length ? entryCandidates[0].id : (tpl.nodos[0] ? tpl.nodos[0].id : null);
        const entryTempId = entryOriginalId ? idMap.get(entryOriginalId) : null;

        // Conexiones internas del bloque
        tpl.conexiones.forEach(c => {
            const fromTemp = idMap.get(c.from);
            const toTemp = idMap.get(c.to);
            if (!fromTemp || !toTemp) return;

            this.state.conexiones.push({
                from: fromTemp,
                to: toTemp,
                conditionName: c.condicionNombre || "",
                conditionValue: c.condicionValor || ""
            });
        });

        // Conexión desde la tarea actual al bloque
        if (this.state.currentNode && entryTempId) {
            this.state.conexiones.push({
                from: this.state.currentNode.tempId,
                to: entryTempId,
                conditionName: "",
                conditionValue: ""
            });
        }

        this.renderPreview(true);

        // Pasar a la pregunta de si hay más tareas que añadir
        this.showStep5_AskMore();
    },

    /* ============================================================
       PASO 3: PREGUNTAR POR CONDICIONES
    ============================================================ */
    showStep3_AskCondition(index) {
        const total = this.state.nextNodes.length;
        const isLast = index >= total;

        if (isLast) {
            this.showStep4_CreateNextNodes(0);
            return;
        }

        this.content.innerHTML = `
            <div class="guided-step">
                <h4>❓ Tarea siguiente ${index + 1} de ${total}</h4>
                <p>¿Esta conexión tiene alguna condición?</p>
                <p class="guided-hint">Por ejemplo: "Si está aprobado", "Si necesita subsanación", etc.</p>

                <div class="guided-form">
                    <div class="guided-choice-buttons">
                        <button class="guided-choice-btn" onclick="GuidedAssistant.step3_NoCondition(${index})">
                            ✅ Sin condición (siempre ocurre)
                        </button>
                        <button class="guided-choice-btn" onclick="GuidedAssistant.step3_HasCondition(${index})">
                            🔀 Sí, tiene condición
                        </button>
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.goBack()">← Atrás</button>
                </div>
            </div>
        `;
    },

    step3_NoCondition(index) {
        this.state.nextNodes[index].hasCondition = false;
        this.showStep3_AskCondition(index + 1);
    },

    step3_HasCondition(index) {
        this.state.nextNodes[index].hasCondition = true;
        this.showStep3b_DefineCondition(index);
    },

    showStep3b_DefineCondition(index) {
        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🔀 Define la condición</h4>

                <div class="guided-form">
                    <div class="guided-field">
                        <label>📝 Nombre del campo de tesauro</label>
                        <input type="text" id="inputConditionName" class="guided-input"
                               placeholder="Ej: Estado de la solicitud, Requiere subsanación...">
                    </div>

                    <div class="guided-field">
                        <label>✔️ Valor esperado</label>
                        <input type="text" id="inputConditionValue" class="guided-input"
                               placeholder="Ej: Aprobado, Sí, Favorable...">
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.showStep3_AskCondition(${index})">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step3b_SaveCondition(${index})">Continuar →</button>
                </div>
            </div>
        `;
    },

    step3b_SaveCondition(index) {
        const nombre = document.getElementById("inputConditionName").value.trim();
        const valor = document.getElementById("inputConditionValue").value.trim();

        if (!nombre || !valor) {
            alert("⚠️ Completa ambos campos");
            return;
        }

        this.state.nextNodes[index].conditionName = nombre;
        this.state.nextNodes[index].conditionValue = valor;

        this.autoCreateTesauro(nombre, valor);

        this.showStep3_AskCondition(index + 1);
    },

    autoCreateTesauro(nombre, valor) {
        const ref = window.DataTesauro
            ? DataTesauro.generarReferenciaDesdeNombre(nombre)
            : nombre.replace(/\s+/g, '');

        if (this.state.tesaurosCreados.has(ref)) {
            const campo = Engine.tesauro.find(c => c.ref === ref);
            if (campo && campo.tipo === "selector") {
                const refValor = window.DataTesauro
                    ? DataTesauro.generarReferenciaDesdeNombre(valor)
                    : valor.replace(/\s+/g, '');
                const existeValor = campo.opciones.find(o => o.ref === refValor);
                if (!existeValor) {
                    campo.opciones.push({
                        id: Math.random().toString(36).substring(2, 9),
                        ref: refValor,
                        valor: valor
                    });
                }
            }
            return;
        }

        const valorLower = valor.toLowerCase().trim();
        let tipo = "texto";

        if (valorLower === "sí" || valorLower === "si" || valorLower === "no") {
            tipo = "si_no";
        } else {
            tipo = "selector";
        }

        const campo = {
            id: Math.random().toString(36).substring(2, 9),
            ref: ref,
            nombre: nombre,
            tipo: tipo,
            opciones: []
        };

        if (tipo === "selector") {
            const refValor = window.DataTesauro
                ? DataTesauro.generarReferenciaDesdeNombre(valor)
                : valor.replace(/\s+/g, '');
            campo.opciones.push({
                id: Math.random().toString(36).substring(2, 9),
                ref: refValor,
                valor: valor
            });
        }

        Engine.tesauro.push(campo);
        this.state.tesaurosCreados.add(ref);

        console.log("📚 Tesauro creado automáticamente:", campo);
    },

    /* ============================================================
       PASO 4: CREAR NODOS SIGUIENTES
    ============================================================ */
    showStep4_CreateNextNodes(index) {
        const total = this.state.nextNodes.length;

        if (index >= total) {
            this.showStep5_AskMore();
            return;
        }

        const nextInfo = this.state.nextNodes[index];

        // *** NUEVO: si el destino es una tarea ya existente, solo creamos la conexión ***
        if (nextInfo.mode === "existing" && nextInfo.targetTempId) {
            const conexion = {
                from: nextInfo.fromNode.tempId,
                to: nextInfo.targetTempId,
                conditionName: nextInfo.conditionName || "",
                conditionValue: nextInfo.conditionValue || ""
            };
            this.state.conexiones.push(conexion);
            this.renderPreview(true);
            this.showStep4_CreateNextNodes(index + 1);
            return;
        }

        this.updateProgress(60 + (index * 5));

        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🎯 Nueva tarea ${index + 1} de ${total}</h4>
                ${nextInfo.hasCondition ? `
                    <div class="guided-condition-badge">
                        🔀 Condición: ${nextInfo.conditionName} = ${nextInfo.conditionValue}
                    </div>
                ` : ''}

                <div class="guided-form">
                    ${this.renderNodeTypeSelector()}
                    ${this.renderNodeTitleInput()}
                    ${this.renderGroupSelector()}
                    ${this.renderUserSelector()}
                    ${this.renderManualTaskCheckbox()}
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.goBack()">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step4_CreateNextNode(${index})">Crear tarea →</button>
                </div>
            </div>
        `;

        this.attachNodeTypeChangeEvent();
        this.attachTitleSuggestionsEvent();
    },

    step4_CreateNextNode(index) {
        const tipo = document.getElementById("selectNodeType").value;
        const titulo = document.getElementById("inputNodeTitle").value.trim();
        const grupo = document.getElementById("inputGroup").value.trim();
        const usuario = document.getElementById("inputUser").value.trim();
        const manual = document.getElementById("checkManual").checked;

        if (!tipo || !titulo) {
            alert("⚠️ Completa los campos obligatorios");
            return;
        }

        const nodo = {
            tipo: tipo,
            titulo: titulo,
            asignadoA: grupo,
            asignadoUsuario: usuario,
            tareaManual: manual,
            tempId: "temp_" + Math.random().toString(36).substring(2, 9)
        };

        this.getAutoPosition(nodo.tempId);
        this.state.nodos.push(nodo);

        const nextInfo = this.state.nextNodes[index];
        const conexion = {
            from: nextInfo.fromNode.tempId,
            to: nodo.tempId,
            conditionName: nextInfo.conditionName || "",
            conditionValue: nextInfo.conditionValue || ""
        };
        this.state.conexiones.push(conexion);

        if (grupo) Engine.addGrupo(grupo);
        if (usuario) Engine.addUsuario(usuario);

        this.renderPreview(true);

        this.showStep4_CreateNextNodes(index + 1);
    },

    /* ============================================================
       PASO 5: ¿HAY MÁS TAREAS?
    ============================================================ */
    showStep5_AskMore() {
        this.updateProgress(80);

        const nodosPendientes = this.getNodesWithoutContinuation();

        if (nodosPendientes.length === 0) {
            this.showFinalSummary();
            return;
        }

        const nodoObjetivo = nodosPendientes[0];

        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🔄 "${nodoObjetivo.titulo}" no tiene salida</h4>
                <p>¿El procedimiento termina en esta tarea o continúa hacia otra?</p>

                <div class="guided-form">
                    <div class="guided-choice-buttons">
                        <button class="guided-choice-btn" onclick="GuidedAssistant.markNodeAsFinal('${nodoObjetivo.tempId}')">
                            🏁 Sí, termina aquí
                        </button>
                        <button class="guided-choice-btn" onclick="GuidedAssistant.continueFromNode('${nodoObjetivo.tempId}')">
                            ➕ No, quiero seguir
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    getNodesWithoutContinuation() {
        const nodosConContinuacion = new Set(this.state.conexiones.map(c => c.from));
        return this.state.nodos.filter(n =>
            !nodosConContinuacion.has(n.tempId) &&
            !this.state.finalizedNodes.has(n.tempId)
        );
    },

    markNodeAsFinal(tempId) {
        this.state.finalizedNodes.add(tempId);
        this.showStep5_AskMore();
    },

    continueFromNode(tempId) {
        const nodo = this.state.nodos.find(n => n.tempId === tempId);
        if (!nodo) return;

        this.state.currentNode = nodo;
        this.state.finalizedNodes.delete(tempId);
        this.showStep2_WhatNext();
    },

    /* ============================================================
       RESUMEN FINAL Y APLICAR AL DIAGRAMA
    ============================================================ */
    showFinalSummary() {
        this.updateProgress(100);

        this.content.innerHTML = `
            <div class="guided-step">
                <h4>✅ Resumen del procedimiento</h4>

                <div class="guided-summary">
                    <h5>📋 ${this.state.fichaProyecto.procedimiento}</h5>
                    <p><strong>Actividad:</strong> ${this.state.fichaProyecto.actividad || "(sin especificar)"}</p>
                    <p><strong>Descripción:</strong> ${this.state.fichaProyecto.descripcion || "(sin especificar)"}</p>

                    <h5>📊 Estadísticas:</h5>
                    <ul>
                        <li>Tareas creadas: <strong>${this.state.nodos.length}</strong></li>
                        <li>Conexiones: <strong>${this.state.conexiones.length}</strong></li>
                        <li>Tesauros generados: <strong>${this.state.tesaurosCreados.size}</strong></li>
                    </ul>

                    <h5>📝 Tareas:</h5>
                    <ol class="guided-node-list">
                        ${this.state.nodos.map(n => `
                            <li>
                                <strong>${n.titulo}</strong>
                                <span class="guided-badge">${n.tipo}</span>
                                ${n.asignadoA ? `<span class="guided-badge-group">👥 ${n.asignadoA}</span>` : ''}
                                ${n.tareaManual ? '<span class="guided-badge-manual">⚙️ Manual</span>' : ''}
                            </li>
                        `).join('')}
                    </ol>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.close()">Cancelar</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.applyToCanvas()">🚀 Aplicar al diagrama</button>
                </div>
            </div>
        `;
    },

    /* ============================================================
       VISTA PREVIA EN VIVO
    ============================================================ */
    renderPreview(forceUpdate = false) {
        if (!window.Engine || !window.Renderer) return;

        const idMap = this.state.canvasMap;

        this.state.nodos.forEach((nodoTemp) => {
            const pos = this.getAutoPosition(nodoTemp.tempId);

            if (!idMap[nodoTemp.tempId]) {
                const nodo = Engine.createNode(nodoTemp.tipo, pos.x, pos.y);
                idMap[nodoTemp.tempId] = nodo.id;
            }

            const nodeId = idMap[nodoTemp.tempId];
            const nodoCanvas = Engine.getNode(nodeId);
            if (nodoCanvas) {
                nodoCanvas.x = pos.x;
                nodoCanvas.y = pos.y;

                const updates = {};
                if (nodoCanvas.titulo !== nodoTemp.titulo) updates.titulo = nodoTemp.titulo;
                if (!!nodoCanvas.tareaManual !== !!nodoTemp.tareaManual) updates.tareaManual = nodoTemp.tareaManual;
                if ((nodoCanvas.asignadoA || "") !== (nodoTemp.asignadoA || "")) updates.asignadoA = nodoTemp.asignadoA;
                if ((nodoCanvas.asignadoUsuario || "") !== (nodoTemp.asignadoUsuario || "")) updates.asignadoUsuario = nodoTemp.asignadoUsuario;

                if (Object.keys(updates).length) {
                    Engine.updateNode(nodeId, updates);
                }

                const div = document.getElementById(nodeId);
                if (div) {
                    div.style.left = pos.x + "px";
                    div.style.top = pos.y + "px";
                }
            }
        });

        this.state.conexiones.forEach(connTemp => {
            const fromId = idMap[connTemp.from];
            const toId = idMap[connTemp.to];

            if (!fromId || !toId) return;

            let existing = Engine.data.conexiones.find(c =>
                c.from === fromId &&
                c.to === toId &&
                c.fromPos === "bottom" &&
                c.toPos === "top"
            );

            if (!existing) {
                existing = Engine.createConnection(fromId, toId, "bottom", "top");
            }

            if (existing && (forceUpdate || connTemp.conditionName || connTemp.conditionValue)) {
                Engine.updateConnectionCondition(
                    existing.id,
                    connTemp.conditionName || "",
                    connTemp.conditionValue || ""
                );
            }
        });

        Renderer.redrawConnections();

        if (window.UI && typeof UI.updateAsignacionesList === "function") {
            UI.updateAsignacionesList();
        }
    },

    /* ============================================================
       APLICAR AL CANVAS
    ============================================================ */
    applyToCanvas() {
        console.log("🚀 Aplicando procedimiento al canvas...");

        Engine.updateFichaProyecto(this.state.fichaProyecto);

        this.renderPreview(true);
        Engine.saveHistory();

        if (window.DataTesauro) {
            DataTesauro.campos = [...Engine.tesauro];
            DataTesauro.sync();
        }

        alert(`✅ Procedimiento creado correctamente:\n\n• ${this.state.nodos.length} tareas\n• ${this.state.conexiones.length} conexiones\n• ${this.state.tesaurosCreados.size} campos de tesauro`);

        // Cerrar sin confirmaciones adicionales; los cambios ya están en el lienzo
        this.close({ skipConfirm: true });
    },

    /* ============================================================
       NAVEGACIÓN
    ============================================================ */
    goBack() {
        if (this.state.step > 1) {
            this.state.step--;
            if (this.state.step === 1) {
                this.showStep1_CreateFirstNode();
            }
        }
    }
};

/* ============================================================
   EXPONER EN WINDOW Y ARRANQUE AUTOMÁTICO
============================================================ */
window.GuidedAssistant = GuidedAssistant;

window.addEventListener("DOMContentLoaded", () => {
    console.log("📦 [GuidedAssistant] DOMContentLoaded → inicializando");
    GuidedAssistant.init();
});

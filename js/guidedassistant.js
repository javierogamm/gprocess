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
        tesaurosCreados: new Set()
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
        }

        this.btn = document.getElementById("btnGuidedAssistant");
        this.modal = document.getElementById("guidedAssistantModal");
        this.content = document.getElementById("guidedContent");
        this.progressBar = document.getElementById("guidedProgressBar");

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
    open() {
        this.resetState();
        this.modal.classList.remove("hidden");
        this.showStep0_Welcome();
    },

    close() {
        if (this.state.step > 0 && this.state.nodos.length > 0) {
            if (!confirm("¿Seguro que quieres salir? Se perderá el progreso del asistente.")) {
                return;
            }
        }
        this.modal.classList.add("hidden");
        this.resetState();
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
            tesaurosCreados: new Set()
        };
    },

    updateProgress(percent) {
        if (this.progressBar) {
            this.progressBar.style.width = percent + "%";
        }
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
        const input = document.getElementById("inputNodeTitle");

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
            document.getElementById("titleSuggestions").innerHTML = "";
        }
    },

    autoDetectManualTask(tipo) {
        const checkbox = document.getElementById("checkManual");
        if (!checkbox) return;

        // Tipos que normalmente son manuales
        const manualTypes = ["formulario", "circuito"];
        // Tipos que normalmente NO son manuales
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

        // Guardar el nodo en el estado
        const nodo = {
            tipo: tipo,
            titulo: titulo,
            asignadoA: grupo,
            asignadoUsuario: usuario,
            tareaManual: manual,
            tempId: "temp_" + Math.random().toString(36).substring(2, 9)
        };

        this.state.nodos.push(nodo);
        this.state.currentNode = nodo;

        // Añadir grupo y usuario a las asignaciones globales
        if (grupo) Engine.addGrupo(grupo);
        if (usuario) Engine.addUsuario(usuario);

        this.state.step = 2;
        this.showStep2_WhatNext();
    },

    /* ============================================================
       PASO 2: ¿QUÉ OCURRE DESPUÉS?
    ============================================================ */
    showStep2_WhatNext() {
        const currentNode = this.state.currentNode;
        this.updateProgress(40 + (this.state.nodos.length * 10));

        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🔗 Paso 2: ¿Qué ocurre después de "${currentNode.titulo}"?</h4>
                <p>Indica cuántas tareas siguen a esta:</p>

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
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.goBack()">← Atrás</button>
                </div>
            </div>
        `;
    },

    step2_NoNext() {
        // No hay más nodos, mostrar resumen y finalizar
        this.showFinalSummary();
    },

    step2_OneNext() {
        this.state.nextNodes = [{ fromNode: this.state.currentNode, hasCondition: false }];
        this.showStep3_AskCondition(0);
    },

    step2_MultipleNext() {
        this.showStep2b_HowManyNext();
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
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.step2_WhatNext()">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step2b_Continue()">Continuar →</button>
                </div>
            </div>
        `;
    },

    step2b_Continue() {
        const count = parseInt(document.getElementById("inputNextCount").value);
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

    /* ============================================================
       PASO 3: PREGUNTAR POR CONDICIONES
    ============================================================ */
    showStep3_AskCondition(index) {
        const total = this.state.nextNodes.length;
        const isLast = index >= total;

        if (isLast) {
            // Ya preguntamos por todas las condiciones, ahora crear los nodos
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
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.step3_AskCondition(${index})">← Atrás</button>
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

        // Crear campo de tesauro automáticamente
        this.autoCreateTesauro(nombre, valor);

        this.showStep3_AskCondition(index + 1);
    },

    autoCreateTesauro(nombre, valor) {
        // Generar referencia automática usando la lógica de DataTesauro
        const ref = DataTesauro ? DataTesauro.generarReferenciaDesdeNombre(nombre) : nombre.replace(/\s+/g, '');

        if (this.state.tesaurosCreados.has(ref)) {
            // Ya existe, solo añadir el valor si es un selector
            const campo = Engine.tesauro.find(c => c.ref === ref);
            if (campo && campo.tipo === "selector") {
                const refValor = DataTesauro ? DataTesauro.generarReferenciaDesdeNombre(valor) : valor.replace(/\s+/g, '');
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

        // Detectar tipo de campo
        const valorLower = valor.toLowerCase().trim();
        let tipo = "texto";

        if (valorLower === "sí" || valorLower === "si" || valorLower === "no") {
            tipo = "si_no";
        } else {
            // Por defecto, crear como selector con una opción
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
            const refValor = DataTesauro ? DataTesauro.generarReferenciaDesdeNombre(valor) : valor.replace(/\s+/g, '');
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
            // Ya creamos todos los nodos, preguntar si hay más
            this.showStep5_AskMore();
            return;
        }

        const nextInfo = this.state.nextNodes[index];
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

        // Re-attach eventos
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

        this.state.nodos.push(nodo);

        // Guardar conexión
        const nextInfo = this.state.nextNodes[index];
        const conexion = {
            from: nextInfo.fromNode.tempId,
            to: nodo.tempId,
            conditionName: nextInfo.conditionName || "",
            conditionValue: nextInfo.conditionValue || ""
        };
        this.state.conexiones.push(conexion);

        // Añadir asignaciones
        if (grupo) Engine.addGrupo(grupo);
        if (usuario) Engine.addUsuario(usuario);

        this.showStep4_CreateNextNodes(index + 1);
    },

    /* ============================================================
       PASO 5: ¿HAY MÁS TAREAS?
    ============================================================ */
    showStep5_AskMore() {
        this.updateProgress(80);

        // Encontrar nodos sin continuar
        const nodosConContinuacion = new Set(this.state.conexiones.map(c => c.from));
        const nodosSinContinuar = this.state.nodos.filter(n => !nodosConContinuacion.has(n.tempId));

        if (nodosSinContinuar.length === 0) {
            // Todos tienen continuación, finalizar
            this.showFinalSummary();
            return;
        }

        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🔄 ¿Continuar añadiendo tareas?</h4>
                <p>Tienes ${nodosSinContinuar.length} tarea(s) sin continuación.</p>

                <div class="guided-form">
                    <div class="guided-choice-buttons">
                        <button class="guided-choice-btn" onclick="GuidedAssistant.step5_SelectNextNode()">
                            ➕ Sí, continuar desde otra tarea
                        </button>
                        <button class="guided-choice-btn" onclick="GuidedAssistant.showFinalSummary()">
                            ✅ No, finalizar procedimiento
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    step5_SelectNextNode() {
        const nodosConContinuacion = new Set(this.state.conexiones.map(c => c.from));
        const nodosSinContinuar = this.state.nodos.filter(n => !nodosConContinuacion.has(n.tempId));

        this.content.innerHTML = `
            <div class="guided-step">
                <h4>🎯 Selecciona desde qué tarea continuar</h4>

                <div class="guided-form">
                    <div class="guided-field">
                        <label>Tareas disponibles:</label>
                        <select id="selectContinueFrom" class="guided-select">
                            ${nodosSinContinuar.map(n => `
                                <option value="${n.tempId}">${n.titulo} (${n.tipo})</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="guided-actions">
                    <button class="guided-btn guided-btn-secondary" onclick="GuidedAssistant.showStep5_AskMore()">← Atrás</button>
                    <button class="guided-btn guided-btn-primary" onclick="GuidedAssistant.step5_ContinueFromNode()">Continuar →</button>
                </div>
            </div>
        `;
    },

    step5_ContinueFromNode() {
        const tempId = document.getElementById("selectContinueFrom").value;
        const nodo = this.state.nodos.find(n => n.tempId === tempId);

        if (!nodo) return;

        this.state.currentNode = nodo;
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
       APLICAR AL CANVAS
    ============================================================ */
    applyToCanvas() {
        console.log("🚀 Aplicando procedimiento al canvas...");

        // Actualizar ficha del proyecto
        Engine.updateFichaProyecto(this.state.fichaProyecto);

        // Crear nodos en el canvas
        const idMap = {};
        let x = 400;
        let y = 100;
        const stepY = 150;

        this.state.nodos.forEach((nodoTemp, index) => {
            const nodo = Engine.createNode(nodoTemp.tipo, x, y);
            idMap[nodoTemp.tempId] = nodo.id;

            // Actualizar propiedades
            Engine.updateNode(nodo.id, {
                titulo: nodoTemp.titulo,
                tareaManual: nodoTemp.tareaManual,
                asignadoA: nodoTemp.asignadoA,
                asignadoUsuario: nodoTemp.asignadoUsuario
            });

            // Actualizar visualmente
            const div = document.getElementById(nodo.id);
            if (div) {
                const content = div.querySelector(".node-content");
                if (content) content.innerText = nodoTemp.titulo;
            }

            y += stepY;
        });

        // Crear conexiones
        this.state.conexiones.forEach(connTemp => {
            const fromId = idMap[connTemp.from];
            const toId = idMap[connTemp.to];

            if (!fromId || !toId) {
                console.warn("⚠️ No se pudo crear conexión:", connTemp);
                return;
            }

            const conn = Engine.createConnection(fromId, toId, "bottom", "top");

            if (conn && (connTemp.conditionName || connTemp.conditionValue)) {
                Engine.updateConnectionCondition(
                    conn.id,
                    connTemp.conditionName || "",
                    connTemp.conditionValue || ""
                );
            }
        });

        // Redibujar
        Renderer.redrawConnections();
        Engine.saveHistory();

        // Sincronizar tesauros con DataTesauro
        if (window.DataTesauro) {
            DataTesauro.campos = [...Engine.tesauro];
            DataTesauro.sync();
        }

        alert(`✅ Procedimiento creado correctamente:\n\n• ${this.state.nodos.length} tareas\n• ${this.state.conexiones.length} conexiones\n• ${this.state.tesaurosCreados.size} campos de tesauro`);

        this.close();
    },

    /* ============================================================
       NAVEGACIÓN
    ============================================================ */
    goBack() {
        if (this.state.step > 1) {
            this.state.step--;
            // Simplificado: volver al paso anterior
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

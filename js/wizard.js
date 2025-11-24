/* ============================================================
   WIZARD.JS - Asistente Guiado de Importación y Creación
   ------------------------------------------------------------
   - Importación masiva o individual de grupos/usuarios/tesauros
   - Creación de nodos paso a paso
   - Plantillas de flujo (ej. subsanación)
   - Permite ver el editor mientras se configura
============================================================ */

const Wizard = {
    // Referencias DOM
    btn: null,
    panel: null,

    // Estado del wizard de creación de nodos
    nodeWizardState: {
        active: false,
        currentStep: 0,
        nodeData: {}
    },

    // Pasos del wizard para crear un nodo
    nodeSteps: [
        {
            id: 'nombre',
            label: 'Nombre de la tarea',
            type: 'text',
            placeholder: 'Ej: Formulario inicial, Revisión de documentación...',
            field: 'titulo'
        },
        {
            id: 'tipo',
            label: 'Tipo de nodo',
            type: 'select',
            options: [
                { value: 'formulario', label: 'Formulario' },
                { value: 'documento', label: 'Documento' },
                { value: 'libre', label: 'Libre' },
                { value: 'decision', label: 'Decisión' },
                { value: 'circuito', label: 'Circuito Resolución' },
                { value: 'plazo', label: 'Añadir Plazo' },
                { value: 'operacion_externa', label: 'Operación Externa' },
                { value: 'notas', label: 'Nota' }
            ],
            field: 'tipo'
        },
        {
            id: 'manual',
            label: '¿Es una tarea manual?',
            type: 'yesno',
            field: 'tareaManual'
        },
        {
            id: 'asignado',
            label: 'Asignado a (grupo)',
            type: 'autocomplete',
            placeholder: 'Selecciona un grupo...',
            field: 'asignadoA',
            source: 'grupos'
        },
        {
            id: 'usuario',
            label: 'Asignado a (usuario)',
            type: 'autocomplete',
            placeholder: 'Selecciona un usuario...',
            field: 'asignadoUsuario',
            source: 'usuarios'
        },
        {
            id: 'descripcion',
            label: 'Descripción de la tarea',
            type: 'textarea',
            placeholder: 'Describe los detalles de esta tarea...',
            field: 'descripcion'
        }
    ],

    /* ============================================================
       INICIALIZACIÓN
    ============================================================ */
    init() {
        // Crear botón flotante si no existe
        if (!document.getElementById("btnWizard")) {
            const btn = document.createElement("button");
            btn.id = "btnWizard";
            btn.className = "floating-wizard-btn";
            btn.innerHTML = "🧙 Asistente";
            document.body.appendChild(btn);
        }

        // Crear panel lateral si no existe
        if (!document.getElementById("wizardPanel")) {
            const panel = document.createElement("div");
            panel.id = "wizardPanel";
            panel.className = "wizard-panel hidden";
            panel.innerHTML = `
                <div class="wizard-header">
                    <h3>🧙 Asistente Guiado</h3>
                    <button id="wizardClose" class="wizard-close-btn">&times;</button>
                </div>

                <div class="wizard-content">
                    <!-- Contenido dinámico -->
                </div>
            `;
            document.body.appendChild(panel);
        }

        this.btn = document.getElementById("btnWizard");
        this.panel = document.getElementById("wizardPanel");
        this.content = this.panel.querySelector(".wizard-content");
        this.closeBtn = document.getElementById("wizardClose");

        // Eventos
        this.btn.addEventListener("click", () => this.toggle());
        this.closeBtn.addEventListener("click", () => this.close());

        // Cerrar al hacer clic fuera
        document.addEventListener("click", (e) => {
            if (
                this.panel.classList.contains("visible") &&
                !this.panel.contains(e.target) &&
                e.target !== this.btn &&
                !e.target.closest('.wizard-modal')
            ) {
                this.close();
            }
        });
    },

    /* ============================================================
       ABRIR/CERRAR PANEL
    ============================================================ */
    toggle() {
        if (this.panel.classList.contains("visible")) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        this.panel.classList.add("visible");
        this.showMainMenu();
    },

    close() {
        this.panel.classList.remove("visible");
        this.nodeWizardState.active = false;
    },

    /* ============================================================
       MENÚ PRINCIPAL
    ============================================================ */
    showMainMenu() {
        this.content.innerHTML = `
            <div class="wizard-menu">
                <h4>📥 Importación Masiva</h4>
                <button class="wizard-btn" onclick="Wizard.showImportOptions('grupos')">
                    👥 Importar Grupos
                </button>
                <button class="wizard-btn" onclick="Wizard.showImportOptions('usuarios')">
                    🙋 Importar Usuarios
                </button>
                <button class="wizard-btn" onclick="Wizard.showImportOptions('tesauros')">
                    📚 Importar Tesauros
                </button>

                <hr class="wizard-divider">

                <h4>➕ Crear Nodos</h4>
                <button class="wizard-btn wizard-btn-primary" onclick="Wizard.startNodeWizard()">
                    🎯 Crear nodo paso a paso
                </button>

                <hr class="wizard-divider">

                <h4>📋 Plantillas de Flujo</h4>
                <button class="wizard-btn" onclick="Wizard.showFlowTemplates()">
                    📑 Ver plantillas disponibles
                </button>
            </div>
        `;
    },

    /* ============================================================
       IMPORTACIÓN MASIVA
    ============================================================ */
    showImportOptions(tipo) {
        const titles = {
            grupos: 'Importar Grupos',
            usuarios: 'Importar Usuarios',
            tesauros: 'Importar Tesauros'
        };

        const placeholders = {
            grupos: 'Departamento de Recursos Humanos\nDepartamento de Contabilidad\nDepartamento Legal',
            usuarios: 'Juan Pérez\nMaría García\nCarlos Rodríguez',
            tesauros: 'tipoSolicitud|Tipo de Solicitud|selector\nmontoPedido|Monto del Pedido|moneda\nfechaPresentacion|Fecha de Presentación|fecha'
        };

        this.content.innerHTML = `
            <div class="wizard-import">
                <button class="wizard-back-btn" onclick="Wizard.showMainMenu()">
                    ← Volver
                </button>

                <h4>${titles[tipo]}</h4>

                <div class="wizard-import-options">
                    <button class="wizard-btn" onclick="Wizard.showImportForm('${tipo}', 'individual')">
                        ➕ Agregar uno por uno
                    </button>
                    <button class="wizard-btn wizard-btn-primary" onclick="Wizard.showImportForm('${tipo}', 'masivo')">
                        📋 Pegar todos de golpe
                    </button>
                </div>
            </div>
        `;
    },

    showImportForm(tipo, modo) {
        const titles = {
            grupos: 'Grupos',
            usuarios: 'Usuarios',
            tesauros: 'Tesauros'
        };

        const placeholders = {
            grupos: modo === 'individual'
                ? 'Nombre del grupo...'
                : 'Pega una lista de grupos, uno por línea:\n\nDepartamento de Recursos Humanos\nDepartamento de Contabilidad\nDepartamento Legal',
            usuarios: modo === 'individual'
                ? 'Nombre del usuario...'
                : 'Pega una lista de usuarios, uno por línea:\n\nJuan Pérez\nMaría García\nCarlos Rodríguez',
            tesauros: modo === 'individual'
                ? 'referencia|Nombre del campo|tipo'
                : 'Pega los tesauros, uno por línea:\nFormato: referencia|Nombre|tipo\n\ntipoSolicitud|Tipo de Solicitud|selector\nmontoPedido|Monto del Pedido|moneda\nfechaPresentacion|Fecha de Presentación|fecha'
        };

        const inputType = modo === 'individual' ? 'input' : 'textarea';
        const inputRows = modo === 'masivo' ? 10 : 1;

        this.content.innerHTML = `
            <div class="wizard-import-form">
                <button class="wizard-back-btn" onclick="Wizard.showImportOptions('${tipo}')">
                    ← Volver
                </button>

                <h4>${modo === 'individual' ? 'Agregar' : 'Importar'} ${titles[tipo]}</h4>

                ${inputType === 'textarea' ? `
                    <textarea
                        id="wizardImportInput"
                        class="wizard-textarea"
                        rows="${inputRows}"
                        placeholder="${placeholders[tipo]}"
                    ></textarea>
                ` : `
                    <input
                        id="wizardImportInput"
                        type="text"
                        class="wizard-input"
                        placeholder="${placeholders[tipo]}"
                    />
                `}

                ${tipo === 'tesauros' ? `
                    <div class="wizard-help">
                        <small>
                            <strong>Tipos disponibles:</strong> selector, si_no, texto, numerico, moneda, fecha
                        </small>
                    </div>
                ` : ''}

                <div class="wizard-actions">
                    <button class="wizard-btn wizard-btn-cancel" onclick="Wizard.showImportOptions('${tipo}')">
                        Cancelar
                    </button>
                    <button class="wizard-btn wizard-btn-primary" onclick="Wizard.processImport('${tipo}', '${modo}')">
                        ✓ Importar
                    </button>
                </div>
            </div>
        `;

        // Foco en el input
        setTimeout(() => {
            document.getElementById("wizardImportInput")?.focus();
        }, 100);
    },

    processImport(tipo, modo) {
        const input = document.getElementById("wizardImportInput");
        const texto = input.value.trim();

        if (!texto) {
            alert("❌ No hay contenido para importar");
            return;
        }

        let count = 0;

        if (tipo === 'grupos') {
            const lineas = modo === 'masivo'
                ? texto.split(/\r?\n/).map(l => l.trim()).filter(l => l)
                : [texto];

            lineas.forEach(grupo => {
                Engine.asignaciones.grupos.add(grupo);
                count++;
            });

        } else if (tipo === 'usuarios') {
            const lineas = modo === 'masivo'
                ? texto.split(/\r?\n/).map(l => l.trim()).filter(l => l)
                : [texto];

            lineas.forEach(usuario => {
                Engine.asignaciones.usuarios.add(usuario);
                count++;
            });

        } else if (tipo === 'tesauros') {
            const lineas = modo === 'masivo'
                ? texto.split(/\r?\n/).map(l => l.trim()).filter(l => l)
                : [texto];

            lineas.forEach(linea => {
                const partes = linea.split('|');
                if (partes.length >= 3) {
                    const [ref, nombre, tipoTesauro] = partes.map(p => p.trim());
                    const nuevo = {
                        id: this.generateId(),
                        ref,
                        nombre,
                        tipo: tipoTesauro
                    };
                    if (tipoTesauro === 'selector') nuevo.opciones = [];

                    // Añadir a DataTesauro si existe
                    if (window.DataTesauro) {
                        DataTesauro.campos.push(nuevo);
                        DataTesauro.sync();
                    }
                    count++;
                }
            });
        }

        alert(`✅ ${count} ${tipo} importado${count !== 1 ? 's' : ''} correctamente`);
        this.showMainMenu();
    },

    generateId() {
        return Math.random().toString(36).substring(2, 9);
    },

    /* ============================================================
       WIZARD DE CREACIÓN DE NODOS PASO A PASO
    ============================================================ */
    startNodeWizard() {
        this.nodeWizardState = {
            active: true,
            currentStep: 0,
            nodeData: {
                tipo: 'formulario',
                tareaManual: false
            }
        };
        this.showNodeWizardStep();
    },

    showNodeWizardStep() {
        const state = this.nodeWizardState;
        const step = this.nodeSteps[state.currentStep];
        const totalSteps = this.nodeSteps.length;
        const isLastStep = state.currentStep === totalSteps - 1;

        // Obtener valor actual si existe
        const currentValue = state.nodeData[step.field] || '';

        this.content.innerHTML = `
            <div class="wizard-node-creator">
                <button class="wizard-back-btn" onclick="Wizard.cancelNodeWizard()">
                    ← Cancelar
                </button>

                <div class="wizard-progress">
                    Paso ${state.currentStep + 1} de ${totalSteps}
                </div>

                <h4>${step.label}</h4>

                <div class="wizard-step-content">
                    ${this.renderStepInput(step, currentValue)}
                </div>

                <div class="wizard-actions">
                    ${state.currentStep > 0 ? `
                        <button class="wizard-btn" onclick="Wizard.prevNodeWizardStep()">
                            ← Anterior
                        </button>
                    ` : ''}
                    <button class="wizard-btn wizard-btn-primary" onclick="Wizard.nextNodeWizardStep()">
                        ${isLastStep ? '✓ Crear Nodo' : 'Siguiente →'}
                    </button>
                </div>
            </div>
        `;

        // Foco en el input principal
        setTimeout(() => {
            const mainInput = this.content.querySelector('input, select, textarea');
            if (mainInput) mainInput.focus();
        }, 100);
    },

    renderStepInput(step, currentValue) {
        switch (step.type) {
            case 'text':
                return `
                    <input
                        id="wizardStepInput"
                        type="text"
                        class="wizard-input wizard-input-large"
                        placeholder="${step.placeholder || ''}"
                        value="${currentValue}"
                    />
                `;

            case 'select':
                return `
                    <select id="wizardStepInput" class="wizard-select wizard-input-large">
                        ${step.options.map(opt => `
                            <option value="${opt.value}" ${currentValue === opt.value ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                `;

            case 'yesno':
                return `
                    <div class="wizard-yesno">
                        <button
                            class="wizard-btn-yesno ${currentValue === true ? 'active' : ''}"
                            onclick="Wizard.setYesNo(true)"
                        >
                            ✓ Sí
                        </button>
                        <button
                            class="wizard-btn-yesno ${currentValue === false ? 'active' : ''}"
                            onclick="Wizard.setYesNo(false)"
                        >
                            ✗ No
                        </button>
                    </div>
                `;

            case 'autocomplete':
                const options = step.source === 'grupos'
                    ? Array.from(Engine.asignaciones?.grupos || [])
                    : Array.from(Engine.asignaciones?.usuarios || []);

                return `
                    <input
                        id="wizardStepInput"
                        type="text"
                        class="wizard-input wizard-input-large"
                        placeholder="${step.placeholder || ''}"
                        value="${currentValue}"
                        list="wizard-datalist-${step.source}"
                    />
                    <datalist id="wizard-datalist-${step.source}">
                        ${options.map(opt => `<option value="${opt}">`).join('')}
                    </datalist>
                `;

            case 'textarea':
                return `
                    <textarea
                        id="wizardStepInput"
                        class="wizard-textarea"
                        rows="6"
                        placeholder="${step.placeholder || ''}"
                    >${currentValue}</textarea>
                `;

            default:
                return '';
        }
    },

    setYesNo(value) {
        this.nodeWizardState.nodeData[this.nodeSteps[this.nodeWizardState.currentStep].field] = value;
        this.showNodeWizardStep(); // Re-render para mostrar selección
    },

    nextNodeWizardStep() {
        const state = this.nodeWizardState;
        const step = this.nodeSteps[state.currentStep];

        // Guardar valor del paso actual
        const input = document.getElementById("wizardStepInput");
        if (input) {
            state.nodeData[step.field] = input.value;
        }

        // Si es el último paso, crear el nodo
        if (state.currentStep === this.nodeSteps.length - 1) {
            this.createNodeFromWizard();
        } else {
            // Avanzar al siguiente paso
            state.currentStep++;
            this.showNodeWizardStep();
        }
    },

    prevNodeWizardStep() {
        const state = this.nodeWizardState;

        // Guardar valor del paso actual antes de retroceder
        const step = this.nodeSteps[state.currentStep];
        const input = document.getElementById("wizardStepInput");
        if (input) {
            state.nodeData[step.field] = input.value;
        }

        state.currentStep--;
        this.showNodeWizardStep();
    },

    cancelNodeWizard() {
        const confirmar = confirm("¿Seguro que quieres cancelar la creación del nodo?");
        if (confirmar) {
            this.nodeWizardState.active = false;
            this.showMainMenu();
        }
    },

    createNodeFromWizard() {
        const data = this.nodeWizardState.nodeData;

        // Crear el nodo usando Engine
        const nodo = Engine.createNode(data.tipo);

        // Actualizar propiedades
        nodo.titulo = data.titulo || data.tipo.toUpperCase();
        nodo.tareaManual = data.tareaManual || false;
        nodo.asignadoA = data.asignadoA || '';
        nodo.asignadoUsuario = data.asignadoUsuario || '';
        nodo.descripcion = data.descripcion || '';

        // Actualizar el DOM
        const nodeDiv = document.getElementById(nodo.id);
        if (nodeDiv) {
            const titleDiv = nodeDiv.querySelector(".node-title");
            if (titleDiv) titleDiv.innerText = nodo.titulo;
        }

        // Re-renderizar
        Renderer.redrawConnections();
        Engine.saveHistory();

        // Mensaje de éxito y preguntar si quiere crear otro
        const crearOtro = confirm(`✅ Nodo "${nodo.titulo}" creado correctamente.\n\n¿Quieres crear otro nodo?`);

        if (crearOtro) {
            this.startNodeWizard();
        } else {
            this.showMainMenu();
        }
    },

    /* ============================================================
       PLANTILLAS DE FLUJO
    ============================================================ */
    showFlowTemplates() {
        this.content.innerHTML = `
            <div class="wizard-templates">
                <button class="wizard-back-btn" onclick="Wizard.showMainMenu()">
                    ← Volver
                </button>

                <h4>📋 Plantillas de Flujo</h4>

                <div class="wizard-template-list">
                    <div class="wizard-template-card" onclick="Wizard.showTemplateDetail('subsanacion')">
                        <h5>📝 Flujo de Subsanación</h5>
                        <p>Requerimiento de subsanación → Plazo → Revisión</p>
                    </div>

                    <div class="wizard-template-card" onclick="Wizard.showTemplateDetail('aprobacion')">
                        <h5>✅ Flujo de Aprobación</h5>
                        <p>Solicitud → Revisión → Decisión → Resolución</p>
                    </div>

                    <div class="wizard-template-card" onclick="Wizard.showTemplateDetail('tramite')">
                        <h5>📄 Trámite Completo</h5>
                        <p>Formulario → Documentación → Circuito → Resolución</p>
                    </div>
                </div>
            </div>
        `;
    },

    showTemplateDetail(templateId) {
        const templates = {
            subsanacion: {
                title: 'Flujo de Subsanación',
                description: 'Este flujo típico viene después del formulario inicial y permite gestionar el proceso de subsanación de documentación o información.',
                nodos: [
                    {
                        tipo: 'formulario',
                        titulo: 'Requerimiento de subsanación',
                        descripcion: 'Notificación al solicitante indicando los puntos a subsanar',
                        tareaManual: true
                    },
                    {
                        tipo: 'plazo',
                        titulo: 'Plazo de subsanación',
                        descripcion: 'Período de tiempo para que el solicitante presente la subsanación',
                        tareaManual: false
                    },
                    {
                        tipo: 'formulario',
                        titulo: 'Presentación de subsanación',
                        descripcion: 'El solicitante presenta la documentación o información subsanada',
                        tareaManual: false
                    },
                    {
                        tipo: 'formulario',
                        titulo: 'Revisión de la subsanación',
                        descripcion: 'Verificación de que la subsanación cumple con los requisitos',
                        tareaManual: true
                    },
                    {
                        tipo: 'decision',
                        titulo: 'Decisión sobre subsanación',
                        descripcion: '¿La subsanación es correcta?',
                        tareaManual: true
                    }
                ]
            },
            aprobacion: {
                title: 'Flujo de Aprobación',
                description: 'Flujo estándar para la aprobación de solicitudes o peticiones.',
                nodos: [
                    {
                        tipo: 'formulario',
                        titulo: 'Solicitud inicial',
                        descripcion: 'Presentación de la solicitud',
                        tareaManual: false
                    },
                    {
                        tipo: 'formulario',
                        titulo: 'Revisión preliminar',
                        descripcion: 'Verificación de requisitos básicos',
                        tareaManual: true
                    },
                    {
                        tipo: 'decision',
                        titulo: 'Decisión de aprobación',
                        descripcion: '¿Se aprueba la solicitud?',
                        tareaManual: true
                    },
                    {
                        tipo: 'documento',
                        titulo: 'Resolución',
                        descripcion: 'Documento de resolución final',
                        tareaManual: true
                    }
                ]
            },
            tramite: {
                title: 'Trámite Completo',
                description: 'Flujo completo con circuito de resolución.',
                nodos: [
                    {
                        tipo: 'formulario',
                        titulo: 'Formulario inicial',
                        descripcion: 'Datos iniciales del trámite',
                        tareaManual: false
                    },
                    {
                        tipo: 'documento',
                        titulo: 'Documentación requerida',
                        descripcion: 'Presentación de documentos necesarios',
                        tareaManual: false
                    },
                    {
                        tipo: 'circuito',
                        titulo: 'Circuito de resolución',
                        descripcion: 'Proceso de evaluación y decisión',
                        tareaManual: true
                    },
                    {
                        tipo: 'documento',
                        titulo: 'Resolución final',
                        descripcion: 'Documento de resolución del trámite',
                        tareaManual: true
                    }
                ]
            }
        };

        const template = templates[templateId];

        this.content.innerHTML = `
            <div class="wizard-template-detail">
                <button class="wizard-back-btn" onclick="Wizard.showFlowTemplates()">
                    ← Volver
                </button>

                <h4>${template.title}</h4>
                <p class="wizard-template-description">${template.description}</p>

                <div class="wizard-template-preview">
                    <h5>Nodos que se crearán:</h5>
                    <ol class="wizard-template-nodes">
                        ${template.nodos.map(nodo => `
                            <li>
                                <strong>${nodo.titulo}</strong>
                                <span class="wizard-node-type">(${nodo.tipo})</span>
                                <br>
                                <small>${nodo.descripcion}</small>
                            </li>
                        `).join('')}
                    </ol>
                </div>

                <div class="wizard-actions">
                    <button class="wizard-btn" onclick="Wizard.showFlowTemplates()">
                        Cancelar
                    </button>
                    <button class="wizard-btn wizard-btn-primary" onclick="Wizard.applyTemplate('${templateId}')">
                        ✓ Aplicar plantilla
                    </button>
                </div>
            </div>
        `;
    },

    applyTemplate(templateId) {
        const templates = {
            subsanacion: [
                { tipo: 'formulario', titulo: 'Requerimiento de subsanación', descripcion: 'Notificación al solicitante indicando los puntos a subsanar', tareaManual: true },
                { tipo: 'plazo', titulo: 'Plazo de subsanación', descripcion: 'Período de tiempo para que el solicitante presente la subsanación', tareaManual: false },
                { tipo: 'formulario', titulo: 'Presentación de subsanación', descripcion: 'El solicitante presenta la documentación o información subsanada', tareaManual: false },
                { tipo: 'formulario', titulo: 'Revisión de la subsanación', descripcion: 'Verificación de que la subsanación cumple con los requisitos', tareaManual: true },
                { tipo: 'decision', titulo: 'Decisión sobre subsanación', descripcion: '¿La subsanación es correcta?', tareaManual: true }
            ],
            aprobacion: [
                { tipo: 'formulario', titulo: 'Solicitud inicial', descripcion: 'Presentación de la solicitud', tareaManual: false },
                { tipo: 'formulario', titulo: 'Revisión preliminar', descripcion: 'Verificación de requisitos básicos', tareaManual: true },
                { tipo: 'decision', titulo: 'Decisión de aprobación', descripcion: '¿Se aprueba la solicitud?', tareaManual: true },
                { tipo: 'documento', titulo: 'Resolución', descripcion: 'Documento de resolución final', tareaManual: true }
            ],
            tramite: [
                { tipo: 'formulario', titulo: 'Formulario inicial', descripcion: 'Datos iniciales del trámite', tareaManual: false },
                { tipo: 'documento', titulo: 'Documentación requerida', descripcion: 'Presentación de documentos necesarios', tareaManual: false },
                { tipo: 'circuito', titulo: 'Circuito de resolución', descripcion: 'Proceso de evaluación y decisión', tareaManual: true },
                { tipo: 'documento', titulo: 'Resolución final', descripcion: 'Documento de resolución del trámite', tareaManual: true }
            ]
        };

        const nodos = templates[templateId];
        const nodosCreados = [];

        // Crear nodos en cascada vertical
        nodos.forEach((nodoData, index) => {
            const nodo = Engine.createNode(nodoData.tipo, 300, 150 + (index * 180));
            nodo.titulo = nodoData.titulo;
            nodo.tareaManual = nodoData.tareaManual;
            nodo.descripcion = nodoData.descripcion || '';

            // Actualizar DOM
            const nodeDiv = document.getElementById(nodo.id);
            if (nodeDiv) {
                const titleDiv = nodeDiv.querySelector(".node-title");
                if (titleDiv) titleDiv.innerText = nodo.titulo;
            }

            nodosCreados.push(nodo);

            // Conectar con el nodo anterior
            if (index > 0) {
                Engine.createConnection(nodosCreados[index - 1].id, nodo.id, 'bottom', 'top');
            }
        });

        // Re-renderizar
        Renderer.redrawConnections();
        Engine.saveHistory();

        alert(`✅ Plantilla aplicada: ${nodos.length} nodos creados y conectados`);
        this.close();
    }
};

// Exponer el asistente para que los manejadores inline puedan resolverlo
window.Wizard = Wizard;

/* ============================================================
   INICIALIZACIÓN AUTOMÁTICA
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    Wizard.init();
});

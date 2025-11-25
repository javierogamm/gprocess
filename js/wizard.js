/* ============================================================
   WIZARD.JS - Asistente de Plantillas de Flujo
   ------------------------------------------------------------
   - Botón flotante "🧙 Asistente"
   - Muestra un popup modal con plantillas de flujo
   - Aplica la plantilla creando nodos + conexiones en el diagrama
============================================================ */

// *** LOG CARGA DE ARCHIVO
console.log("🔮 [Wizard] Archivo WIZARD.JS cargado");

const Wizard = {
    // Referencias DOM
    btn: null,
    modal: null,
    modalBody: null,
    modalCloseBtn: null,

    // ============================================================
    // *** NUEVO: datos comunes de plantillas para Wizard + Asistente ***
    // ============================================================
    flowTemplatesMeta: {
        subsanacion: {
            title: "Flujo de Subsanación",
            description: "Requerimiento → Plazo → Revisión → (Si haSubsanado = no) Resolución de desistimiento.",
            nodos: [
                {
                    tipo: "documento",
                    titulo: "Requerimiento de subsanación",
                    tareaManual: true,
                    descripcion: "Documento que solicita la subsanación al interesado."
                },
                {
                    tipo: "plazo",
                    titulo: "Plazo de subsanación",
                    tareaManual: false,
                    descripcion: "Plazo para que la persona interesada subsane la solicitud."
                },
                {
                    tipo: "formulario",
                    titulo: "Revisión de la subsanación",
                    tareaManual: true,
                    descripcion: "Revisión de la documentación aportada en la subsanación."
                },
                {
                    tipo: "circuito",
                    titulo: "Resolución de desistimiento",
                    tareaManual: true,
                    descripcion: "Circuito de resolución por desistimiento si no se subsana."
                }
            ]
        },

        tramiteCompleto: {
            title: "Procedimiento Tipo Completo",
            description: "Revisión solicitud → Subsanación / Informe Técnico → Concesión / Denegación",
            nodos: [
                {
                    tipo: "formulario",
                    titulo: "Revisión de la solicitud",
                    descripcion: "Primera revisión de la petición.",
                    tareaManual: true
                },
                {
                    tipo: "documento",
                    titulo: "Requerimiento de subsanación",
                    descripcion: "Documento de requerimiento cuando faltan datos o documentos.",
                    tareaManual: true
                },
                {
                    tipo: "plazo",
                    titulo: "Plazo de subsanación",
                    descripcion: "Plazo para que se aporte la subsanación.",
                    tareaManual: false
                },
                {
                    tipo: "formulario",
                    titulo: "Revisión de la subsanación",
                    descripcion: "Evaluar la subsanación presentada.",
                    tareaManual: true
                },
                {
                    tipo: "documento",
                    titulo: "Informe Técnico",
                    descripcion: "Informe del área técnica competente.",
                    tareaManual: true
                },
                {
                    tipo: "circuito",
                    titulo: "Resolución de concesión",
                    descripcion: "Circuito para la resolución estimatoria.",
                    tareaManual: true
                },
                {
                    tipo: "circuito",
                    titulo: "Resolución de denegación",
                    descripcion: "Circuito para la resolución desestimatoria.",
                    tareaManual: true
                }
            ]
        },

        resolucionProvisionalAlegaciones: {
            title: "Resolución provisional con alegaciones",
            description: "Resolución provisional → Plazo de alegaciones → Certificado → Resolución definitiva.",
            nodos: [
                {
                    tipo: "circuito",
                    titulo: "Resolución con alegaciones (Provisional)",
                    descripcion: "Circuito de resolución provisional que abre un trámite de alegaciones.",
                    tareaManual: false
                },
                {
                    tipo: "plazo",
                    titulo: "Plazo de alegaciones",
                    descripcion: "Plazo para que las personas interesadas presenten alegaciones.",
                    tareaManual: false
                },
                {
                    tipo: "documento",
                    titulo: "Certificado de alegaciones presentadas",
                    descripcion: "Documento que recoge las alegaciones presentadas.",
                    tareaManual: false
                },
                {
                    tipo: "circuito",
                    titulo: "Resolución definitiva",
                    descripcion: "Circuito para dictar la resolución definitiva tras las alegaciones.",
                    tareaManual: false
                }
            ]
        }
    },

    // ============================================================
    // *** NUEVO: datos de diagrama (nodos + conexiones) ***
    // ============================================================
    flowTemplatesDiagram: {
        // --------------------------------------------------------
        // PLANTILLA: SUBSANACIÓN (la de 4 nodos)
        // --------------------------------------------------------
        subsanacion: {
            nodos: [
                {
                    id: "nrb4k65d",
                    tipo: "documento",
                    titulo: "Requerimiento de subsanación",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 520,
                    y: 180,
                    width: 120,
                    height: 86,
                    descripcion: "<br>"
                },
                {
                    id: "ngj58f5n",
                    tipo: "plazo",
                    titulo: "Plazo de subsanación",
                    tareaManual: false,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 700,
                    y: 340,
                    width: 120,
                    height: 86,
                    descripcion: "<br>"
                },
                {
                    id: "ngyjjl3h",
                    tipo: "formulario",
                    titulo: "Revisión de la subsanación",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 700,
                    y: 462,
                    width: 120,
                    height: 86,
                    descripcion: "<br>"
                },
                {
                    id: "nbmbc6ji",
                    tipo: "circuito",
                    titulo: "Resolución de desistimiento",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 940,
                    y: 460,
                    width: 176.0001220703125,
                    height: 90.00628662109375,
                    descripcion: "<br>"
                }
            ],
            conexiones: [
                {
                    id: "cqop8ox9",
                    from: "nrb4k65d",
                    to: "ngj58f5n",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "cp1g4kcm",
                    from: "ngj58f5n",
                    to: "ngyjjl3h",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "czqplugv",
                    from: "ngyjjl3h",
                    to: "nbmbc6ji",
                    fromPos: "right",
                    toPos: "left",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                }
            ]
        },

        // --------------------------------------------------------
        // PLANTILLA: TRÁMITE COMPLETO
        // --------------------------------------------------------
        tramiteCompleto: {
            nodos: [
                {
                    id: "ne7huupf",
                    tipo: "formulario",
                    titulo: "Revisión de la solicitud",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 580,
                    y: 60,
                    width: 160,
                    height: 90,
                    descripcion: ""
                },
                {
                    id: "nidbdbkg",
                    tipo: "documento",
                    titulo: "Requerimiento de subsanación",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 840,
                    y: 140,
                    width: 180,
                    height: 90,
                    descripcion: ""
                },
                {
                    id: "nhdu5q60",
                    tipo: "plazo",
                    titulo: "Plazo de subsanación",
                    tareaManual: false,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 860,
                    y: 280,
                    width: 140,
                    height: 90,
                    descripcion: ""
                },
                {
                    id: "ns7n1tuf",
                    tipo: "formulario",
                    titulo: "Revisión de la subsanación",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 840,
                    y: 440,
                    width: 180,
                    height: 90,
                    descripcion: ""
                },
                {
                    id: "nbmbc6ji",
                    tipo: "circuito",
                    titulo: "Resolución de desistimiento",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 1040,
                    y: 440,
                    width: 176.0001220703125,
                    height: 90.00628662109375,
                    descripcion: ""
                },
                {
                    id: "ncotkj47",
                    tipo: "documento",
                    titulo: "Informe Técnico",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 580,
                    y: 440,
                    width: 160,
                    height: 90,
                    descripcion: ""
                },
                {
                    id: "nyd9a7qz",
                    tipo: "circuito",
                    titulo: "Resolución de concesión",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 380,
                    y: 700,
                    width: 180,
                    height: 90,
                    descripcion: ""
                },
                {
                    id: "ndu85txu",
                    tipo: "circuito",
                    titulo: "Resolución de denegación",
                    tareaManual: true,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 740,
                    y: 700,
                    width: 180,
                    height: 90,
                    descripcion: ""
                }
            ],
            conexiones: [
                {
                    id: "cagrf3fl",
                    from: "ne7huupf",
                    to: "nidbdbkg",
                    fromPos: "bottom",
                    toPos: "left",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "clxej8fs",
                    from: "nidbdbkg",
                    to: "nhdu5q60",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "cc1q7an2",
                    from: "nhdu5q60",
                    to: "ns7n1tuf",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "cglpc838",
                    from: "ns7n1tuf",
                    to: "ncotkj47",
                    fromPos: "left",
                    toPos: "right",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "c1kjywdj",
                    from: "ncotkj47",
                    to: "nyd9a7qz",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "c8dg8p0m",
                    from: "ncotkj47",
                    to: "ndu85txu",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "c922xj3n",
                    from: "ne7huupf",
                    to: "ncotkj47",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "c922hjgn",
                    from: "ns7n1tuf",
                    to: "nbmbc6ji",
                    fromPos: "right",
                    toPos: "left",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                }
            ]
        },

        // --------------------------------------------------------
        // PLANTILLA: RESOLUCIÓN PROVISIONAL CON ALEGACIONES
        // --------------------------------------------------------
        resolucionProvisionalAlegaciones: {
            nodos: [
                {
                    id: "nkerrqex",
                    tipo: "circuito",
                    titulo: "Resolución con alegaciones (Provisional)",
                    tareaManual: false,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 732,
                    y: 180,
                    width: 223.0125732421875,
                    height: 92.01251220703125,
                    descripcion: ""
                },
                {
                    id: "n2hp0v10",
                    tipo: "plazo",
                    titulo: "Plazo de alegaciones",
                    tareaManual: false,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 757,
                    y: 320,
                    width: 173.00006103515625,
                    height: 84.00628662109375,
                    descripcion: ""
                },
                {
                    id: "nm7wwt7g",
                    tipo: "documento",
                    titulo: "Certificado de alegaciones presentadas",
                    tareaManual: false,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 740,
                    y: 440,
                    width: 208.00006103515625,
                    height: 69.00003051757812,
                    descripcion: ""
                },
                {
                    id: "nunirzpb",
                    tipo: "circuito",
                    titulo: "Resolución definitiva",
                    tareaManual: false,
                    asignadoA: "",
                    annex: "",
                    pregunta: "",
                    x: 726,
                    y: 540,
                    width: 235.00628662109375,
                    height: 106.00628662109375,
                    descripcion: ""
                }
            ],
            conexiones: [
                {
                    id: "cxwipq60",
                    from: "nkerrqex",
                    to: "n2hp0v10",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "c9qti7ds",
                    from: "n2hp0v10",
                    to: "nm7wwt7g",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                },
                {
                    id: "c96ol544",
                    from: "nm7wwt7g",
                    to: "nunirzpb",
                    fromPos: "bottom",
                    toPos: "top",
                    condicionNombre: "",
                    condicionValor: "",
                    cambioEstado: ""
                }
            ]
        }
    },

    /* ============================================================
       INICIALIZACIÓN
    ============================================================ */
    init() {
        console.log("🔮 [Wizard.init] Inicio de init()");

        // Crear botón flotante si no existe
        if (!document.getElementById("btnWizard")) {
            const btn = document.createElement("button");
            btn.id = "btnWizard";
            btn.className = "floating-wizard-btn";
            btn.innerHTML = "🧙 Asistente";
            document.body.appendChild(btn);
            console.log("🧱 [Wizard.init] Botón flotante creado");
        } else {
            console.log("ℹ️ [Wizard.init] Botón flotante ya existía");
        }

        // Crear popup modal de plantillas si no existe
        if (!document.getElementById("wizardTemplatesModal")) {
            const modal = document.createElement("div");
            modal.id = "wizardTemplatesModal";
            modal.className = "wizard-modal hidden";
            modal.innerHTML = `
                <div class="wizard-modal-backdrop"></div>
                <div class="wizard-modal-content">
                    <div class="wizard-header">
                        <h3>📋 Plantillas de Flujo</h3>
                        <button id="wizardTemplatesClose" class="wizard-close-btn">&times;</button>
                    </div>
                    <div class="wizard-content" id="wizardTemplatesBody">
                        <!-- Contenido dinámico de plantillas -->
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            console.log("🧱 [Wizard.init] Modal de plantillas creado");
        } else {
            console.log("ℹ️ [Wizard.init] Modal de plantillas ya existía");
        }

        this.btn = document.getElementById("btnWizard");
        this.modal = document.getElementById("wizardTemplatesModal");
        this.modalBody = document.getElementById("wizardTemplatesBody");
        this.modalCloseBtn = document.getElementById("wizardTemplatesClose");

        console.log("🔗 [Wizard.init] Referencias DOM:", {
            btn: this.btn,
            modal: this.modal,
            modalBody: this.modalBody,
            modalCloseBtn: this.modalCloseBtn
        });

        // Evento botón flotante → abrir popup de plantillas
        this.btn.addEventListener("click", () => {
            console.log("🖱️ [Wizard] Click en botón flotante → abrir plantillas");
            this.openTemplatesModal();
        });

        // Botón de cierre (X) del modal
        this.modalCloseBtn.addEventListener("click", () => {
            console.log("🖱️ [Wizard] Click en botón cerrar (X) modal");
            this.closeTemplatesModal();
        });

        // Cerrar si se hace clic en el fondo oscuro
        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal || e.target.classList.contains("wizard-modal-backdrop")) {
                console.log("🖱️ [Wizard] Click en backdrop del modal → cerrar");
                this.closeTemplatesModal();
            }
        });

        console.log("✅ [Wizard.init] Final de init()");
    },

    /* ============================================================
       ABRIR / CERRAR MODAL
    ============================================================ */
    openTemplatesModal() {
        if (!this.modal) return;
        this.modal.classList.remove("hidden");
        this.showFlowTemplates();
    },

    closeTemplatesModal() {
        if (!this.modal) return;
        this.modal.classList.add("hidden");
    },

    /* ============================================================
       PLANTILLAS DE FLUJO
    ============================================================ */
    showFlowTemplates() {
        console.log("📚 [Wizard.showFlowTemplates] Mostrar lista de plantillas");

        if (!this.modalBody) return;

        this.modalBody.innerHTML = `
            <div class="wizard-templates">
                <h4>📋 Plantillas de Flujo</h4>
                <p class="wizard-template-description">
                    Elige una plantilla para generar automáticamente el diagrama básico del procedimiento.
                </p>

                <div class="wizard-template-list">
                    
                    <div class="wizard-template-card" onclick="Wizard.showTemplateDetail('tramiteCompleto')">
                        <h5>📄 Procedimiento Tipo Completo</h5>
                        <p>Revisión solicitud → Subsanación / Informe → Concesión / Denegación</p>
                    </div>    

                    <div class="wizard-template-card" onclick="Wizard.showTemplateDetail('subsanacion')">
                        <h5>📝 Flujo de Subsanación</h5>
                        <p>Requerimiento → Plazo → Revisión → Desistimiento</p>
                    </div>

                    <div class="wizard-template-card" onclick="Wizard.showTemplateDetail('resolucionProvisionalAlegaciones')">
                        <h5>📝 Resolución Provisional con Alegaciones</h5>
                        <p>Resolución provisional → Alegaciones → Certificado → Resolución definitiva</p>
                    </div>

                </div>
            </div>
        `;
    },

    showTemplateDetail(templateId) {
        console.log("📄 [Wizard.showTemplateDetail] templateId =", templateId);

        const template = this.flowTemplatesMeta[templateId];
        if (!template) {
            console.error("❌ Template no encontrado:", templateId);
            return;
        }
        if (!this.modalBody) return;

        this.modalBody.innerHTML = `
            <div class="wizard-template-detail">
                <button class="wizard-back-btn" onclick="Wizard.showFlowTemplates()">
                    ← Volver a las plantillas
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
                                <small>${nodo.descripcion || ""}</small>
                            </li>
                        `).join("")}
                    </ol>
                </div>

                <div class="wizard-actions">
                    <button class="wizard-btn" onclick="Wizard.showFlowTemplates()">Cancelar</button>
                    <button class="wizard-btn wizard-btn-primary" onclick="Wizard.applyTemplate('${templateId}')">
                        ✓ Aplicar plantilla
                    </button>
                </div>
            </div>
        `;
    },

    applyTemplate(templateId) {
        console.log("✅ [Wizard.applyTemplate] Aplicando template (diagrama):", templateId);

        const template = this.flowTemplatesDiagram[templateId];
        if (!template) {
            console.error("❌ Template no encontrado:", templateId);
            return;
        }

        if (!Renderer.container || !Renderer.svg) {
            console.warn("⚠ Renderer no estaba inicializado, llamando a Renderer.init()");
            Renderer.init();
        }

        const { nodos, conexiones } = template;
        const idMap = {};
        const creados = [];

        // 1️⃣ Crear nodos a partir del template
        nodos.forEach((tNodo) => {
            const n = Engine.createNode(tNodo.tipo, tNodo.x, tNodo.y);

            idMap[tNodo.id] = n.id;

            const div = document.getElementById(n.id);
            if (div) {
                const contentDiv = div.querySelector(".node-content");
                if (contentDiv) {
                    contentDiv.innerText = tNodo.titulo || "";
                }

                const descDiv = div.querySelector(".node-description");
                if (descDiv && tNodo.descripcion !== undefined) {
                    descDiv.innerText = tNodo.descripcion || "";
                }

                const nodoReal = Engine.getNode(n.id);
                if (nodoReal) {
                    if (typeof tNodo.width === "number") {
                        nodoReal.width = tNodo.width;
                        div.style.width = tNodo.width + "px";
                    }
                    if (typeof tNodo.height === "number") {
                        nodoReal.height = tNodo.height;
                        div.style.height = tNodo.height + "px";
                    }

                    Renderer.renderShapeSVG(div, nodoReal);
                    creados.push(nodoReal);
                } else {
                    creados.push(n);
                }
            } else {
                creados.push(Engine.getNode(n.id) || n);
            }

            Engine.updateNode(n.id, {
                titulo:      tNodo.titulo,
                descripcion: tNodo.descripcion || "",
                tareaManual: !!tNodo.tareaManual,
                asignadoA:   tNodo.asignadoA || ""
            });
        });

        // 2️⃣ Crear conexiones del template
        conexiones.forEach((tConn) => {
            const fromId = idMap[tConn.from];
            const toId   = idMap[tConn.to];

            if (!fromId || !toId) {
                console.warn("⚠ No se encontró nodo para conexión de template:", tConn);
                return;
            }

            const conn = Engine.createConnection(
                fromId,
                toId,
                tConn.fromPos || "bottom",
                tConn.toPos   || "top"
            );

            if (!conn) return;

            if ((tConn.condicionNombre && tConn.condicionNombre.trim()) ||
                (tConn.condicionValor && tConn.condicionValor.trim())) {

                Engine.updateConnectionCondition(
                    conn.id,
                    tConn.condicionNombre || "",
                    tConn.condicionValor  || ""
                );
            }

            if (tConn.cambioEstado && tConn.cambioEstado.trim()) {
                Engine.updateConnectionCambioEstado(conn.id, tConn.cambioEstado.trim());
            }
        });

        // 3️⃣ Refrescar conexiones y guardar historial
        Renderer.redrawConnections();
        Engine.saveHistory();

        alert(`✅ Plantilla aplicada: ${nodos.length} nodos y ${conexiones.length} conexiones creadas.`);
        Wizard.closeTemplatesModal();
    },

    // ============================================================
    // *** NUEVO: exponer plantillas de diagrama al Asistente Guiado ***
    // ============================================================
    getDiagramTemplate(templateId) {
        const t = this.flowTemplatesDiagram[templateId];
        if (!t) return null;

        return {
            nodos: t.nodos.map(n => ({ ...n })),
            conexiones: t.conexiones.map(c => ({ ...c }))
        };
    }
};

/* ============================================================
   EXPONER EN window PARA LOS onclick INLINE
============================================================ */
window.Wizard = Wizard;
console.log("🌍 [Wizard] window.Wizard asignado:", window.Wizard);

/* ============================================================
   INICIALIZACIÓN AUTOMÁTICA
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    console.log("📦 [Wizard] DOMContentLoaded → llamando a Wizard.init()");
    Wizard.init();
});

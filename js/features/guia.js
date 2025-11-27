/* ============================================================
   GUIA.JS - Recorrido visual interactivo
   ------------------------------------------------------------
   - Botón flotante abajo a la derecha
   - Overlay con pasos, resaltado y demo de handles/conexiones
============================================================ */

(() => {
  const messages = {
    procedure: {
      title: "Panel izquierdo: procedimiento",
      description:
        "Aquí comienzas: configura el procedimiento y abre vistas previas sin usar ningún botón flotante extra.",
    },
    ficha: {
      title: "Ficha del proyecto",
      description: "⚙️ Ficha del proyecto abre los metadatos básicos del flujo.",
    },
    verCsv: {
      title: "Vista previa del procedimiento",
      description: "📋 Abre la vista previa CSV del flujo sin descargar nada.",
    },
    exportFlujo: {
      title: "Exportar flujo normalizado",
      description: "📤 Genera el CSV oficial del flujo listo para compartir o validar.",
    },
    exportTesauro: {
      title: "Exportar tesauro",
      description: "📤 Exporta el tesauro actual en CSV para revisar o migrar las etiquetas.",
    },
    guardarJson: {
      title: "Guardar JSON",
      description: "💾 Exporta el JSON completo del flujo para respaldarlo o versionarlo.",
    },
    cargarJson: {
      title: "Cargar JSON",
      description: "📂 Vuelve a cargar un flujo existente seleccionando un archivo JSON guardado.",
    },
    pegarJson: {
      title: "Pegar JSON validado",
      description:
        "📋 Pegar JSON admite texto plano. Si viene de Gestiona: copia → pega como texto sin formato en Excel → vuelve a copiar aquí antes de importar.",
    },
    iaJson: {
      title: "IA para crear procedimientos",
      description:
        "🤖 IA JSON abre un asistente externo que genera el esquema del flujo; solo pega el resultado aquí para importarlo.",
    },
    exportDocx: {
      title: "Exportar DOCX",
      description: "📄 Exportar resumen DOCX produce un documento de resumen para compartir el flujo.",
    },
    copypaste: {
      title: "Copiar/pegar guiado",
      description:
        "Selecciona todo el bloque de texto, pégalo en el área Copypaste y reconstruye el diagrama con Importar diagrama desde texto.",
    },
    nodes: {
      title: "Nodos disponibles",
      description:
        "Añade Formularios, Documentos, Decisiones, Circuitos, Operaciones externas, Notas y más. Crea uno y arrástralo por el lienzo antes de conectar.",
    },
    canvas: {
      title: "Mover nodos en el lienzo",
      description:
        "Con el nodo creado, arrástralo libremente y usa la rueda para zoom. Selecciónalo para ver propiedades a la derecha.",
    },
    handles: {
      title: "Handles y conexión de prueba",
      description:
        "Arrastra desde cualquier handle del nodo hacia otro para crear la arista. Observa el ejemplo con colores por defecto.",
    },
    conditions: {
      title: "Condiciones y estados",
      description:
        "Selecciona una conexión para editar condición/valor. Puedes arrastrar campos del tesauro o estados sobre la línea para etiquetarla.",
    },
    asignaciones: {
      title: "Asignaciones",
      description:
        "📋 Abre el gestor flotante para registrar grupos/usuarios globales y reutilizarlos en el campo ‘Asignado a’ de cada nodo.",
    },
    estados: {
      title: "Cambios de estado",
      description:
        "🔄 Define estados de expediente y arrástralos a las conexiones para documentar el avance del flujo.",
    },
    tesauro: {
      title: "Tesauros laterales",
      description:
        "📚 Abre el panel lateral para arrastrar etiquetas sobre nodos o conexiones. También permite crear, transformar o importar campos.",
    },
    tesauroManager: {
      title: "Gestor completo de tesauros",
      description:
        "Modal masivo para importar, referenciar, crear filas, exportar y guardar en bloque todos los tesauros del proyecto.",
    },
  };

  const state = {
    steps: [],
    current: 0,
    active: false,
    cleanup: null,
    elements: {
      layer: null,
      dim: null,
      highlight: null,
      tooltip: null,
      title: null,
      text: null,
      prevBtn: null,
      nextBtn: null,
      exitBtn: null,
    },
    demoBoard: null,
    managerAutoOpened: false,
  };

  document.addEventListener("DOMContentLoaded", () => {
    createTriggers();
    createLayer();
    attachEvents();
  });

  function createTriggers() {
    let floating = document.getElementById("guideFloatingTrigger");
    if (!floating) {
      floating = document.createElement("button");
      floating.id = "guideFloatingTrigger";
      floating.type = "button";
      floating.className = "guide-floating-btn";
      floating.textContent = "👀 Guía rápida";
      document.body.appendChild(floating);
    }

    floating.addEventListener("click", startGuide);
  }

  function createLayer() {
    if (state.elements.layer) return;

    const layer = document.createElement("div");
    layer.className = "guide-layer";

    const dim = document.createElement("div");
    dim.className = "guide-dim";

    const highlight = document.createElement("div");
    highlight.className = "guide-highlight";

    const tooltip = document.createElement("div");
    tooltip.className = "guide-tooltip";
    tooltip.innerHTML = `
      <h4 id="guideTitle"></h4>
      <p id="guideText"></p>
      <div class="guide-actions">
        <button type="button" class="guide-prev">Anterior</button>
        <button type="button" class="guide-next">Siguiente</button>
        <button type="button" class="guide-exit">Salir</button>
      </div>
    `;

    layer.appendChild(dim);
    layer.appendChild(highlight);
    layer.appendChild(tooltip);
    document.body.appendChild(layer);

    state.elements = {
      layer,
      dim,
      highlight,
      tooltip,
      title: tooltip.querySelector("#guideTitle"),
      text: tooltip.querySelector("#guideText"),
      prevBtn: tooltip.querySelector(".guide-prev"),
      nextBtn: tooltip.querySelector(".guide-next"),
      exitBtn: tooltip.querySelector(".guide-exit"),
    };
  }

  function attachEvents() {
    const { prevBtn, nextBtn, exitBtn } = state.elements;
    if (!prevBtn || !nextBtn || !exitBtn) return;

    prevBtn.addEventListener("click", () => goToStep(state.current - 1));
    nextBtn.addEventListener("click", () => goToStep(state.current + 1));
    exitBtn.addEventListener("click", endGuide);

    window.addEventListener("resize", () => {
      if (state.active) renderStep(state.current);
    });
    window.addEventListener(
      "scroll",
      () => {
        if (state.active) renderStep(state.current);
      },
      { passive: true }
    );
    document.addEventListener("keydown", (e) => {
      if (!state.active) return;
      if (e.key === "Escape") endGuide();
      if (e.key === "ArrowRight") goToStep(state.current + 1);
      if (e.key === "ArrowLeft") goToStep(state.current - 1);
    });
  }

  function startGuide() {
    const steps = buildSteps();
    if (!steps.length) return;

    state.steps = steps;
    state.current = 0;
    state.active = true;
    state.cleanup = null;

    state.elements.layer.classList.add("active");
    renderStep(0);
  }

  function endGuide() {
    runCleanup();
    state.active = false;
    state.elements.layer.classList.remove("active");
    resetOverlay();
    hideDemoBoard();
    if (state.managerAutoOpened && window.TesauroManager && typeof TesauroManager.close === "function") {
      TesauroManager.close();
    }
    state.managerAutoOpened = false;
  }

  function buildSteps() {
    const steps = [];
    const leftPanel = document.getElementById("leftPanel");
    const canvas = document.getElementById("canvasArea");
    const pasteBlock = document.getElementById("importFromTextBlock");
    const assignBtn = document.getElementById("btnAsignaciones");
    const cambiosBtn = document.getElementById("btnCambiosEstado");

    const fichaBtn = document.getElementById("btnFichaProyecto");
    const verCsvBtn = document.getElementById("btnVerCSV");
    const exportFlujoBtn = document.getElementById("btnExportFlujo");
    const exportTesauroBtn = document.getElementById("btnExportTesauro");
    const exportDocxBtn = document.getElementById("btnExportDocx");
    const guardarJsonBtn = document.getElementById("btnExportJSON");
    const cargarJsonBtn = document.getElementById("btnImportJSON");
    const pegarJsonBtn = document.getElementById("btnPasteJSON");
    const iaJsonBtn = document.getElementById("btnIAJson");
    const copypasteArea = pasteBlock || null;

    const leftButtons = leftPanel ? Array.from(leftPanel.querySelectorAll("button")) : [];
    const added = new Set();
    const actionMap = {
      btnFichaProyecto: { message: messages.ficha },
      btnVerCSV: { message: messages.verCsv },
      btnExportFlujo: { message: messages.exportFlujo },
      btnExportTesauro: { message: messages.exportTesauro },
      btnExportJSON: { message: messages.guardarJson },
      btnImportJSON: { message: messages.cargarJson },
      btnPasteJSON: { message: messages.pegarJson },
      btnIAJson: { message: messages.iaJson },
      btnExportDocx: { message: messages.exportDocx },
    };

    const pushActionStep = (id, element) => {
      const config = actionMap[id];
      if (!config || added.has(id) || !element) return;
      steps.push({
        title: config.message.title,
        description: config.message.description,
        element: () => element,
      });
      added.add(id);
    };

    const firstNodeBtn = document.querySelector("#leftPanel button[onclick*='createNode']");

    if (leftPanel) {
      steps.push({
        title: messages.procedure.title,
        description: messages.procedure.description,
        element: () => leftPanel,
      });
    }

    leftButtons.forEach((btn) => pushActionStep(btn.id, btn));

    [
      fichaBtn,
      verCsvBtn,
      exportFlujoBtn,
      exportTesauroBtn,
      guardarJsonBtn,
      cargarJsonBtn,
      pegarJsonBtn,
      iaJsonBtn,
      exportDocxBtn,
    ].forEach((btn) => {
      if (btn) pushActionStep(btn.id, btn);
    });

    if (copypasteArea) {
      steps.push({
        title: messages.copypaste.title,
        description: messages.copypaste.description,
        element: () => copypasteArea,
      });
    }

    if (firstNodeBtn) {
      steps.push({
        title: messages.nodes.title,
        description: messages.nodes.description,
        element: () => firstNodeBtn,
      });
    }

    if (canvas) {
      steps.push({
        title: messages.canvas.title,
        description: messages.canvas.description,
        element: () => canvas,
      });
    }

    steps.push({
      title: messages.handles.title,
      description: messages.handles.description,
      element: () => ensureDemoBoard(),
      onEnter: () => showDemoBoard("handles"),
    });

    steps.push({
      title: messages.conditions.title,
      description: messages.conditions.description,
      element: () => ensureDemoBoard(),
      onEnter: () => showDemoBoard("conditions"),
    });

    if (assignBtn) {
      steps.push({
        title: messages.asignaciones.title,
        description: messages.asignaciones.description,
        element: () => assignBtn,
      });
    }

    if (cambiosBtn) {
      steps.push({
        title: messages.estados.title,
        description: messages.estados.description,
        element: () => cambiosBtn,
      });
    }

    const tesauroPanelStep = buildTesauroPanelStep();
    if (tesauroPanelStep) steps.push(tesauroPanelStep);

    const tesauroManagerSteps = buildTesauroManagerSteps();
    steps.push(...tesauroManagerSteps);

    return steps;
  }

  function goToStep(index) {
    if (index !== state.current) runCleanup();

    if (index < 0) return;
    if (index >= state.steps.length) {
      endGuide();
      return;
    }

    state.current = index;
    renderStep(index);
  }

  function renderStep(index) {
    const step = state.steps[index];
    if (!step) return;

    let cleanupFn = null;
    if (typeof step.onEnter === "function") {
      const result = step.onEnter();
      if (typeof result === "function") cleanupFn = result;
    }

    const target = typeof step.element === "function" ? step.element() : step.element;
    if (!target) {
      goToStep(index + 1);
      return;
    }

    state.cleanup = cleanupFn;

    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    positionHighlight(target);
    placeTooltip(target);

    requestAnimationFrame(() => {
      positionHighlight(target);
      placeTooltip(target);
    });

    state.elements.title.textContent = step.title;
    state.elements.text.textContent = step.description;

    const isLast = index === state.steps.length - 1;
    state.elements.nextBtn.textContent = isLast ? "Finalizar" : "Siguiente";
  }

  function positionHighlight(target) {
    const rect = target.getBoundingClientRect();
    const padding = 10;
    const { highlight } = state.elements;

    highlight.style.left = `${rect.left - padding}px`;
    highlight.style.top = `${rect.top - padding}px`;
    highlight.style.width = `${rect.width + padding * 2}px`;
    highlight.style.height = `${rect.height + padding * 2}px`;
  }

  function placeTooltip(target) {
    const rect = target.getBoundingClientRect();
    const tooltip = state.elements.tooltip;
    if (!tooltip) return;

    tooltip.style.left = "0px";
    tooltip.style.top = "0px";

    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left;
    if (left + tooltipRect.width > viewportWidth - margin) {
      left = viewportWidth - tooltipRect.width - margin;
    }
    if (left < margin) {
      left = margin;
    }

    let top = rect.bottom + margin;
    if (top + tooltipRect.height > viewportHeight - margin) {
      top = rect.top - tooltipRect.height - margin;
    }
    if (top < margin) {
      top = margin;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function runCleanup() {
    if (typeof state.cleanup === "function") {
      try {
        state.cleanup();
      } catch (err) {
        console.error(err);
      }
    }
    state.cleanup = null;
    hideDemoBoard();
  }

  function resetOverlay() {
    const { highlight, tooltip } = state.elements;
    if (highlight) {
      highlight.style.left = "-9999px";
      highlight.style.top = "-9999px";
      highlight.style.width = "0px";
      highlight.style.height = "0px";
    }
    if (tooltip) {
      tooltip.style.left = "-9999px";
      tooltip.style.top = "-9999px";
    }
  }

  function ensureDemoBoard() {
    if (state.demoBoard) return state.demoBoard;

    const board = document.createElement("div");
    board.className = "guide-demo-board";
    board.innerHTML = `
      <div class="guide-demo-node">
        <div class="guide-handle top"></div>
        <div class="guide-handle right"></div>
        <div class="guide-handle bottom"></div>
        <div class="guide-handle left"></div>
        <p class="guide-node-title">Nodo de prueba</p>
        <p class="guide-node-hint">Handles en las 4 caras para iniciar conexiones.</p>
      </div>
      <div class="guide-demo-node">
        <div class="guide-handle top"></div>
        <div class="guide-handle right"></div>
        <div class="guide-handle bottom"></div>
        <div class="guide-handle left"></div>
        <p class="guide-node-title">Nodo destino</p>
        <p class="guide-node-hint">Suelta aquí para crear la conexión.</p>
      </div>
      <div class="guide-demo-connection">
        <div class="guide-connection-dot"></div>
        <div class="guide-connection-pill">Condición: campo tesauro</div>
        <div class="guide-connection-pill state">Estado: Resuelto</div>
      </div>
    `;

    document.body.appendChild(board);
    state.demoBoard = board;
    return board;
  }

  function showDemoBoard(mode) {
    const board = ensureDemoBoard();
    if (!board) return null;

    const canvas = document.getElementById("canvasArea");
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 40, top: 80, width: 600, height: 380 };
    const top = rect.top + rect.height / 2 - board.offsetHeight / 2;
    const left = rect.left + rect.width / 2 - board.offsetWidth / 2;

    board.style.top = `${Math.max(12, top)}px`;
    board.style.left = `${Math.max(12, left)}px`;

    board.classList.toggle("show-conditions", mode === "conditions");
    return () => hideDemoBoard();
  }

  function hideDemoBoard() {
    if (state.demoBoard) {
      state.demoBoard.classList.remove("show-conditions");
      state.demoBoard.style.top = "-9999px";
      state.demoBoard.style.left = "-9999px";
    }
  }

  function buildTesauroPanelStep() {
    const btn = document.getElementById("btnTesauro");
    const panel = document.getElementById("panelTesauro");
    if (!btn && !panel) return null;

    return {
      title: messages.tesauro.title,
      description: messages.tesauro.description,
      element: () => document.getElementById("panelTesauro") || btn,
      onEnter: () => {
        const panelEl = document.getElementById("panelTesauro");
        const wasVisible = panelEl?.classList.contains("visible");
        if (panelEl && !wasVisible) panelEl.classList.add("visible");
        if (window.DataTesauro && typeof DataTesauro.render === "function") {
          DataTesauro.render();
        }
        return () => {
          if (panelEl && !wasVisible) panelEl.classList.remove("visible");
        };
      },
    };
  }

  function buildTesauroManagerSteps() {
    if (!window.TesauroManager || typeof TesauroManager.open !== "function") return [];

    const ensureManagerOpen = () => {
      const modal = document.getElementById("tesauroManagerModal");
      const wasOpen = modal?.style.display === "flex";
      if (!wasOpen) {
        TesauroManager.open();
        state.managerAutoOpened = true;
      }
      return document.getElementById("tesauroManagerModal") || modal;
    };

    const steps = [
      {
        title: messages.tesauroManager.title,
        description: messages.tesauroManager.description,
        element: () => ensureManagerOpen(),
        onEnter: () => ensureManagerOpen(),
      },
    ];

    const managerButtons = [
      {
        id: "tmExportTesauroAll",
        title: "Exportar tesauros",
        description: "Genera los CSV oficiales con los nombres de Entidad y Actividad configurados.",
      },
      {
        id: "tmOpenPlainImport",
        title: "Importar tesauros (texto)",
        description: "Pega tesauros en texto plano para cargarlos masivamente en la tabla.",
      },
      {
        id: "tmOpenMdImport",
        title: "Importar desde Markdown",
        description: "Detecta tesauros dentro de un Markdown y los añade al gestor sin perder formato.",
      },
      {
        id: "tmOpenRefPopup",
        title: "Referenciar tesauros",
        description: "Crea referencias cruzadas entre tesauros existentes para reutilizarlos.",
      },
      {
        id: "tmNewTesauro",
        title: "Crear tesauro",
        description: "Añade una fila nueva para definir un tesauro desde cero.",
      },
      {
        id: "tmSave",
        title: "Guardar cambios",
        description: "Guarda en bloque todas las ediciones realizadas en la tabla.",
      },
      {
        id: "tmClose",
        title: "Cerrar gestor",
        description: "Cierra el gestor y vuelve al editor manteniendo los cambios aplicados.",
      },
    ];

    managerButtons.forEach((info) => {
      steps.push({
        title: info.title,
        description: info.description,
        element: () => {
          const modal = ensureManagerOpen();
          return modal ? modal.querySelector(`#${info.id}`) : null;
        },
        onEnter: () => ensureManagerOpen(),
      });
    });

    return steps;
  }
})();

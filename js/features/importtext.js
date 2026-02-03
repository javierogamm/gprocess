/* ============================================================
   IMPORTAR DIAGRAMA DESDE TEXTO
   - Dos pasadas:
     1) Crear nodos y colocarlos
     2) Crear conexiones (en todo caso / sólo si / cambiar estado)
============================================================ */

const ImportText = {

    /* ------------------------------------------
       Inferir tipo de nodo a partir del título
    ------------------------------------------ */
    inferTipo(titulo) {
        const t = (titulo || "").toLowerCase().trim();

        if (!t) return "formulario";

        // Esperas / plazos
        if (t.startsWith("espera ")) return "plazo";
        if (t.startsWith("espera de")) return "plazo";

        // Plazos explícitos
        if (t.startsWith("plazo ") || t.startsWith("plazo de")) return "plazo";

        // Formularios explícitos
        if (t.includes("formulario")) return "formulario";

        // Documentos: informe / acta / certificado
        if (
            t.includes("informe") ||
            t.includes(" acta") ||
            t.startsWith("acta") ||
            t.includes("certificado")
        ) return "documento";

        // Circuitos
        if (
            t.startsWith("circuito") ||
            t.includes("circuito de") ||
            t.startsWith("liquidación") ||
            t.startsWith("liquidacion")
        ) return "circuito";

        return "formulario";
    },

/* ------------------------------------------
   PREVISUALIZAR TEXTO (SIN MODIFICAR MOTOR)
------------------------------------------ */
parsePreview(texto) {
    const lineas = texto.split(/\r?\n/).map(l => l.trimEnd());
    const mapaNodos = new Map();
    const nodos = [];
    const conexiones = [];

    let previewIndex = 0;

    function parseCols(linea, minCols = 5) {
        let cols = linea.split(/\t/g);
        if (cols.length === 1) {
            cols = linea.split(/\s{2,}/g);
        }
        while (cols.length < minCols) cols.push("");
        return cols;
    }

    function matchesTipoCol(value) {
        return /^(formulario|documento|libre|plazo|circuito)/i.test((value || "").trim());
    }

    function isHeaderRow(cols) {
        const first = (cols[0] || "").trim().toLowerCase();
        const second = (cols[1] || "").trim().toLowerCase();
        return (
            (first === "tipo" && second === "asunto") ||
            (first === "asunto" && second === "al finalizar")
        );
    }

    function isActionText(textoLinea) {
        return (
            /^Sólo si/i.test(textoLinea) ||
            /^Lanzar tarea/i.test(textoLinea) ||
            /^Cambiar estado/i.test(textoLinea)
        );
    }

    function isNodeLine(rawLine, columnas) {
        if (!rawLine.trim()) return false;
        const linea = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "");
        const cols = parseCols(linea, columnas);
        if (isHeaderRow(cols)) return false;
        return matchesTipoCol(cols[0]) && (cols[1] || "").trim();
    }

    function detectTipoColumn(lines) {
        for (const rawLine of lines) {
            if (!rawLine.trim()) continue;
            if (isActionText(rawLine.trim())) continue;
            const cols = parseCols(rawLine.replace(/^\t+/, "").replace(/^ {4}/, ""), 7);
            if (isHeaderRow(cols)) return true;
            if (matchesTipoCol(cols[0]) && (cols[1] || "").trim()) return true;
            return false;
        }
        return false;
    }

    function normalizeTipo(tipoRaw) {
        const t = (tipoRaw || "").toLowerCase().trim();
        if (!t) return "";
        if (t.includes("formulario")) return "formulario";
        if (t.includes("documento")) return "documento";
        if (t.includes("libre")) return "libre";
        if (t.includes("plazo")) return "plazo";
        if (t.includes("circuito")) return "circuito";
        return "";
    }

    function findAssignedFromBlock(lines, startIndex, columnas) {
        for (let i = startIndex + 1; i < lines.length; i++) {
            const rawLine = lines[i];
            if (!rawLine.trim()) continue;
            if (isNodeLine(rawLine, columnas)) break;
            const candidato = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "").trim();
            if (!candidato) continue;
            if (isActionText(candidato)) continue;
            if (/^editar\b/i.test(candidato)) continue;
            if (/^acciones\b/i.test(candidato)) continue;
            if (/ALC\d+/i.test(candidato) || /unidad gestora/i.test(candidato)) {
                return candidato;
            }
        }
        return "";
    }

    function extractTaskTitleFromAction(txt) {
        let rest = txt.replace(/^Lanzar tarea\s+/i, "").trim();
        const pairs = { "'": "'", '"': '"', "“": "”", "‘": "’" };
        const qStart = rest.charAt(0);
        const qEnd = pairs[qStart];
        if (qEnd && rest.endsWith(qEnd)) {
            rest = rest.slice(1, -1);
        }
        return rest.trim();
    }

    const usaTipoCol = detectTipoColumn(lineas);
    const columnasMin = usaTipoCol ? 7 : 5;

    lineas.forEach((rawLine, index) => {
        if (!rawLine.trim()) return;

        const lineaRecortada = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "");
        if (!isNodeLine(lineaRecortada, columnasMin)) return;

        const partes = parseCols(lineaRecortada, columnasMin);
        if (isHeaderRow(partes)) return;

        const tipoCol = usaTipoCol ? (partes[0] || "").trim() : "";
        const titulo = (usaTipoCol ? partes[1] : partes[0] || "").trim();
        const asignadoLinea = (usaTipoCol ? partes[3] : partes[2] || "").trim();
        const asignadoExtra = asignadoLinea ? "" : findAssignedFromBlock(lineas, index, columnasMin);
        const asignado = asignadoLinea || asignadoExtra;

        if (!titulo) return;

        const tipoDetectado = normalizeTipo(tipoCol) || this.inferTipo(titulo);
        const nodeId = `preview-node-${previewIndex + 1}`;
        const grupoAsignado = asignado ? [asignado] : [];

        const nodo = {
            id: nodeId,
            tipo: tipoDetectado,
            titulo,
            tareaManual: false,
            asignadosGrupos: grupoAsignado,
            asignadosUsuarios: [],
            __order: previewIndex
        };

        nodos.push(nodo);
        mapaNodos.set(titulo, nodeId);
        previewIndex += 1;
    });

    let nodoActualId = null;
    let condicionesPendientes = [];
    let ultimaConexionId = null;
    let branchIndex = 0;

    lineas.forEach(rawLine => {
        if (!rawLine.trim()) return;

        const linea = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "");

        if (isNodeLine(rawLine, columnasMin)) {
            const partes = parseCols(linea, columnasMin);
            if (isHeaderRow(partes)) return;
            const titulo = (usaTipoCol ? partes[1] : partes[0] || "").trim();
            const condTxt = (usaTipoCol ? partes[2] : partes[1] || "").trim();
            nodoActualId = mapaNodos.get(titulo) || null;
            condicionesPendientes = [];
            ultimaConexionId = null;
            branchIndex = 0;

            if (condTxt && /^Sólo si/i.test(condTxt)) {
                const match = condTxt.match(/^Sólo si\s+'([^']+)'\s+es igual a\s+'([^']+)'/i);
                if (match) {
                    condicionesPendientes.push({ campo: match[1], valor: match[2] });
                } else {
                    condicionesPendientes.push({ textoLibre: condTxt });
                }
            }
            return;
        }

        if (!nodoActualId) return;

        const txt = linea.trim();
        if (!isActionText(txt)) return;

        if (/^Sólo si/i.test(txt)) {
            const match = txt.match(/^Sólo si\s+'([^']+)'\s+es igual a\s+'([^']+)'/i);
            if (match) {
                condicionesPendientes.push({ campo: match[1], valor: match[2] });
            } else {
                condicionesPendientes.push({ textoLibre: txt });
            }
            return;
        }

        if (/^Lanzar tarea\s+/i.test(txt)) {
            const destinoTitulo = extractTaskTitleFromAction(txt);
            const destinoId = mapaNodos.get(destinoTitulo);
            if (!destinoId) return;

            let fromPos = "bottom";
            let toPos = "top";

            if (condicionesPendientes.length > 0) {
                if (branchIndex === 0) fromPos = "right";
                else if (branchIndex === 1) fromPos = "left";
                else fromPos = "bottom";
                branchIndex += 1;
            }

            const connId = `preview-conn-${conexiones.length + 1}`;
            const conn = {
                id: connId,
                from: nodoActualId,
                to: destinoId,
                fromPos,
                toPos,
                condicionNombre: "",
                condicionValor: "",
                cambioEstado: ""
            };

            if (condicionesPendientes.length > 0) {
                condicionesPendientes.forEach(cond => {
                    conn.condicionNombre = cond.campo || "";
                    conn.condicionValor = cond.valor || cond.textoLibre || "";
                });
            }

            conexiones.push(conn);
            ultimaConexionId = connId;
            condicionesPendientes = [];
            return;
        }

        const cambiarMatch = txt.match(/^Cambiar estado del expediente a\s+'([^']+)'/i);
        if (cambiarMatch && ultimaConexionId) {
            const conn = conexiones.find(c => c.id === ultimaConexionId);
            if (conn) conn.cambioEstado = cambiarMatch[1];
        }
    });

    return { nodos, conexiones };
},

/* ------------------------------------------
   IMPORTAR TEXTO (REEMPLAZO COMPLETO)
------------------------------------------ */
import(texto) {

    const lineas = texto.split(/\r?\n/).map(l => l.trimEnd());
    const mapaNodos = new Map();

    // === Layout base: grid vertical con salto de columna (semilla) ===
    const area = document.getElementById("canvasArea");
    const container = document.getElementById("nodesContainer");

    const MARGIN = 120;
    const saltoY = 160;            // separación vertical entre filas (semilla)
    const saltoX = 320;            // separación horizontal entre columnas (semilla)
    const viewH  = (area?.clientHeight || 900);
    const viewW  = (area?.clientWidth  || 1400);
    const maxFilas = Math.max(6, Math.floor((viewH - 2 * MARGIN) / saltoY));

    let fila = 0;
    let col  = 0;
    const baseX = Math.max(MARGIN, Math.floor((viewW - saltoX) / 2));
    const baseY = MARGIN;

    // === utilidades de límites y tamaños ==============================
    function getNodeSize(n) {
        return { w: n.width  || 200, h: n.height || 100 };
    }
    function getCanvasBounds() {
        // ⭐ CAMBIO: no crecemos en alto; en ancho permitimos crecer (scrollWidth)
        const w = (container?.scrollWidth || area?.scrollWidth || area?.clientWidth || 1400);
        const h = (container?.scrollHeight || area?.scrollHeight || area?.clientHeight || 4000);        return {
            minX: MARGIN,
            minY: MARGIN,
            maxX: Math.max(MARGIN + 600, w - MARGIN),
            maxY: Math.max(MARGIN + 400, h - MARGIN)
        };
    }
    // Clampeo de una posición (esquina superior-izda del nodo)
    function clampPosition(x, y, n) {
        const { w, h } = getNodeSize(n);
        const B = getCanvasBounds();
        const clampedX = Math.min(Math.max(x, B.minX), B.maxX - w);
        const clampedY = Math.min(Math.max(y, B.minY), B.maxY - h);
        return { x: clampedX, y: clampedY };
    }

    // ----------------------------------------------------
    // Función robusta para dividir columnas del copypaste
    // ----------------------------------------------------
    function parseCols(linea, minCols = 5) {
        let cols = linea.split(/\t/g);
        if (cols.length === 1) {
            cols = linea.split(/\s{2,}/g);
        }
        while (cols.length < minCols) cols.push("");
        return cols;
    }

    function matchesTipoCol(value) {
        return /^(formulario|documento|libre|plazo|circuito)/i.test((value || "").trim());
    }

    function isHeaderRow(cols) {
        const first = (cols[0] || "").trim().toLowerCase();
        const second = (cols[1] || "").trim().toLowerCase();
        return (
            (first === "tipo" && second === "asunto") ||
            (first === "asunto" && second === "al finalizar")
        );
    }

    function isActionText(texto) {
        return (
            /^Sólo si/i.test(texto) ||
            /^Lanzar tarea/i.test(texto) ||
            /^Cambiar estado/i.test(texto)
        );
    }

    function isNodeLine(rawLine, columnas) {
        if (!rawLine.trim()) return false;
        const linea = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "");
        const cols = parseCols(linea, columnas);
        if (isHeaderRow(cols)) return false;
        return matchesTipoCol(cols[0]) && (cols[1] || "").trim();
    }

    function detectTipoColumn(lines) {
        for (const rawLine of lines) {
            if (!rawLine.trim()) continue;
            if (isActionText(rawLine.trim())) continue;
            const cols = parseCols(rawLine.replace(/^\t+/, "").replace(/^ {4}/, ""), 7);
            if (isHeaderRow(cols)) return true;
            if (matchesTipoCol(cols[0]) && (cols[1] || "").trim()) return true;
            return false;
        }
        return false;
    }

    function normalizeTipo(tipoRaw) {
        const t = (tipoRaw || "").toLowerCase().trim();
        if (!t) return "";
        if (t.includes("formulario")) return "formulario";
        if (t.includes("documento")) return "documento";
        if (t.includes("libre")) return "libre";
        if (t.includes("plazo")) return "plazo";
        if (t.includes("circuito")) return "circuito";
        return "";
    }

    function findAssignedFromBlock(lines, startIndex, columnas) {
        for (let i = startIndex + 1; i < lines.length; i++) {
            const rawLine = lines[i];
            if (!rawLine.trim()) continue;
            if (isNodeLine(rawLine, columnas)) break;
            const candidato = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "").trim();
            if (!candidato) continue;
            if (isActionText(candidato)) continue;
            if (/^editar\b/i.test(candidato)) continue;
            if (/^acciones\b/i.test(candidato)) continue;
            if (/ALC\d+/i.test(candidato) || /unidad gestora/i.test(candidato)) {
                return candidato;
            }
        }
        return "";
    }

    const usaTipoCol = detectTipoColumn(lineas);
    const columnasMin = usaTipoCol ? 7 : 5;

    // ============================================================
    // PRIMERA PASADA: CREAR NODOS (sólo líneas NO indentadas)
    // ============================================================
    lineas.forEach((rawLine, index) => {

        if (!rawLine.trim()) return;

        const lineaRecortada = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "");
        if (!isNodeLine(lineaRecortada, columnasMin)) return;

        let linea = lineaRecortada;
        const partes = parseCols(linea, columnasMin);
        if (isHeaderRow(partes)) return;

        const tipoCol  = usaTipoCol ? (partes[0] || "").trim() : "";
        const titulo   = (usaTipoCol ? partes[1] : partes[0] || "").trim();
        const condTxt  = (usaTipoCol ? partes[2] : partes[1] || "").trim();
        const asignadoLinea = (usaTipoCol ? partes[3] : partes[2] || "").trim();
        const asignadoExtra = asignadoLinea ? "" : findAssignedFromBlock(lineas, index, columnasMin);
        const asignado = asignadoLinea || asignadoExtra;

        if (!titulo) return;

        const tipoDetectado = normalizeTipo(tipoCol) || this.inferTipo(titulo);

        // Posición semilla en grid
        let x = baseX + col * saltoX;
        let y = baseY + fila * saltoY;
        fila++;
        if (fila >= maxFilas) { fila = 0; col++; }

        const nodo = Engine.createNode(tipoDetectado);

        // Semilla con clamp
        let clamped = clampPosition(x, y, nodo);
        nodo.x = clamped.x;
        nodo.y = clamped.y;

        const nodeDiv = document.getElementById(nodo.id);
        if (nodeDiv) {
            nodeDiv.style.left = nodo.x + "px";
            nodeDiv.style.top  = nodo.y + "px";
        }

        const nodoReal = Engine.getNode(nodo.id);
        if (nodoReal) {
            nodoReal.titulo    = titulo;
            nodoReal.asignadosGrupos = asignado ? [asignado] : [];

            if (asignado) {
                Engine.addGrupo(asignado);
            }

            if (nodeDiv) {
                const titleDiv = nodeDiv.querySelector(".node-title");
                if (titleDiv) titleDiv.innerText = nodoReal.titulo;
            }
        }

        mapaNodos.set(titulo, nodo.id);
    });

    // Re-render para que se vean los títulos recién puestos
    Renderer.clearAll();
    Engine.data.nodos.forEach(n => Renderer.renderNode(n));
        // --- Helper robusto para extraer el título de "Lanzar tarea ..."
        function extractTaskTitleFromAction(txt) {
            // quita el prefijo
            let rest = txt.replace(/^Lanzar tarea\s+/i, "").trim();

            // si viene entre comillas, quita SOLO la 1ª y la última del mismo tipo
            const pairs = { "'": "'", '"': '"', "“": "”", "‘": "’" };
            const qStart = rest.charAt(0);
            const qEnd   = pairs[qStart];
            if (qEnd && rest.endsWith(qEnd)) {
                rest = rest.slice(1, -1);
            }

            // deja apóstrofos internos tal cual (l'espera, d'informe, etc.)
            return rest.trim();
        }
    // ============================================================
    // SEGUNDA PASADA: CONEXIONES + CONDICIONES + CAMBIO DE ESTADO
    // ============================================================
    let nodoActualId = null;
    let condicionesPendientes = [];
    let ultimaConexionId = null;
    let branchIndex = 0;

    lineas.forEach(rawLine => {
        if (!rawLine.trim()) return;

        let linea = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "");

        // ---------------- LÍNEA DE ASUNTO (no indentada) ----------------
        if (isNodeLine(rawLine, columnasMin)) {
            const partes = parseCols(linea, columnasMin);
            if (isHeaderRow(partes)) return;
            const titulo   = (usaTipoCol ? partes[1] : partes[0] || "").trim();
            const condTxt  = (usaTipoCol ? partes[2] : partes[1] || "").trim();
            nodoActualId = mapaNodos.get(titulo) || null;
            condicionesPendientes = [];
            ultimaConexionId = null;
            branchIndex = 0;

            if (condTxt && /^Sólo si/i.test(condTxt)) {
                const match = condTxt.match(/^Sólo si\s+'([^']+)'\s+es igual a\s+'([^']+)'/i);
                if (match) {
                    condicionesPendientes.push({ campo: match[1], valor: match[2] });
                } else {
                    condicionesPendientes.push({ textoLibre: condTxt });
                }
            }
            return;
        }

        // ---------------- LÍNEAS DE ACCIÓN (indentadas) ----------------
        if (!nodoActualId) return;

        const txt = linea.trim();
        if (!isActionText(txt)) return;
        // 1) Condición
        if (/^Sólo si/i.test(txt)) {
            const match = txt.match(/^Sólo si\s+'([^']+)'\s+es igual a\s+'([^']+)'/i);
            if (match) {
                condicionesPendientes.push({ campo: match[1], valor: match[2] });
            } else {
                condicionesPendientes.push({ textoLibre: txt });
            }
            return;
        }

// 2) Lanzar tarea  (soporta comillas simples/dobles y apóstrofos internos)
if (/^Lanzar tarea\s+/i.test(txt)) {
    const destinoTitulo = extractTaskTitleFromAction(txt);
    const destinoId = mapaNodos.get(destinoTitulo);
    if (!destinoId) return;

    let fromPos = "bottom";
    let toPos   = "top";

    if (condicionesPendientes.length > 0) {
        if      (branchIndex === 0) fromPos = "right";
        else if (branchIndex === 1) fromPos = "left";
        else                        fromPos = "bottom";
        branchIndex++;
    }

    Engine.createConnection(nodoActualId, destinoId, fromPos, toPos);

    // id de la última conexión creada
    let connId = null;
    if (Engine.data.conexiones.length > 0) {
        connId = Engine.data.conexiones[Engine.data.conexiones.length - 1].id;
    }
    ultimaConexionId = connId;

    // Registrar subárbol para usar como grafo
    const p = Engine.getNode(nodoActualId);
    if (p) {
        p.outList = p.outList || [];
        p.outList.push({ id: destinoId, connId });
    }

    // Volcar condiciones en la conexión
    if (connId && condicionesPendientes.length > 0) {
        condicionesPendientes.forEach(cond => {
            Engine.updateConnectionCondition(
                connId,
                cond.campo || "",
                cond.valor || cond.textoLibre || ""
            );
        });
    }
    condicionesPendientes = [];
    return;
}

        // 3) Cambiar estado
        const cambiarMatch = txt.match(/^Cambiar estado del expediente a\s+'([^']+)'/i);
        if (cambiarMatch && ultimaConexionId) {
            Engine.updateConnectionCambioEstado(ultimaConexionId, cambiarMatch[1]);
            return;
        }
    });

    if (window.DataTesauro?.transformarCondicionesDesdeConexiones) {
        DataTesauro.transformarCondicionesDesdeConexiones(Engine.data.conexiones, {
            mostrarAlertas: false
        });
    }

    // -----------------------------------------------------------
    // LAYOUT POR NIVELES (vertical por profundidad; horizontal por “primos”)
    // -----------------------------------------------------------

    // Construir grafo a partir de outList
    const allNodes = Engine.data.nodos.slice();            // copia
    const idToNode = new Map(allNodes.map(n => [n.id, n]));
    const parentsOf = new Map();  // id -> Set(parentIds)
    const childrenOf = new Map(); // id -> Set(childIds)
    const appearanceIndex = new Map(); // orden de aparición estable

    allNodes.forEach((n, idx) => {
        appearanceIndex.set(n.id, idx);
        parentsOf.set(n.id, new Set());
        childrenOf.set(n.id, new Set());
    });

    allNodes.forEach(p => {
        (p.outList || []).forEach(entry => {
            const cid = entry.id || entry;
            if (!idToNode.has(cid)) return;
            childrenOf.get(p.id).add(cid);
            parentsOf.get(cid).add(p.id);
        });
    });

    // --- niveles por CAMINO MÁS LARGO (roots → node)
    const levelOf = new Map(); // id -> nivel (0..N)
    (function computeLevelsByLongestPath() {
        const memo = new Map();
        const visiting = new Set();

        function depth(id) {
            if (memo.has(id)) return memo.get(id);
            if (visiting.has(id)) { // ciclo/back-edge durante el cálculo
                memo.set(id, 0);
                return 0;
            }
            visiting.add(id);
            const ps = Array.from(parentsOf.get(id) || []);
            let d;
            if (ps.length === 0) {
                d = 0; // raíz
            } else {
                let m = 0;
                for (const pid of ps) m = Math.max(m, depth(pid));
                d = m + 1;
            }
            visiting.delete(id);
            memo.set(id, d);
            return d;
        }

        allNodes.forEach(n => levelOf.set(n.id, depth(n.id)));
    })();

    // Agrupar por nivel
    const levels = [];
    allNodes.forEach(n => {
        const lv = levelOf.get(n.id) || 0;
        if (!levels[lv]) levels[lv] = [];
        levels[lv].push(n.id);
    });

    // Orden en cada nivel (coherencia horizontal)
    function avgParentX(nid) {
        const ps = Array.from(parentsOf.get(nid) || []);
        if (!ps.length) return idToNode.get(nid).x;
        const sum = ps.reduce((acc, pid) => acc + (idToNode.get(pid)?.x || 0), 0);
        return sum / ps.length;
    }
    levels.forEach((arr) => {
        if (!arr) return;
        arr.sort((a, b) => {
            const ax = avgParentX(a), bx = avgParentX(b);
            if (ax !== bx) return ax - bx;
            return (appearanceIndex.get(a) || 0) - (appearanceIndex.get(b) || 0);
        });
    });

    // Colocar niveles dentro de los límites del canvas (vertical por profundidad, horizontal por “primos”)
    let B = getCanvasBounds();

    const utilPaddingX = 40;
    let utilLeftBase   = B.minX + utilPaddingX;
    let utilRightBase  = B.maxX - utilPaddingX;
    let baseUtilWidth  = Math.max(400, utilRightBase - utilLeftBase);

    // ⭐ CAMBIO: si un nivel tiene muchos “primos”, ensanchar el contenedor en X (no en Y)
    const MIN_SPACING = 220;
    const MAX_SPACING = 360;
    const SIDE_PAD    = 80;

    const widestCount = Math.max(...levels.filter(Boolean).map(arr => arr.length), 1);
    const neededLevelWidth = Math.max(
        baseUtilWidth,
        (widestCount - 1) * MIN_SPACING + 2 * SIDE_PAD
    );
    const neededContainerWidth = MARGIN + neededLevelWidth + MARGIN;

    if (container) {
        const currentW = container.scrollWidth || container.clientWidth || 0;
        if (neededContainerWidth > currentW) {
            container.style.width = `${neededContainerWidth}px`;
        }
    }
    const svg = document.getElementById("svgConnections");
    if (svg) {
        const svgW = Math.max(
            parseInt(svg.getAttribute("width") || "0", 10) || 0,
            container?.scrollWidth || container?.clientWidth || 0,
            neededContainerWidth
        );
        svg.setAttribute("width", `${svgW}`);
    }

    // Recalcular bounds tras posible cambio de ancho
    B = getCanvasBounds();
    utilLeftBase   = B.minX + utilPaddingX;
    utilRightBase  = B.maxX - utilPaddingX;
    baseUtilWidth  = Math.max(400, utilRightBase - utilLeftBase);

    // Vertical (profundidad)
    const TOP_PAD   = 20;
    const BOTTOM_PAD= 20;
    const GAP_Y     = 180;
    const startY    = B.minY + TOP_PAD;
    const levelGapY = GAP_Y;

    // Posicionar por niveles
    levels.forEach((ids, lv) => {
        if (!ids || !ids.length) return;
        const count = ids.length;

        // Ancho disponible en ESTE nivel (puede crecer según nº de “primos”)
        const levelWidth = Math.max(
            baseUtilWidth,
            (count - 1) * MIN_SPACING + 2 * SIDE_PAD
        );

        // Spacing horizontal en ESTE nivel
        const spacing = count > 1
            ? Math.min(MAX_SPACING, Math.max(MIN_SPACING, levelWidth / (count - 1)))
            : MIN_SPACING;

        const centerX = utilLeftBase + levelWidth / 2;
        const targetY = startY + lv * levelGapY;

        ids.forEach((nid, idx) => {
            const n = idToNode.get(nid);
            const { w, h } = getNodeSize(n);

            const targetCenterX = centerX - ((count - 1) * spacing) / 2 + idx * spacing;
            let tx = targetCenterX - w / 2;
            let ty = targetY;

            // ⭐ CAMBIO: ligero empuje a la derecha si hay back-edge a ancestro (sin cambiar nivel)
            const myLevel = levelOf.get(nid) || 0;
            const hasBackEdge = Array.from(childrenOf.get(nid) || [])
                .some(tid => (levelOf.get(tid) || 0) < myLevel);
            if (hasBackEdge) {
                tx += 140;
            }

            // clamp y aplicar
            const cl = clampPosition(tx, ty, n);
            n.x = cl.x; n.y = cl.y;

            const div = document.getElementById(n.id);
            if (div) { div.style.left = n.x + "px"; div.style.top = n.y + "px"; }
        });
    });

    // (Opcional) Forzar conexiones verticales
    /*
    Engine.data.conexiones.forEach(conn => {
        conn.fromPos = "bottom";
        conn.toPos = "top";
    });
    */

    // ===========================================================
    // NORMALIZAR Y AJUSTAR A ÁREA (fit + márgenes seguros)
    // ===========================================================
    (function normalizeAndFit() {

        if (!Engine.data.nodos.length) return;

        // 1) BBox actual
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        Engine.data.nodos.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + (n.width || 200));
            maxY = Math.max(maxY, n.y + (n.height || 100));
        });

        // 2) Desplazar si toca margen superior/izquierdo
        let shiftX = 0, shiftY = 0;
        const B2 = getCanvasBounds();

        if (minX < B2.minX) shiftX = B2.minX - minX;
        if (minY < B2.minY) shiftY = B2.minY - minY;

        if (shiftX !== 0 || shiftY !== 0) {
            Engine.data.nodos.forEach(n => {
                const trialX = n.x + shiftX;
                const trialY = n.y + shiftY;
                const cl = clampPosition(trialX, trialY, n);
                n.x = cl.x; n.y = cl.y;
                const div = document.getElementById(n.id);
                if (div) { div.style.left = n.x + "px"; div.style.top = n.y + "px"; }
            });
        }

        // 3) Fit si sobrepasa el área útil (con clamp posterior)
        let bboxMinX = Infinity, bboxMinY = Infinity, bboxMaxX = -Infinity, bboxMaxY = -Infinity;
        Engine.data.nodos.forEach(n => {
            bboxMinX = Math.min(bboxMinX, n.x);
            bboxMinY = Math.min(bboxMinY, n.y);
            bboxMaxX = Math.max(bboxMaxX, n.x + (n.width || 200));
            bboxMaxY = Math.max(bboxMaxY, n.y + (n.height || 100));
        });

        const width  = bboxMaxX - bboxMinX;
        const height = bboxMaxY - bboxMinY;

        const availW = (B2.maxX - B2.minX);
        const availH = (B2.maxY - B2.minY);

        const sW = availW / width;
        const sH = availH / height;
        const scale = Math.min(1, sW, sH);

        if (scale < 0.98) {
            Engine.data.nodos.forEach(n => {
                const sx = B2.minX + (n.x - bboxMinX) * scale;
                const sy = B2.minY + (n.y - bboxMinY) * scale;
                const cl = clampPosition(Math.round(sx), Math.round(sy), n);
                n.x = cl.x; n.y = cl.y;
                const div = document.getElementById(n.id);
                if (div) { div.style.left = n.x + "px"; div.style.top = n.y + "px"; }
            });
        }

        // 4) Centrar la vista
        if (area) {
            let vMinX = Infinity, vMinY = Infinity, vMaxX = -Infinity, vMaxY = -Infinity;
            Engine.data.nodos.forEach(n => {
                vMinX = Math.min(vMinX, n.x);
                vMinY = Math.min(vMinY, n.y);
                vMaxX = Math.max(vMaxX, n.x + (n.width || 200));
                vMaxY = Math.max(vMaxY, n.y + (n.height || 100));
            });
            const bboxW = vMaxX - vMinX;
            const bboxH = vMaxY - vMinY;
            area.scrollLeft = Math.max(0, (vMinX + bboxW/2) - area.clientWidth/2);
            area.scrollTop  = Math.max(0, (vMinY + bboxH/2) - area.clientHeight/2);
        }
    })();

    // Redibujar y guardar
    Renderer.redrawConnections();
    Engine.saveHistory();

    // Saneador final (idempotente)
    Engine.data.nodos.forEach(n => {
        const cl = clampPosition(n.x, n.y, n);
        if (cl.x !== n.x || cl.y !== n.y) {
            n.x = cl.x; n.y = cl.y;
            const div = document.getElementById(n.id);
            if (div) { div.style.left = n.x + "px"; div.style.top = n.y + "px"; }
        }
    });
}

};

if (typeof window !== "undefined") {
  window.ImportText = ImportText;
} else if (typeof global !== "undefined") {
  global.ImportText = ImportText;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ImportText };
}

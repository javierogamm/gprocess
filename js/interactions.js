/* ============================================================
   INTERACTIONS.JS
   Maneja:
   - Drag de nodos
   - Hover / selección
   - Creación de conexiones (desde handles)
   - Completar conexiones
============================================================ */

const Interactions = {

    GRID_SIZE: 20,

    draggingNode: null,
    dragOffsetX: 0,
    dragOffsetY: 0,

    connecting: false,
    connectStartNode: null,
    connectStartPos: null,
    connectStartX: 0,
    connectStartY: 0,
    reconnecting: false,
    reconnectConn: null,
    reconnectEnd: null,
    selectedNodes: new Set(),
    isSelecting: false,
    selectionStart: null,
    selectionRect: null,
    groupDragging: false,
    groupDragOffsets: new Map(),
    
    HANDLE_HIT_RADIUS: 22, // mayor para entrada fácil


    /* ========================================================
       REGISTRAR EVENTOS DEL NODO
    ======================================================== */
    registerNodeEvents(div, nodo) {

    /* --------- Selección del nodo --------- */
    div.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("handle")) return;
    
        // ⬆️ Multi-selección con Ctrl
        if (e.ctrlKey || e.metaKey) {
            if (Interactions.selectedNodes.has(nodo.id)) {
                Interactions.selectedNodes.delete(nodo.id);
                div.classList.remove("selected-multi");
            } else {
                Interactions.selectedNodes.add(nodo.id);
                div.classList.add("selected-multi");
            }
            if (Interactions.selectedNodes.size > 1) {
                UI.showGroupProperties();
            } else if (Interactions.selectedNodes.size === 1) {
                Engine.selectNode(nodo.id);
                Renderer.highlightConnectionsForNode(nodo.id);
            }
            return;
        }
    
        // ⬆️ Si haces clic normal en un nodo ya dentro del grupo → preparar drag grupal
        if (Interactions.selectedNodes.size > 1 && Interactions.selectedNodes.has(nodo.id)) {
            // No limpiar selección, mantenemos el grupo
        } else {
            // Clic normal → eliminación de selección múltiple previa
            Interactions.selectedNodes.forEach(id => {
                const nd = document.getElementById(id);
                if (nd) nd.classList.remove("selected-multi");
            });
            Interactions.selectedNodes.clear();
    
            // Añadir este nodo como único seleccionado
            Interactions.selectedNodes.add(nodo.id);
            div.classList.add("selected-multi");
        }
    
            Engine.selectNode(nodo.id);
            Renderer.highlightConnectionsForNode(Array.from(Interactions.selectedNodes));    });

    /* --------- Inicio de drag (individual o múltiple) --------- */
    div.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("handle")) return;

        const rectCanvas = Renderer.container.getBoundingClientRect();

        // 🟣 Drag grupal
        if (Interactions.selectedNodes.size > 1 && Interactions.selectedNodes.has(nodo.id)) {

                Interactions.groupDragging = true;
                Interactions.groupDragOffsets.clear();

                const startX = e.clientX - rectCanvas.left;
                const startY = e.clientY - rectCanvas.top;
                Interactions.groupStart = { x: startX, y: startY };

                // Guardar offset de cada nodo del grupo
                Interactions.selectedNodes.forEach(id => {
                    const n = Engine.getNode(id);
                    if (!n) return;
                    const dx = startX - n.x;
                    const dy = startY - n.y;
                    Interactions.groupDragOffsets.set(id, { dx, dy });
                });

                document.body.style.userSelect = "none";
                return;
            }

        // 🟢 Drag individual
        this.draggingNode = nodo.id;
        this.dragOffsetX = e.offsetX;
        this.dragOffsetY = e.offsetY;
        document.body.style.userSelect = "none";
    });

    /* --------- Handles: conexión o reconexión --------- */
    const handles = div.querySelectorAll(".handle");
    handles.forEach(handle => {
        handle.addEventListener("mousedown", (e) => {
            e.stopPropagation();

            // Si hay una conexión seleccionada → reconectar
            if (Engine.selectedConnectionId) {
                const conn = Engine.getConnection(Engine.selectedConnectionId);
                if (!conn) return;

                if (conn.from === nodo.id && conn.fromPos === handle.dataset.position) {
                    this.startReconnectExisting(conn, "from");
                } else if (conn.to === nodo.id && conn.toPos === handle.dataset.position) {
                    this.startReconnectExisting(conn, "to");
                }
            } else {
                // Crear nueva conexión
                this.startConnectionFromHandle(handle, nodo);
            }

            document.body.style.userSelect = "none";
        });
    });
},


    startSelection(e) {
        this.isSelecting = true;
        const rect = Renderer.container.getBoundingClientRect();
        this.selectionStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
        this.selectionRect = document.createElement("div");
        this.selectionRect.id = "selectionBox";
        Object.assign(this.selectionRect.style, {
            position: "absolute",
            border: "1px dashed #4f46e5",
            background: "rgba(79,70,229,0.1)",
            left: this.selectionStart.x + "px",
            top: this.selectionStart.y + "px",
            pointerEvents: "none",
            zIndex: 9999
        });
        Renderer.container.appendChild(this.selectionRect);
    },
    
    updateSelection(e) {
        if (!this.isSelecting || !this.selectionRect) return;
        const rect = Renderer.container.getBoundingClientRect();
        const x2 = e.clientX - rect.left;
        const y2 = e.clientY - rect.top;
    
        const x1 = this.selectionStart.x;
        const y1 = this.selectionStart.y;
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
    
        Object.assign(this.selectionRect.style, {
            left: left + "px",
            top: top + "px",
            width: width + "px",
            height: height + "px"
        });
    
        this.updateSelectedNodes(left, top, width, height);
    },
    
    updateSelectedNodes(x, y, w, h) {
        this.selectedNodes.clear();
        document.querySelectorAll(".node").forEach(div => {
            const r = div.getBoundingClientRect();
            const parent = Renderer.container.getBoundingClientRect();
            const nx = r.left - parent.left;
            const ny = r.top - parent.top;
            const nw = div.offsetWidth;
            const nh = div.offsetHeight;
    
            if (nx + nw > x && nx < x + w && ny + nh > y && ny < y + h) {
                this.selectedNodes.add(div.id);
                div.classList.add("selected-multi");
            } else {
                div.classList.remove("selected-multi");
            }
        });
    },
    
    endSelection() {
        if (this.selectionRect) this.selectionRect.remove();
        this.selectionRect = null;
        this.isSelecting = false;
    
        if (this.selectedNodes.size > 1) {
            Engine.selectedNodeId = null;
            Engine.selectedConnectionId = null;
            UI.showGroupProperties(); // 👈 mostrará solo color + slider + eliminar
            } else if (this.selectedNodes.size === 1) {
                const unico = Array.from(this.selectedNodes)[0];
                Engine.selectNode(unico);
                Renderer.highlightConnectionsForNode([unico]);
            } else if (this.selectedNodes.size > 1) {
                Renderer.highlightConnectionsForNode(Array.from(this.selectedNodes));
            }    
        },
        
/* ========================================================
   INICIAR RECONEXIÓN DE UNA LÍNEA EXISTENTE
======================================================== */
startReconnectExisting(conn, endType) {
    this.reconnecting = true;
    this.reconnectConn = conn;
    this.reconnectEnd = endType;

    // Coordenadas fijas del otro extremo
    const fixedSide = endType === "from" ? "to" : "from";
    const fixed = Renderer.getHandleCoordinates(conn[fixedSide], conn[fixedSide + "Pos"]);
    this.fixedX = fixed.x;
    this.fixedY = fixed.y;
},
    /* ========================================================
       INICIAR UNA CONEXIÓN DESDE UN HANDLE
    ======================================================== */
    startConnectionFromHandle(handle, nodo) {
        this.connecting = true;
        this.connectStartNode = nodo.id;
        this.connectStartPos = handle.dataset.position;
    
        const rect = handle.getBoundingClientRect();
        const canvasRect = Renderer.container.getBoundingClientRect();
    
        // 🧭 Guardar coordenadas RELATIVAS al contenedor, no absolutas
        this.connectStartX = rect.left + rect.width / 2 - canvasRect.left;
        this.connectStartY = rect.top + rect.height / 2 - canvasRect.top;
    
        Renderer.drawTempLine(
            this.connectStartX,
            this.connectStartY,
            this.connectStartX,
            this.connectStartY
        );
    },

    /* ========================================================
       COMPLETAR CONEXIÓN AL SOLTAR
    ======================================================== */
    /* ========================================================
   COMPLETAR CONEXIÓN AL SOLTAR (VERSIÓN CORREGIDA)
======================================================== */
tryCompleteConnection(e) {
    if (!this.connecting) return;

    // 🔹 Buscar el elemento bajo el puntero, ignorando el SVG temporal
    let target = document.elementFromPoint(e.clientX, e.clientY);

    // Si el puntero está sobre el SVG o un handle, subir hasta el nodo
    if (target && !target.classList.contains("node")) {
        target = target.closest(".node");
    }

    const nodeDiv = target;
    if (nodeDiv && nodeDiv.classList.contains("node")) {

        const toId = nodeDiv.id;
        if (toId !== this.connectStartNode) {

            // Buscar el handle de destino más cercano al punto de suelta
            const endPos = this.findClosestHandleToPoint(nodeDiv, e.clientX, e.clientY);

            if (endPos) {
                // Crear conexión en Engine
                Engine.createConnection(
                    this.connectStartNode,
                    toId,
                    this.connectStartPos,
                    endPos
                );

                // 🔥 Redibujar conexiones reales
                Renderer.redrawConnections();
                Engine.saveHistory();
            }
        }
    }

    // 🔚 Limpieza final
    this.connecting = false;
    this.connectStartNode = null;
    Renderer.clearTempLine();
},

/* ========================================================
   DETERMINAR HANDLE DESTINO MÁS CERCANO (restaurado)
======================================================== */
findClosestHandleToPoint(nodeDiv, x, y) {
    const handles = nodeDiv.querySelectorAll(".handle");
    let closest = null;
    let bestDist = Infinity;

    handles.forEach(h => {
        const r = h.getBoundingClientRect();
        const hx = r.left + r.width / 2;
        const hy = r.top + r.height / 2;
        const dist = Math.hypot(hx - x, hy - y);
        if (dist < bestDist) {
            bestDist = dist;
            closest = h.dataset.position;
        }
    });
    return closest;
},
/* ========================================================
   MOUSE MOVE → mover nodo / línea existente / línea nueva
======================================================== */
onMouseMove(e) {
    const rectCanvas = Renderer.container.getBoundingClientRect();
    const mx = e.clientX - rectCanvas.left;
    const my = e.clientY - rectCanvas.top;

    // 🔵 Reconexion activa
    if (this.reconnecting && this.reconnectConn) {
        const conn = this.reconnectConn;
        if (this.reconnectEnd === "from") conn._tempFrom = { x: mx, y: my };
        else conn._tempTo = { x: mx, y: my };
        Renderer.redrawConnectionsDynamic(conn, this.fixedX, this.fixedY, mx, my, this.reconnectEnd);
        return;
    }

    // 🟣 Drag grupal
    if (this.groupDragging && Interactions.groupDragOffsets.size > 0) {

        const rectCanvas = Renderer.container.getBoundingClientRect();
        const mx = e.clientX - rectCanvas.left;
        const my = e.clientY - rectCanvas.top;
    
        Interactions.selectedNodes.forEach(id => {
            const n = Engine.getNode(id);
            if (!n) return;
    
            const off = Interactions.groupDragOffsets.get(id);
            let newX = Math.round((mx - off.dx) / Interactions.GRID_SIZE) * Interactions.GRID_SIZE;
            let newY = Math.round((my - off.dy) / Interactions.GRID_SIZE) * Interactions.GRID_SIZE;
    
            n.x = newX;
            n.y = newY;
    
            const div = document.getElementById(id);
            if (div) {
                div.style.left = newX + "px";
                div.style.top = newY + "px";
            }
        });
    
        Renderer.redrawConnections();
        return;
    }
    

   // 🟢 Drag individual
if (this.draggingNode) {
    const nodo = Engine.getNode(this.draggingNode);
    if (nodo) {
        nodo.x = Math.round((mx - this.dragOffsetX) / this.GRID_SIZE) * this.GRID_SIZE;
        nodo.y = Math.round((my - this.dragOffsetY) / this.GRID_SIZE) * this.GRID_SIZE;
        const div = document.getElementById(nodo.id);
        div.style.left = nodo.x + "px";
        div.style.top = nodo.y + "px";
        Renderer.redrawConnections();

        // 🔥 Mantener highlight activo mientras mueves
        Renderer.highlightConnectionsForNode(Array.from(Interactions.selectedNodes));
    }
    return;
}
    // 🔵 Nueva conexión temporal
    if (this.connecting) {
        Renderer.drawTempLine(this.connectStartX, this.connectStartY, mx, my);
        return;
    }

    // 🟠 Selección activa
    if (this.isSelecting) {
        this.updateSelection(e);
    }
},


    /* ========================================================
       SOLTAR → FIN DRAG O FIN CONEXIÓN
    ======================================================== */
    onMouseUp(e) {
        // 🟣 FIN DE SELECCIÓN POR ARRASTRE
        if (this.isSelecting) {
            this.endSelection();
            return;
        }

        // 🟢 FIN DE DRAG GRUPAL
        if (this.groupDragging) {
            this.groupDragging = false;
            this.groupDragOffsets.clear();
            Renderer.redrawConnections();
            Engine.saveHistory();
            return;
        }
        if (this.draggingNode) {
            this.draggingNode = null;
            document.body.style.userSelect = "auto";
            Engine.saveHistory();
        }
    
        if (this.connecting) {
            this.tryCompleteConnection(e);
            document.body.style.userSelect = "auto";
        }
    
                if (this.reconnecting) {
            this.tryCompleteExistingReconnect(e);
            document.body.style.userSelect = "auto";
        }
    },

    tryCompleteExistingReconnect(e) {
        const conn = this.reconnectConn;
        if (!conn) return;
    
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const nodeDiv = target ? target.closest(".node") : null;
    
        if (nodeDiv) {
            const nodeId = nodeDiv.id;
            const pos = this.findClosestHandleToPoint(nodeDiv, e.clientX, e.clientY);
            if (pos) {
                conn[this.reconnectEnd] = nodeId;
                conn[this.reconnectEnd + "Pos"] = pos;
                Engine.saveHistory();
            }
        }
    
        this.reconnecting = false;
        this.reconnectConn = null;
        this.reconnectEnd = null;
        Renderer.redrawConnections();

        // 💡 Mantener highlight después de soltar el ratón
if (Interactions.selectedNodes.size > 0) {
    Renderer.highlightConnectionsForNode(Array.from(Interactions.selectedNodes));
}
    },
/* ========================================================
   INICIAR RECONEXIÓN DESDE UNA LÍNEA EXISTENTE
======================================================== */
startReconnectConnection(connId, endType) {
    const conn = Engine.getConnection(connId);
    if (!conn) return;

    this.reconnecting = true;
    this.reconnectConnId = connId;
    this.reconnectEnd = endType;
    this.originalConnection = { ...conn };

    // Determinar punto fijo
    const fixedSide = endType === "from" ? "to" : "from";
    const fixedCoords = Renderer.getHandleCoordinates(conn[fixedSide], conn[fixedSide + "Pos"]);
    this.fixedX = fixedCoords.x;
    this.fixedY = fixedCoords.y;

    // 🚨 Eliminar TODOS los elementos SVG de esa conexión
    const pathsToRemove = Renderer.svg.querySelectorAll(`#${connId}, #${connId}-textpath, text.connection-label`);
    pathsToRemove.forEach(el => el.remove());

    // Dibujar línea temporal inicial
    Renderer.drawTempLine(this.fixedX, this.fixedY, this.fixedX, this.fixedY);
}
,

/* ========================================================
   COMPLETAR RECONEXIÓN AL SOLTAR
======================================================== */
tryCompleteReconnect(e) {
    if (!this.reconnecting) return;

    const conn = Engine.getConnection(this.reconnectConnId);
    if (!conn) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const nodeDiv = target ? target.closest(".node") : null;

    Renderer.clearTempLine();

    if (nodeDiv) {
        const nodeId = nodeDiv.id;
        const pos = this.findClosestHandleToPoint(nodeDiv, e.clientX, e.clientY);

        if (pos) {
            // Actualizar el extremo reconectado
            conn[this.reconnectEnd] = nodeId;
            conn[this.reconnectEnd + "Pos"] = pos;
            Renderer.redrawConnections();
            Engine.saveHistory();
        } else {
            Object.assign(conn, this.originalConnection);
            Renderer.redrawConnections();
        }
    } else {
        Object.assign(conn, this.originalConnection);
        Renderer.redrawConnections();
    }

    this.reconnecting = false;
    this.reconnectConnId = null;
    this.originalConnection = null;
}
,

/* ============================================================
   RESALTAR CONEXIONES DE UN NODO SELECCIONADO (delegado)
============================================================ */
highlightConnectionsForNode(nodeId) {
    Renderer.highlightConnectionsForNode(nodeId); // *** CAMBIO ***
},
};

// ============================================================
// INICIAR SELECCIÓN AL CLICAR EN EL FONDO
// ============================================================
const area = document.getElementById("canvasArea");
if (area) {
    area.addEventListener("mousedown", (e) => {
        const clickedNode = e.target.closest(".node");
        const clickedHandle = e.target.classList.contains("handle");
        const clickedConnection = e.target.closest(".connection-line");
        if (!clickedNode && !clickedHandle && !clickedConnection && e.button === 0) {
            e.preventDefault();
            // 🔥 LIMPIAR SELECCIÓN MÚLTIPLE AL CLIC EN FONDO
            Interactions.selectedNodes.forEach(id => {
                const div = document.getElementById(id);
                if (div) div.classList.remove("selected-multi");
            });
            Interactions.selectedNodes.clear();
            Engine.selectedNodeId = null;
            Engine.selectedConnectionId = null;
            UI.clear();
// 🔸 Limpiar también los resaltados de conexiones
document.querySelectorAll(".connection-line").forEach(p => p.classList.remove("highlighted-conn")); // *** CAMBIO ***
            Interactions.startSelection(e);
        }
    });
    
}
/* ============================================================
   LISTENERS GLOBALES
============================================================ */

// ============================================================
// LISTENERS GLOBALES DE MOVIMIENTO Y SELECCIÓN
// ============================================================
window.addEventListener("mousemove", (e) => {
    if (Interactions.isSelecting) {
        Interactions.updateSelection(e);
    } else {
        Interactions.onMouseMove(e);
    }
});

window.addEventListener("mouseup", (e) => {
    if (Interactions.isSelecting) {
        Interactions.endSelection();
    }
    Interactions.onMouseUp(e);
});

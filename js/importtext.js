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
       IMPORTAR TEXTO
    ------------------------------------------ */
    import(texto) {

        const lineas = texto.split(/\r?\n/).map(l => l.trimEnd());
        const mapaNodos = new Map();

        let posicionY = 40;
        const saltoY = 160;
        const posicionX = 620;

        /* ----------------------------------------------------
            FUNCIÓN ÚNICA PARA DIVIDIR COLUMNAS (ROBUSTA)
        ---------------------------------------------------- */
        function parseCols(linea) {
            let cols = linea.split(/\t/g);
            if (cols.length < 5) cols = linea.split(/\s{2,}/g);
            while (cols.length < 5) cols.push("");
            return cols;
        }

        /* ============================================================
           PRIMERA PASADA: CREAR NODOS
        ============================================================ */
        lineas.forEach(rawLine => {

            if (!rawLine.trim()) return;

            const esAccion =
                rawLine.startsWith("\t") ||
                rawLine.startsWith("    ");

            if (esAccion) return;

            let linea = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "");

            const partes = parseCols(linea);

            const titulo   = (partes[0] || "").trim();
            const condTxt  = (partes[1] || "").trim();
            const asignado = (partes[2] || "").trim();
            const plazoTxt = (partes[3] || "").trim();

            if (!titulo) return;

            const tipoDetectado = this.inferTipo(titulo);

            const nodo = Engine.createNode(tipoDetectado);

            nodo.x = posicionX;
            nodo.y = posicionY;
            posicionY += saltoY;

            const nodeDiv = document.getElementById(nodo.id);
            if (nodeDiv) {
                nodeDiv.style.left = nodo.x + "px";
                nodeDiv.style.top = nodo.y + "px";
            }

            const nodoReal = Engine.getNode(nodo.id);

            if (nodoReal) {
                nodoReal.titulo      = titulo;
                nodoReal.asignadoA   = asignado;
              

                if (nodeDiv) {
                    const titleDiv = nodeDiv.querySelector(".node-title");
                    if (titleDiv) titleDiv.innerText = nodoReal.titulo;

                    const descDiv = nodeDiv.querySelector(".node-description");
                }
            }

            mapaNodos.set(titulo, nodo.id);
        });

        /* ---------------------------------------------------------
           RE-RENDER PARA QUE LOS TITULOS IMPORTADOS SE VEAN
        --------------------------------------------------------- */
        Renderer.clearAll();
        Engine.data.nodos.forEach(n => Renderer.renderNode(n));


        /* ============================================================
           SEGUNDA PASADA: CREAR CONEXIONES
        ============================================================ */

        let nodoActualId = null;
        let condicionesPendientes = [];
        let ultimaConexionId = null;
        let branchIndex = 0;

        lineas.forEach(rawLine => {

            if (!rawLine.trim()) return;

            const esAccion =
                rawLine.startsWith("\t") ||
                rawLine.startsWith("    ");

            let linea = rawLine.replace(/^\t+/, "").replace(/^ {4}/, "");

            /* ------------------------------------------
               LÍNEA DE ASUNTO (NO INDENTADA)
            ------------------------------------------ */
            if (!esAccion) {

                const partes = parseCols(linea);

                const titulo   = (partes[0] || "").trim();
                const condTxt  = (partes[1] || "").trim();
                const asignado = (partes[2] || "").trim();
                const plazoTxt = (partes[3] || "").trim();

                nodoActualId = mapaNodos.get(titulo) || null;
                condicionesPendientes = [];
                ultimaConexionId = null;
                branchIndex = 0;

                if (condTxt && /^Sólo si/i.test(condTxt)) {

                    const match = condTxt.match(/^Sólo si\s+'([^']+)'\s+es igual a\s+'([^']+)'/i);

                    if (match) {
                        condicionesPendientes.push({
                            campo: match[1],
                            valor: match[2]
                        });
                    } else {
                        condicionesPendientes.push({
                            textoLibre: condTxt
                        });
                    }
                }

                return;
            }

            /* ------------------------------------------
               LÍNEAS DE ACCIÓN (INDENTADAS)
            ------------------------------------------ */

            if (!nodoActualId) return;

            const txt = linea.trim();

            // CONDICIÓN
            if (/^Sólo si/i.test(txt)) {

                const match = txt.match(/^Sólo si\s+'([^']+)'\s+es igual a\s+'([^']+)'/i);

                if (match) {
                    condicionesPendientes.push({
                        campo: match[1],
                        valor: match[2]
                    });
                } else {
                    condicionesPendientes.push({
                        textoLibre: txt
                    });
                }
                return;
            }

            // LANZAR TAREA
            const lanzarMatch = txt.match(/^Lanzar tarea\s+'([^']+)'/i);

            if (lanzarMatch) {

                const destinoTitulo = lanzarMatch[1];
                const destinoId = mapaNodos.get(destinoTitulo);

                if (!destinoId) return;

                let fromPos = "bottom";
                let toPos = "top";

                if (condicionesPendientes.length > 0) {
                    if      (branchIndex === 0) fromPos = "right";
                    else if (branchIndex === 1) fromPos = "left";
                    else                        fromPos = "bottom";
                    branchIndex++;
                }

                Engine.createConnection(nodoActualId, destinoId, fromPos, toPos);

                // id de la conexión recién creada
                let connId = null;
                if (Engine.data.conexiones.length > 0) {
                    connId = Engine.data.conexiones[Engine.data.conexiones.length - 1].id;
                }
                ultimaConexionId = connId;
                
                // registrar en outList: nodo hijo + conexión
                let p = Engine.getNode(nodoActualId);
                if (p) {
                    p.outList = p.outList || [];
                    p.outList.push({
                        id: destinoId,
                        connId: connId
                    });
                }
                
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

            // CAMBIAR ESTADO
            const cambiarMatch = txt.match(/^Cambiar estado del expediente a\s+'([^']+)'/i);

            if (cambiarMatch && ultimaConexionId) {
                Engine.updateConnectionCambioEstado(
                    ultimaConexionId,
                    cambiarMatch[1]
                );
                return;
            }

        });

        // -----------------------------------------------------------
        // Mover un nodo y TODO su subárbol (hijo + nietos, etc.)
        // -----------------------------------------------------------
        function moverSubarbol(nodo, dx, dy) {
            if (!nodo) return;

            nodo.x += dx;
            nodo.y += dy;

            const div = document.getElementById(nodo.id);
            if (div) {
                div.style.left = nodo.x + "px";
                div.style.top  = nodo.y + "px";
            }

            if (nodo.outList && nodo.outList.length > 0) {
                nodo.outList.forEach(entry => {
                    const childId = entry.id || entry;
                    const hijo = Engine.getNode(childId);
                    if (hijo) {
                        moverSubarbol(hijo, dx, dy);
                    }
                });
            }
        }

        // ===========================================================
        // DISTRIBUIR NODOS HIJOS EN HORIZONTAL BAJO SU NODO PADRE
        // - Hijos con nietos (outList no vacía) → posiciones centrales, handler "bottom"
        // - Hijos hoja (sin outList) → extremos, handler "left"/"right"
        // ===========================================================
        Engine.data.nodos.forEach(padre => {

            if (!padre.outList || padre.outList.length < 2) return;

            const hijos = padre.outList
                .map(entry => Engine.getNode(entry.id || entry))
                .filter(Boolean);

            const count = hijos.length;
            if (count < 2) return;

            // Separar hijos con nietos y sin nietos
            const conNietos = [];
            const sinNietos = [];

            hijos.forEach(h => {
                if (h.outList && h.outList.length > 0) {
                    conNietos.push(h);
                } else {
                    sinNietos.push(h);
                }
            });

            const centralSet = new Set(conNietos);

            // Construir array ordenado: con nietos en el centro
            const ordered = new Array(count);
            const k = conNietos.length;
            let centerStart = Math.floor((count - k) / 2);

            conNietos.forEach((h, idx) => {
                ordered[centerStart + idx] = h;
            });

            let leafIdx = 0;
            for (let i = 0; i < count; i++) {
                if (!ordered[i]) {
                    ordered[i] = sinNietos[leafIdx++];
                }
            }

            // Mapa hijoId -> connId
            const connMap = new Map();
            padre.outList.forEach(entry => {
                const childId = entry.id || entry;
                if (entry.connId) {
                    connMap.set(childId, entry.connId);
                }
            });

            const padreWidth = padre.width || 200;
            const cx = padre.x + padreWidth / 2;
            const baseY = padre.y + padre.height + 60;
            const spacing = 260; // separación horizontal

            ordered.forEach((dest, index) => {
                const destWidth = dest.width || 200;

                const targetCenterX = cx - ((count - 1) * spacing) / 2 + index * spacing;
                const targetX = targetCenterX - destWidth / 2;
                const targetY = baseY;

                const dx = targetX - dest.x;
                const dy = targetY - dest.y;

                // 🔥 Mover el hijo Y TODO SU SUBÁRBOL (nietos, etc.)
                moverSubarbol(dest, dx, dy);

                // Ajustar handler de salida según posición
                const connId = connMap.get(dest.id);
                if (connId) {
                    const conn = Engine.data.conexiones.find(c => c.id === connId);
                    if (conn) {
                        let side;
                        const isCentral = centralSet.has(dest);

                        if (isCentral) {
                            side = "bottom";
                        } else {
                            // si queda a la izda/dcha del centro del padre
                            if (targetCenterX < cx) {
                                side = "left";
                            } else {
                                side = "right";
                            }
                        }

                        conn.fromPos = side; // usar handler correcto
                    }
                }
            });
        });

        Renderer.redrawConnections();
        Engine.saveHistory();


    }
};
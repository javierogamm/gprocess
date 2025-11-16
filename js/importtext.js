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

                let connId = null;
                if (Engine.data.conexiones.length > 0) {
                    connId = Engine.data.conexiones[Engine.data.conexiones.length - 1].id;
                }

                ultimaConexionId = connId;

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

        Renderer.redrawConnections();
        Engine.saveHistory();
    }
};

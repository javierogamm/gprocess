
/* ============================================================
   EXPORTAR DIAGRAMA A CSV / EXCEL
============================================================ */
// Compatibilidad Node para tests: asegurar Engine está disponible
if (typeof module !== "undefined" && module.exports && typeof Engine === "undefined") {
  const core = require("./engine.core.js");
  global.Engine = core.Engine;
}

Engine.exportToCSV = function() {

    // --- 1️⃣ Nodos ---
    const nodosHeader = ["id", "tipo", "titulo", "descripcion", "pregunta", "x", "y", "width", "height"];
    const nodosRows = this.data.nodos
    .filter(n => n.tipo !== "decisionR")
    .map(n => [        n.id,
        n.tipo,
        (n.titulo || "").replace(/\n/g, " "),
        (n.descripcion || "").replace(/\n/g, " "),
        (n.pregunta || "").replace(/\n/g, " "),
        n.x,
        n.y,
        n.width,
        n.height
    ]);

    const nodosCSV = [nodosHeader.join(";"), ...nodosRows.map(r => r.join(";"))].join("\n");

    // --- 2️⃣ Conexiones ---
    const connHeader = ["id", "from", "to", "fromPos", "toPos", "condicionNombre", "condicionValor"];
    const connRows = this.data.conexiones.map(c => [
        c.id,
        c.from,
        c.to,
        c.fromPos,
        c.toPos,
        (c.condicionNombre || "").replace(/\n/g, " "),
        (c.condicionValor || "").replace(/\n/g, " ")
    ]);

    const connCSV = [connHeader.join(";"), ...connRows.map(r => r.join(";"))].join("\n");

    // --- 3️⃣ Crear ZIP temporal o dos archivos separados ---
    const zip = new Blob(
        [ 
            "### NODOS ###\n" + nodosCSV + "\n\n### CONEXIONES ###\n" + connCSV
        ], 
        { type: "text/csv;charset=utf-8;" }
    );

    // --- 4️⃣ Forzar descarga ---
    const url = URL.createObjectURL(zip);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Diagrama.csv";
    a.click();
    URL.revokeObjectURL(url);

    console.log("📤 Diagrama exportado correctamente (Diagrama.csv)");
};
/* ============================================================
   IMPORTAR DIAGRAMA DESDE CSV (formato exportToCSV)
============================================================ */
Engine.importFromCSV = async function(file) {
    try {
        // 1️⃣ Leer contenido del archivo
        const text = await file.text();

        // 2️⃣ Separar secciones
        const [nodosPart, conexionesPart] = text.split("### CONEXIONES ###");
        const nodosLines = nodosPart.split("\n").filter(l => l && !l.startsWith("### NODOS ###"));
        const connLines = conexionesPart ? conexionesPart.split("\n").filter(l => l.trim()) : [];

        // 3️⃣ Parsear NODOS
        const nodosHeader = nodosLines[0].split(";");
        const nodos = nodosLines.slice(1).map(line => {
            const cols = line.split(";");
            const obj = {};
            nodosHeader.forEach((h, i) => obj[h] = cols[i]);
            return {
                id: obj.id,
                tipo: obj.tipo,
                titulo: obj.titulo || "",
                descripcion: obj.descripcion || "",
                pregunta: obj.pregunta || "",
                x: parseFloat(obj.x) || 100,
                y: parseFloat(obj.y) || 100,
                width: parseFloat(obj.width) || 200,
                height: parseFloat(obj.height) || 100,
               
            };
        });

        // 4️⃣ Parsear CONEXIONES
        const conn = [];
        if (connLines.length > 1) {
            const connHeader = connLines[0].split(";");
            connLines.slice(1).forEach(line => {
                const cols = line.split(";");
                const obj = {};
                connHeader.forEach((h, i) => obj[h] = cols[i]);
                if (obj.id && obj.from && obj.to) {
                    conn.push({
                        id: obj.id,
                        from: obj.from,
                        to: obj.to,
                        fromPos: obj.fromPos,
                        toPos: obj.toPos,
                        condicionNombre: obj.condicionNombre || "",
                        condicionValor: obj.condicionValor || ""
                    });
                }
            });
        }

        // 5️⃣ Cargar en memoria
        this.data = { nodos, conexiones: conn };
        this.asignaciones = { grupos: new Set(), usuarios: new Set() };

        // 6️⃣ Redibujar todo
        Renderer.clearAll();
        nodos.forEach(n => Renderer.renderNode(n));
        conn.forEach(c => Renderer.drawConnection(c));

        UI.clear();
        this.saveHistory();

        console.log("✅ Diagrama importado correctamente desde CSV");
    } catch (err) {
        console.error("❌ Error importando CSV:", err);
        alert("Error importando el CSV. Ver consola para detalles.");
    }
};

// Exportar Engine para entornos de prueba en Node
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Engine };
}
/* ============================================================
   EXPORTAR TAREAS Y CONDICIONES (formato flujo normalizado)
============================================================ */
Engine.exportFlujoCSV = function() {

        // === PEDIR NOMBRE DE ENTIDAD (dentro de ENGINE) ===
        let entidad = prompt("Informe nombre de la entidad a configurar:", Engine.fichaProyecto.entidad || "");
        if (!entidad) entidad = "Informe nombre de la entidad a configurar";

        // guardar en ficha
        Engine.fichaProyecto.entidad = entidad;
    // --- 1️⃣ Ordenar visualmente los nodos (por Y y luego X)
    const sortedNodes = [...this.data.nodos].sort((a, b) => {
        if (a.y === b.y) return a.x - b.x;
        return a.y - b.y;
    });

    // --- 2️⃣ Crear TAREAS (formato ampliado oficial) ---
    const headerTareas = [
        "Nombre Entidad","Nombre Actividad","Nombre Procedimiento","Sobrescribir",
        "Tipo Tarea","Nombre Tarea","Días Alerta","Tipo de días","Prioritario",
        "Descripción Tarea","Asignado a Usuario - Nombre","Asignado a Grupo - Nombre",
        "Asignado a responsables exp","Asignado a unidad gestora","Asignado a Usuario - Abre Tarea",
        "Asignado a Usuario - Abre Exp","Permite reasignar","Inicio Inmediato","Condición inicio inmediato",
        "Nombre tesauro","Condición tesauro","Valor tesauro","Inicio manual","Acceso temporal Expediente",
        "Plazo Trámite","Plazo Justificante","Tipo documental","Tipo Circuito Resolución","Nombre Circuito Resolución",
        "Órgano Circuito Resolución","Cambiar estado","Nombre Nuevo Estado","Generar plantilla","Formato plantilla",
        "Cargar documento","Circuito documento","Titulo documento","Tipo documental documento","Texto plantilla",
        "Eliminar","Finalizar en plazo","Plazo - Número de días","Plazo - Tipo de días"
    ];

    const tareasRows = sortedNodes.map((n) => {
        let tipoTarea = n.tipo.toLowerCase();
        if (tipoTarea === "circuito") tipoTarea = "Libre";
        else if (tipoTarea === "decisión" || tipoTarea === "decision") tipoTarea = "Formulario";
        else tipoTarea = capitalizeFirst(tipoTarea);
    
        // ⭐ Concatenar múltiples asignaciones con " -- "
        const grupos = n.asignadosGrupos || [];
        const usuarios = n.asignadosUsuarios || [];

        const asignadosTexto = grupos.join(" -- ");
        const esUnidadGestora = grupos.some(g => g.toLowerCase() === "unidad gestora");
        const asignadoGrupo = esUnidadGestora ? "" : asignadosTexto;
        const asignadoUG = esUnidadGestora ? "Sí" : "No";
        const asignadoUsuario = usuarios.join(" -- ");
        const inicioManual = n.tareaManual ? "Sí" : "No";
    
        // 🧩 Reglas específicas por tipo
        const esPlazo = n.tipo.toLowerCase() === "plazo";
        const esDocumento = n.tipo.toLowerCase() === "documento";
    
        const plazoTramite = esPlazo ? "Plazo" : "";
        const plazoJustificante = esPlazo ? "No" : "";
        const tipoDocumental = esPlazo ? "Certificado" : "";
    
        const generarPlantilla = esDocumento ? "No" : "";
        const cargarDocumento = esDocumento ? "Sí" : "";
    
        // 🟢 Fila alineada con headerTareas
        return [
            this.fichaProyecto.entidad || "Informe nombre de la entidad a configurar",
            this.fichaProyecto.actividad || "", // Nombre Actividad
            this.fichaProyecto.procedimiento || "", // Nombre Procedimiento
            "No", // **Sobrescribir SIEMPRE 'No'**
            tipoTarea, // Tipo Tarea
            cleanText(n.titulo || ""), // Nombre Tarea
            "", // Días Alerta
            "", // Tipo de días
            "No", // Prioritario
            "Sin descripción", // Descripción Tarea
            asignadoUsuario, // Asignado a Usuario - Nombre
            asignadoGrupo, // Asignado a Grupo - Nombre
            "No", // Asignado a responsables exp
            asignadoUG, // Asignado a unidad gestora
            "No", // Asignado a Usuario - Abre Tarea
            "No", // Asignado a Usuario - Abre Exp
            "Sí", // Permite reasignar
            "No", // Inicio inmediato
            "", // Condición inicio inmediato
            "", "", "", // Nombre tesauro / Condición / Valor tesauro
            inicioManual, // Inicio manual
            "Sí", // Acceso temporal expediente
            plazoTramite, // Plazo Trámite
            plazoJustificante, // Plazo Justificante
            tipoDocumental, // Tipo documental
            "", // Tipo Circuito Resolución
            "", // Nombre Circuito Resolución
            "", // Órgano Circuito Resolución
            "No", // Cambiar estado
            "", // Nombre nuevo estado
            generarPlantilla, // ✅ Generar plantilla (si documento → No)
            "", // Formato plantilla
            cargarDocumento, // ✅ Cargar documento (si documento → No)
            "", // Circuito documento
            "", // Título documento
            "", // Tipo documental documento
            (n.tipo.toLowerCase() === "formulario" ? "Pendiente configurar plantilla" : ""), // Texto plantilla
            "", // Eliminar
            "", // Finalizar en plazo
            "", // Plazo - Número de días
            ""  // Plazo - Tipo de días
        ];
    });
            const csvTareas = [headerTareas.join(";"), ...tareasRows.map(r => r.join(";"))].join("\n");

    // --- 3️⃣ Crear CONDICIONES (formato oficial de condiciones de flujo) ---
    const headerConds = [
        "Nombre Entidad",
        "Nombre Actividad",
        "Nombre Procedimiento",
        "Nombre Tarea",
        "Eliminar bloques existentes",
        "Id Bloque",
        "Bloque",
        "Nombre tesauro",
        "Condición",
        "Valor",
        "Acción",
        "Estado/Tarea"
    ];

    const condRows = [];

    this.data.conexiones.forEach((c) => {
        const fromNode = this.data.nodos.find(n => n.id === c.from);
        const toNode = this.data.nodos.find(n => n.id === c.to);
        if (!fromNode || !toNode) return;

        const nombreOrigen = cleanText(fromNode.titulo || "");
        const nombreDestino = cleanText(toNode.titulo || "");

        // Determinar bloque condicional
        const bloque = (c.condicionNombre || c.condicionValor) ? "Sólo si" : "En todo caso";
        const idBloque = bloque === "Sólo si"
            ? (condRows.filter(r => r[3] === nombreOrigen && r[6] === "Sólo si").length + 1)
            : "";

        // 🟩 1️⃣ Fila normal → Lanzar tarea
        condRows.push([
            this.fichaProyecto.entidad || "Informe nombre de la entidad a configurar", // Nombre Entidad
            this.fichaProyecto.actividad || "", // Nombre Actividad
            this.fichaProyecto.procedimiento || "", // Nombre Procedimiento
            nombreOrigen, // Nombre Tarea (origen)
            "", // Eliminar bloques existentes
            idBloque, // Id Bloque
            bloque, // Bloque ("Sólo si" / "En todo caso")
            cleanText(c.condicionNombre || ""), // Nombre tesauro
            (c.condicionNombre || c.condicionValor) ? "Es igual a" : "", // Condición
            cleanText(c.condicionValor || ""), // Valor
            "Lanzar tarea", // Acción
            nombreDestino // Estado/Tarea (tarea destino)
        ]);

        // 🟨 2️⃣ Si hay cambio de estado → segunda fila
        if (c.cambioEstado && c.cambioEstado.trim() !== "") {
            condRows.push([
                this.fichaProyecto.entidad || "Informe nombre de la entidad a configurar", // Nombre Entidad
                this.fichaProyecto.actividad || "", // Nombre Actividad
                this.fichaProyecto.procedimiento || "", // Nombre Procedimiento
                nombreOrigen, // Nombre Tarea (origen)
                "", // Eliminar bloques existentes
                idBloque, // mismo bloque
                bloque,
                cleanText(c.condicionNombre || ""),
                (c.condicionNombre || c.condicionValor) ? "Es igual a" : "",
                cleanText(c.condicionValor || ""),
                "Cambiar estado del expediente a", // ✅ Acción alternativa
                cleanText(c.cambioEstado) // ✅ Estado/Tarea = texto del nuevo estado
            ]);
        }
    });

    const csvConds = [headerConds.join(";"), ...condRows.map(r => r.join(";"))].join("\n");

    // --- 4️⃣ Descargar ambos archivos ---
    downloadCSV(csvTareas, "Tareas.csv");
    downloadCSV(csvConds, "Condiciones.csv");

    console.log("📤 Exportación completada: Tareas.csv + Condiciones.csv");

    // --- Helpers internos ---
    function cleanText(t) {
        return (t || "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }

    function cleanHTML(html) {
        if (!html) return "";
        return html
            .replace(/<\/?[^>]+(>|$)/g, "") // elimina todas las etiquetas HTML
            .replace(/\s+/g, " ")           // elimina espacios duplicados
            .trim();
    }

    function capitalizeFirst(txt) {
        if (!txt) return "";
        return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
    }

    function downloadCSV(content, name) {
        // 🔥 Añadimos BOM UTF-8 para compatibilidad total con Excel
        const bom = "\uFEFF";
        const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    }
};

/* ============================================================
   IMPORTAR FLUJO DESDE CSV NORMALIZADO (Tareas.csv + Condiciones.csv)
============================================================ */
Engine.importFlujoCSV = async function(files) {
    try {
        let tareasFile = null;
        let condicionesFile = null;

        // 1️⃣ Identificar qué archivo es cuál
        for (const f of files) {
            const name = f.name.toLowerCase();
            if (name.includes("tarea")) tareasFile = f;
            if (name.includes("cond")) condicionesFile = f;
        }

        if (!tareasFile || !condicionesFile) {
            alert("❌ Debes seleccionar ambos archivos: Tareas.csv y Condiciones.csv");
            return;
        }

        // 2️⃣ Leer contenido de ambos CSV
        const tareasText = await tareasFile.text();
        const condicionesText = await condicionesFile.text();

        // 3️⃣ Parsear TAREAS
        const tareasLines = tareasText.split(/\r?\n/).filter(l => l.trim());
        const headerT = tareasLines[0].split(";");
        const tareas = tareasLines.slice(1).map(line => {
            const cols = line.split(";");
            const obj = {};
            headerT.forEach((h, i) => obj[h.trim()] = cols[i] ? cols[i].trim() : "");
            return obj;
        });

        // 4️⃣ Parsear CONDICIONES
        const condLines = condicionesText.split(/\r?\n/).filter(l => l.trim());
        const headerC = condLines[0].split(";");
        const condiciones = condLines.slice(1).map(line => {
            const cols = line.split(";");
            const obj = {};
            headerC.forEach((h, i) => obj[h.trim()] = cols[i] ? cols[i].trim() : "");
            return obj;
        });

        // 5️⃣ Reiniciar diagrama actual
        this.saveHistory();
        this.data = { nodos: [], conexiones: [] };
        this.asignaciones = { grupos: new Set(), usuarios: new Set() };
        Renderer.clearAll();

        // 6️⃣ Crear NODOS (con limpieza del tipo)
        const nodosMap = {}; // nombre tarea → id nodo
        const baseX = 200;
        const baseY = 100;
        const stepY = 180;
        const stepX = 250;

        const parseAsignaciones = (valor = "") => {
            return valor
                .split(/--/)
                .map(v => v.trim())
                .filter(Boolean);
        };

        tareas.forEach((t, i) => {
            const rawTipo = (t["Tipo Tarea"] || "tarea").trim();
            const tipoSafe = rawTipo.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
            const tipoVisible = rawTipo.charAt(0).toUpperCase() + rawTipo.slice(1).toLowerCase();

            const gruposImportados = parseAsignaciones(t["Asignado a Grupo - Nombre"] || "");
            const usuariosImportados = parseAsignaciones(t["Asignado a Usuario - Nombre"] || "");

            const incluyeUG = (t["Asignado a unidad gestora"] || "")
                .toLowerCase()
                .startsWith("s");

            if (incluyeUG && !gruposImportados.includes("Unidad gestora")) {
                gruposImportados.push("Unidad gestora");
            }

            const n = {
                id: "n" + this.generateId(),
                tipo: tipoSafe,
                tipoVisible: tipoVisible,
                titulo: t["Nombre Tarea"] || ("Tarea " + (i + 1)),
                annex: "",
                pregunta: "",
                x: baseX + (i % 3) * stepX,
                y: baseY + Math.floor(i / 3) * stepY,
                width: 200,
                height: 100,
                                tareaManual: (t["¿Tarea Manual?"] || "").toLowerCase().startsWith("s"),
                asignadosGrupos: Array.from(new Set(gruposImportados)),
                asignadosUsuarios: Array.from(new Set(usuariosImportados))
            };

            n.asignadosGrupos.forEach(g => this.addGrupo(g));
            n.asignadosUsuarios.forEach(u => this.addUsuario(u));

            this.data.nodos.push(n);
            nodosMap[n.titulo.trim()] = n.id;
        });

        // Renderizar todos los nodos
        this.data.nodos.forEach(n => Renderer.renderNode(n));

        // 7️⃣ Crear CONEXIONES
        condiciones.forEach((c, i) => {
            const origen = (c["Nombre Tarea"] || "").trim();
            const destino = (c["Estado/Tarea"] || "").trim();
            if (!origen || !destino) return;

            const fromId = nodosMap[origen];
            const toId = nodosMap[destino];
            if (!fromId || !toId) {
                console.warn(`⚠️ No se encontró nodo para conexión ${origen} → ${destino}`);
                return;
            }

            const nombreCond = c["Nombre tesauro"] || c["Condición"] || "";
            const valorCond = c["Valor"] || "";

            const conn = {
                id: "c" + this.generateId(),
                from: fromId,
                to: toId,
                fromPos: "bottom",
                toPos: "top",
                condicionNombre: nombreCond,
                condicionValor: valorCond
            };

            this.data.conexiones.push(conn);
        });

        // 8️⃣ Dibujar conexiones
        this.data.conexiones.forEach(c => Renderer.drawConnection(c));

        // 9️⃣ Guardar estado y limpiar paneles
        this.saveHistory();
        UI.clear();

        console.log("✅ Flujo importado correctamente desde CSV normalizado.");
        alert("✅ Flujo importado correctamente desde Tareas + Condiciones.");

    } catch (err) {
        console.error("❌ Error al importar flujo normalizado:", err);
        alert("Error al importar el flujo. Revisa la consola para más detalles.");
    }
};
// Escucha clic del botón (solo si existe)  **CAMBIO**
const btnImportFlujo = document.getElementById("btnImportFlujo");
if (btnImportFlujo) {                              // **CAMBIO**
    btnImportFlujo.addEventListener("click", () => {
        const input = document.getElementById("inputFlujoCSV");
        if (!input) return;                        // **CAMBIO** seguridad extra
        input.value = ""; // limpiar selección anterior
        input.click();    // abrir selector de archivos
    });
}

// Escucha selección de archivos CSV (solo si existe)  **CAMBIO**
const inputFlujoCSV = document.getElementById("inputFlujoCSV");
if (inputFlujoCSV) {                               // **CAMBIO**
    inputFlujoCSV.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        Engine.importFlujoCSV(files); // 👈 usa la función que te di antes
    });
}

// VISUALIZACIÓN DE TAREAS
document.getElementById("btnVerCSV").addEventListener("click", () => {
    Engine.showCSVPreview();
});

Engine.buildCSVPreviewHTML = function(data, options = {}) {
    const nodos = data?.nodos || [];
    const conexionesData = data?.conexiones || [];
    const nodeMap = new Map(nodos.map(n => [n.id, n]));
    const orderValue = (n, fallback) =>
        typeof n.__order === "number" ? n.__order : (fallback ?? 0);

    const sortedNodes = [...nodos]
        .filter(n => n.tipo !== "decisionR")
        .sort((a, b) => {
            const ay = orderValue(a, a.y || 0);
            const by = orderValue(b, b.y || 0);
            if (ay !== by) return ay - by;
            return (a.x || 0) - (b.x || 0);
        });

    const tareas = sortedNodes.map((n, i) => {
        const grupos = (n.asignadosGrupos || []).join(" -- ") || "";
        const usuarios = (n.asignadosUsuarios || []).join(" -- ") || "";
        const asignados = [grupos, usuarios].filter(Boolean).join(" / ");

        return `
        <tr>
            <td>${i + 1}</td>
            <td>${n.tipo.charAt(0).toUpperCase() + n.tipo.slice(1).toLowerCase()}</td>
            <td>${n.titulo || ""}</td>
            <td>${n.tareaManual ? "Sí" : "No"}</td>
            <td>${asignados || "Sin asignar"}</td>
        </tr>
    `;
    }).join("");

    const conexiones = conexionesData.map((c) => {
        const from = nodeMap.get(c.from);
        const to = nodeMap.get(c.to);
        return `
            <tr>
                <td>${from?.titulo || ""}</td>
                <td>${(c.condicionNombre || c.condicionValor) ? "Sólo si" : "En todo caso"}</td>
                <td>${c.condicionNombre || ""}</td>
                <td>${c.condicionValor || ""}</td>
                <td>${to?.titulo || ""}</td>
            </tr>
        `;
    }).join("");

    let html = `
    <h2 style="margin-top:0; text-align:center;">
        🧾 ${options.procedimiento || "Sin nombre de procedimiento"}
    </h2>

    <h3>📋 Tareas</h3>
    <table>
        <thead>
            <tr><th>#</th><th>Tipo</th><th>Nombre</th><th>Manual</th><th>Asignado A</th></tr>
        </thead>
        <tbody>${tareas}</tbody>
    </table>

    <h3>🔗 Condiciones</h3>
    <table>
        <thead>
            <tr><th>Tarea Origen</th><th>Bloque</th><th>Condición</th><th>Valor</th><th>Tarea Destino</th></tr>
        </thead>
        <tbody>${conexiones}</tbody>
    </table>

    <h3>🟢 Cambios de estado</h3>
    <table>
        <thead>
            <tr><th>Tarea Origen</th><th>Condición</th><th>Estado adquirido</th></tr>
        </thead>
        <tbody>
            ${conexionesData
                .filter(c => c.cambioEstado && c.cambioEstado.trim() !== "")
                .map(c => {
                    const from = nodeMap.get(c.from);
                    const condTxt = [c.condicionNombre, c.condicionValor]
                        .filter(Boolean).join(" ");
                    return `
                        <tr>
                            <td>${from?.titulo || ""}</td>
                            <td>${condTxt || "En todo caso"}</td>
                            <td>${c.cambioEstado}</td>
                        </tr>
                    `;
                }).join("")}
        </tbody>
    </table>
`;

    const agrupadoGrupo = {};
    nodos.forEach(n => {
        const grupos = n.asignadosGrupos || [];
        if (grupos.length === 0) {
            if (!agrupadoGrupo["Sin asignar"]) agrupadoGrupo["Sin asignar"] = [];
            agrupadoGrupo["Sin asignar"].push(n.titulo || "(Sin título)");
        } else {
            grupos.forEach(grupo => {
                const g = grupo.trim();
                if (g) {
                    if (!agrupadoGrupo[g]) agrupadoGrupo[g] = [];
                    agrupadoGrupo[g].push(n.titulo || "(Sin título)");
                }
            });
        }
    });

    let htmlAsignadosGrupo = `
    <h3>👥 Asignaciones a grupo</h3>
    <table>
        <thead>
            <tr><th>Grupo / Unidad</th><th>Tareas asignadas</th></tr>
        </thead>
        <tbody>
`;
    for (const [grupo, tareas] of Object.entries(agrupadoGrupo)) {
        htmlAsignadosGrupo += `
        <tr>
            <td><strong>${grupo}</strong> (${tareas.length})</td>
            <td>${tareas.join("<br>")}</td>
        </tr>
    `;
    }
    htmlAsignadosGrupo += `</tbody></table>`;

    const agrupadoUsuario = {};
    nodos.forEach(n => {
        const usuarios = n.asignadosUsuarios || [];
        if (usuarios.length === 0) {
            if (!agrupadoUsuario["Sin asignar"]) agrupadoUsuario["Sin asignar"] = [];
            agrupadoUsuario["Sin asignar"].push(n.titulo || "(Sin título)");
        } else {
            usuarios.forEach(usuario => {
                const u = usuario.trim();
                if (u) {
                    if (!agrupadoUsuario[u]) agrupadoUsuario[u] = [];
                    agrupadoUsuario[u].push(n.titulo || "(Sin título)");
                }
            });
        }
    });

    let htmlAsignadosUsuario = `
    <h3>🙋‍♂️ Asignaciones a usuario</h3>
    <table>
        <thead>
            <tr><th>Usuario</th><th>Tareas asignadas</th></tr>
        </thead>
        <tbody>
`;
    for (const [usuario, tareas] of Object.entries(agrupadoUsuario)) {
        htmlAsignadosUsuario += `
        <tr>
            <td><strong>${usuario}</strong> (${tareas.length})</td>
            <td>${tareas.join("<br>")}</td>
        </tr>
    `;
    }
    htmlAsignadosUsuario += `</tbody></table>`;

    html += htmlAsignadosGrupo + htmlAsignadosUsuario;
    return html;
};

Engine.showCSVPreview = function() {

    const modal = document.getElementById("csvModal");
    const content = document.getElementById("csvContent");

    content.innerHTML = this.buildCSVPreviewHTML(this.data, {
        procedimiento: this.fichaProyecto.procedimiento || "Sin nombre de procedimiento"
    });

    modal.classList.remove("hidden");

};


Engine.exportToDOCX = async function() {
    // 🔒 Cargar docx si no está en window
    let docxLib = window.docx;
    if (!docxLib) {
        try {
            console.warn("⚙️ Cargando docx manualmente desde CDN...");
            const mod = await import("https://cdn.jsdelivr.net/npm/docx@8.0.0/+esm");
            docxLib = mod;
            window.docx = mod;
        } catch (err) {
            alert("❌ No se pudo cargar la librería DOCX.");
            console.error("Error importando docx:", err);
            return;
        }
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, PageBreak, AlignmentType } = docxLib;

// --- 1️⃣ CAPTURAR ÁREA COMPLETA DEL DIAGRAMA SIN CORTAR NI DESPLAZAR ---
const containerNodes = document.getElementById("nodesContainer");
const svgConnections = document.getElementById("svgConnections");
const nodes = this.data.nodos;

if (!nodes.length) {
    alert("⚠️ No hay nodos en el diagrama.");
    return;
}

// ============================================================
// 🧭 Calcular el área total ocupada (solo para ajustar tamaño)
// ============================================================
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
nodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.width > maxX) maxX = n.x + n.width;
    if (n.y + n.height > maxY) maxY = n.y + n.height;
});

// 🔹 Márgenes visuales (solo expansión del área)
const marginX = 300;
const marginY = 300;
const areaWidth = (maxX - minX) + marginX * 2;
const areaHeight = (maxY - minY) + marginY * 2;

// ============================================================
// 🖼️ Crear un contenedor temporal que mantenga coordenadas absolutas
// ============================================================
const wrapper = document.createElement("div");
wrapper.style.position = "absolute";
wrapper.style.left = "-9999px";
wrapper.style.top = "0";
wrapper.style.width = areaWidth + "px";
wrapper.style.height = areaHeight + "px";
wrapper.style.background = "#f3f4f6";
wrapper.style.overflow = "visible";

// Clonar el SVG y nodos SIN alterar su posición
const svgClone = svgConnections.cloneNode(true);
svgClone.style.position = "absolute";
svgClone.style.left = "0";
svgClone.style.top = "0";

const nodesClone = containerNodes.cloneNode(true);
nodesClone.style.position = "absolute";
nodesClone.style.left = "0";
nodesClone.style.top = "0";

wrapper.appendChild(svgClone);
wrapper.appendChild(nodesClone);
document.body.appendChild(wrapper);

// ============================================================
// 📸 Captura con html2canvas toda la zona (sin desplazar)
// ============================================================
const canvasFull = await html2canvas(wrapper, {
    backgroundColor: "#f3f4f6",
    scale: 1.25, // un poco más de resolución
    useCORS: true,
    x: minX - marginX,
    y: minY - marginY,
    width: areaWidth,
    height: areaHeight
});

// Limpiar wrapper temporal
document.body.removeChild(wrapper);

// Convertir imagen a bytes
const imgData = canvasFull.toDataURL("image/png");
const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());

    // --- 2️⃣ DATOS DE FICHA ---
    const ficha = this.fichaProyecto;
    const titulo = ficha.procedimiento || "Procedimiento sin nombre";
    const actividad = ficha.actividad || "";
    const descripcion = ficha.descripcion || "";

    // --- 3️⃣ TABLAS DE TAREAS Y CONDICIONES ---
    const formatTipo = (txt) => txt.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
    const sortedNodes = [...this.data.nodos].sort((a,b) => a.y - b.y || a.x - b.x);

    const tareasRows = [
        new TableRow({
            children: ["#", "Tipo", "Nombre", "Manual", "Asignado A"].map(h =>
                new TableCell({ children: [new Paragraph({ text: h, bold: true })] })
            )
        }),
        ...sortedNodes.map((n, i) => {
            // ⭐ Concatenar múltiples grupos y usuarios
            const grupos = (n.asignadosGrupos || []).join(" -- ") || "";
            const usuarios = (n.asignadosUsuarios || []).join(" -- ") || "";
            const asignados = [grupos, usuarios].filter(Boolean).join(" / ") || "Sin asignar";

            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(String(i + 1))] }),
                    new TableCell({ children: [new Paragraph(formatTipo(n.tipo))] }),
                    new TableCell({ children: [new Paragraph(n.titulo || "")] }),
                    new TableCell({ children: [new Paragraph(n.tareaManual ? "Sí" : "No")] }),
                    new TableCell({ children: [new Paragraph(asignados)] })
                ]
            });
        })
    ];

    const connRows = [
        new TableRow({
            children: ["Tarea Origen", "Bloque", "Condición", "Valor", "Tarea Destino"].map(h =>
                new TableCell({ children: [new Paragraph({ text: h, bold: true })] })
            )
        }),
        ...this.data.conexiones.map(c => {
            const from = this.getNode(c.from);
            const to = this.getNode(c.to);
            const bloque = (c.condicionNombre || c.condicionValor) ? "Sólo si" : "En todo caso";
            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(from?.titulo || "")] }),
                    new TableCell({ children: [new Paragraph(bloque)] }),
                    new TableCell({ children: [new Paragraph(c.condicionNombre || "")] }),
                    new TableCell({ children: [new Paragraph(c.condicionValor || "")] }),
                    new TableCell({ children: [new Paragraph(to?.titulo || "")] })
                ]
            });
        })
    ];

    // --- 4️⃣ CONSTRUIR DOCUMENTO ---
const doc = new Document({
    styles: {
        default: {
            document: {
                run: { font: "Calibri", size: 22 }, // 11 pt
                paragraph: { spacing: { after: 200 } }
            }
        }
    },
    sections: [
        // 📘 Página 1 — Ficha descriptiva
        {
            children: [
                new Paragraph({
                    text: titulo,
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    style: "Title"
                }),
                new Paragraph({
                    text: "Actividad: " + actividad,
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),
                new Paragraph({
                    text: "Descripción del procedimiento",
                    bold: true,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 }
                }),
                // 🔹 Mantener saltos de línea en la descripción
...descripcion
    .split(/\r?\n+/)
    .filter(linea => linea.trim() !== "")
    .map(linea =>
        new Paragraph({
            children: [new TextRun({ text: linea, break: 1 })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 150 }
        })
    ),
             
            ]
        },

       // 🧩 Página 2 — Imagen del diagrama
{
    children: [
        new Paragraph({
            text: "Diagrama del proceso",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new ImageRun({
                    data: imgBytes,
                    // Escalar manteniendo proporciones exactas del canvas
                    transformation: {
                        width: 750, // ancho máximo en DOCX
                        height: (canvasFull.height / canvasFull.width) * 750
                    }
                })
            ]
        }),
        new Paragraph({ children: [new PageBreak()] })
    ]
},


        // 📊 Página 3 — Tablas de tareas y condiciones
        {
            children: [
                new Paragraph({
                    text: "Tareas",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 200 }
                }),
                new Table({
                    rows: tareasRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                }),
               // === BLOQUES SEPARADOS: AGRUPACIÓN POR GRUPO Y USUARIO ===

// 🟩 1️⃣ Tabla de Asignaciones a grupo
new Paragraph({
    text: "Asignaciones a grupo",
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 }
}),
(() => {
    // ⭐ Soportar múltiples grupos
    const agrupadoGrupo = {};
    this.data.nodos.forEach(n => {
        const grupos = n.asignadosGrupos || [];
        if (grupos.length === 0) {
            if (!agrupadoGrupo["Sin asignar"]) agrupadoGrupo["Sin asignar"] = [];
            agrupadoGrupo["Sin asignar"].push(n.titulo || "(Sin título)");
        } else {
            grupos.forEach(grupo => {
                const g = grupo.trim();
                if (g) {
                    if (!agrupadoGrupo[g]) agrupadoGrupo[g] = [];
                    agrupadoGrupo[g].push(n.titulo || "(Sin título)");
                }
            });
        }
    });

    const filas = Object.entries(agrupadoGrupo).map(([grupo, tareas]) =>
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(grupo + ` (${tareas.length})`)] }),
                new TableCell({ children: [new Paragraph(tareas.join(", "))] })
            ]
        })
    );

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: ["Grupo / Unidad", "Tareas asignadas"].map(h =>
                    new TableCell({ children: [new Paragraph({ text: h, bold: true })] })
                )
            }),
            ...filas
        ]
    });
})(),

// 🟦 2️⃣ Tabla de Asignaciones a usuario
new Paragraph({
    text: "Asignaciones a usuario",
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 }
}),
(() => {
    // ⭐ Soportar múltiples usuarios
    const agrupadoUsuario = {};
    this.data.nodos.forEach(n => {
        const usuarios = n.asignadosUsuarios || [];
        if (usuarios.length === 0) {
            if (!agrupadoUsuario["Sin asignar"]) agrupadoUsuario["Sin asignar"] = [];
            agrupadoUsuario["Sin asignar"].push(n.titulo || "(Sin título)");
        } else {
            usuarios.forEach(usuario => {
                const u = usuario.trim();
                if (u) {
                    if (!agrupadoUsuario[u]) agrupadoUsuario[u] = [];
                    agrupadoUsuario[u].push(n.titulo || "(Sin título)");
                }
            });
        }
    });

    const filas = Object.entries(agrupadoUsuario).map(([usuario, tareas]) =>
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(usuario + ` (${tareas.length})`)] }),
                new TableCell({ children: [new Paragraph(tareas.join(", "))] })
            ]
        })
    );

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: ["Usuario", "Tareas asignadas"].map(h =>
                    new TableCell({ children: [new Paragraph({ text: h, bold: true })] })
                )
            }),
            ...filas
        ]
    });
})(),
                new Paragraph({
                    text: "Condiciones",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 200 }
                }),
                new Table({
                    rows: connRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                })
                ,
                new Paragraph({
                    text: "Cambios de estado",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: ["Tarea origen", "Condición", "Estado adquirido"].map(h =>
                                new TableCell({ children: [new Paragraph({ text: h, bold: true })] })
                            )
                        }),
                        ...this.data.conexiones
                            .filter(c => c.cambioEstado && c.cambioEstado.trim() !== "")
                            .map(c => {
                                const from = this.getNode(c.from);
                                const condTxt = [c.condicionNombre, c.condicionValor]
                                    .filter(Boolean)
                                    .join(" ");
                                return new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph(from?.titulo || "")] }),
                                        new TableCell({ children: [new Paragraph(condTxt || "En todo caso")] }),
                                        new TableCell({ children: [new Paragraph(c.cambioEstado)] })
                                    ]
                                });
                            })
                    ]
                })
            ]
        }
    ]
}); // 👈 cierre del Document correctamente

    // --- 5️⃣ EXPORTAR ---
    const blob = await Packer.toBlob(doc);
    const nombreArchivo = `Proceso - ${titulo}.docx`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(a.href);

    console.log("📄 DOCX generado con formato mejorado:", nombreArchivo);
};

/* ============================================================
   PEGAR JSON MANUALMENTE DESDE EL PORTAPAPELES
============================================================ */
document.getElementById("btnPasteJSON").addEventListener("click", async () => {
    try {
        // Intentar leer desde el portapapeles si está permitido
        let jsonText = "";
        try {
            jsonText = await navigator.clipboard.readText();
        } catch {
            // Si el navegador no permite acceso directo, usar prompt
            jsonText = prompt("Pega aquí el JSON del diagrama:");
        }

        if (!jsonText) {
            alert("No se ha pegado ningún texto JSON.");
            return;
        }

        // Validar formato básico
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (e) {
            alert("❌ El texto no es un JSON válido.");
            return;
        }

        // Confirmar con el usuario
        const ok = confirm("¿Quieres reemplazar el diagrama actual con el JSON pegado?");
        if (!ok) return;

        // Reutilizar la función existente de importación
        Engine.importFromJSON(jsonText);
        alert("✅ JSON pegado y cargado correctamente.");
    } catch (err) {
        console.error("Error al pegar JSON:", err);
        alert("❌ No se pudo procesar el JSON. Revisa la consola.");
    }
});
/* ============================================================
   ABRIR ASISTENTE EXTERNO IA JSON
============================================================ */
const IA_JSON_MODELOS = ["QdeCAC", "QdeCAC Hibrido ESET"];

const normalizeIaJsonModelo = (valor) =>
    (valor || "").toString().toLowerCase().replace(/\s+/g, "");

const resolveIaJsonModelo = (valor) => {
    const normalizado = normalizeIaJsonModelo(valor);
    if (!normalizado) return IA_JSON_MODELOS[0];
    const match = IA_JSON_MODELOS.find(
        (modelo) => normalizeIaJsonModelo(modelo) === normalizado
    );
    return match || (valor || "").trim();
};

const btnIAJson = document.getElementById("btnIAJson");
if (btnIAJson) {
    btnIAJson.addEventListener("click", () => {
        const primary = btnIAJson.dataset.model || "";
        const fallback = btnIAJson.dataset.modelAlt || "";
        const modelo = resolveIaJsonModelo(primary || fallback || IA_JSON_MODELOS[0]);
        const url = new URL(
            "https://chatgpt.com/g/g-6918f6f366d081918def86bc27f3c2b4-gestiona-flow-process"
        );
        url.searchParams.set("modelo", modelo);
        window.open(url.toString(), "_blank");
    });
}
/* ============================================================
   PAN CON BOTÓN DERECHO / RUEDA / CTRL + CLICK IZQUIERDO
============================================================ */
(function() {

    const area = document.getElementById("canvasArea");
    if (!area) return;

    let panning = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    area.addEventListener("mousedown", (e) => {
        const isRight = e.button === 2;
        const isMiddle = e.button === 1;
        const isCtrlLeft = (e.button === 0 && e.ctrlKey);

        if (isRight || isMiddle || isCtrlLeft) {
            e.preventDefault();
            panning = true;
            startX = e.clientX;
            startY = e.clientY;
            scrollLeft = area.scrollLeft;
            scrollTop = area.scrollTop;
            area.style.cursor = "grabbing"; // 🖐️ cambio visual
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (!panning) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        area.scrollLeft = scrollLeft - dx;
        area.scrollTop = scrollTop - dy;
    });

    window.addEventListener("mouseup", () => {
        if (panning) area.style.cursor = "default";
        panning = false;
    });

    // Evitar menú contextual con clic derecho
    area.addEventListener("contextmenu", (e) => e.preventDefault());

})();

document.addEventListener("click", (e) => {
    // Si el clic NO es sobre un nodo ni sobre una conexión
    if (!e.target.closest(".node") && 
        !e.target.closest(".connection-line") && 
        !e.target.closest(".connection-hit")) {

        // Eliminar destacado de selectConnection()
        document.querySelectorAll(".connection-line.selected-conn, .connection-path.selected-conn")
          .forEach(el => el.classList.remove("selected-conn"));

        document.querySelectorAll(".node.selected-conn")
          .forEach(el => el.classList.remove("selected-conn"));
    }
});
/* ============================================================
   EXPANDIR / CONTRAER nodos desde su centro geométrico
============================================================ */
Engine.adjustSelectedNodes = function(delta) {
    const ids = Array.from(Interactions.selectedNodes || []);
    if (ids.length < 2) return;

    // 1️⃣ Conseguir los nodos
    const nodos = ids.map(id => Engine.getNode(id)).filter(Boolean);

    // 2️⃣ Calcular centro geométrico
    const cx = nodos.reduce((a,n)=>a+n.x+n.width/2,0) / nodos.length;
    const cy = nodos.reduce((a,n)=>a+n.y+n.height/2,0) / nodos.length;

    // 3️⃣ Ver si están alineados
    const sameY = nodos.every(n => Math.abs((n.y+n.height/2) - cy) < 5);
    const sameX = nodos.every(n => Math.abs((n.x+n.width/2) - cx) < 5);

    nodos.forEach(n => {

        // Desplazamiento en coordenadas
        let dx = (n.x + n.width/2 - cx) === 0 ? 0 :
                 Math.sign(n.x + n.width/2 - cx) * delta;

        let dy = (n.y + n.height/2 - cy) === 0 ? 0 :
                 Math.sign(n.y + n.height/2 - cy) * delta;

        // Si están alineados solo mover en 1 eje
        if (sameY) dy = 0;
        if (sameX) dx = 0;

        n.x += dx;
        n.y += dy;

        const div = document.getElementById(n.id);
        if (div) {
            div.style.left = n.x + "px";
            div.style.top  = n.y + "px";
        }
    });

    Renderer.redrawConnections();
    Engine.saveHistory();
};

window.Engine = Engine; // ✅ expone Engine en window para que DataTesauro lo vea

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnExportDocx").addEventListener("click", () => {
        Engine.exportToDOCX();
    });

    document.getElementById("btnVerCSV").addEventListener("click", () => {
        Engine.showCSVPreview();
    });

    // **NUEVO**: cerrar el modal de vista previa CSV
    const btnCsvCerrar = document.getElementById("csvCerrar");   // **NUEVO**
    if (btnCsvCerrar) {                                          // **NUEVO**
        btnCsvCerrar.addEventListener("click", () => {           // **NUEVO**
            const modal = document.getElementById("csvModal");   // **NUEVO**
            if (modal) modal.classList.add("hidden");            // **NUEVO**
        });                                                      // **NUEVO**
    }                                                            // **NUEVO**
});

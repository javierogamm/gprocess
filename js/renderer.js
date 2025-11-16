/* ============================================================
   RENDERER.JS
   Dibuja nodos, SVGs internos, handles, conexiones y etiquetas.
============================================================ */

const Renderer = {

    svg: null,
    container: null,

    init() {
        this.svg = document.getElementById("svgConnections");
        this.container = document.getElementById("nodesContainer");
    },

    clearAll() {
        this.container.innerHTML = "";
        this.svg.innerHTML = "";
    },

    /* =======================================================
       RENDERIZAR NODO COMPLETO
    ======================================================== */
    renderNode(nodo) {

        const div = document.createElement("div");
        div.classList.add("node", nodo.tipo);
        div.id = nodo.id;

        div.style.left = nodo.x + "px";
        div.style.top  = nodo.y + "px";

        if (!nodo.width)  nodo.width  = 200;
        if (!nodo.height) nodo.height = 80;

        div.style.width  = nodo.width + "px";
        div.style.height = nodo.height + "px";

        div.innerHTML = `
            <div class="shape"></div>

            <div class="handle top" data-position="top"></div>
            <div class="handle right" data-position="right"></div>
            <div class="handle bottom" data-position="bottom"></div>
            <div class="handle left" data-position="left"></div>
        `;

        this.container.appendChild(div);
        this.renderShapeSVG(div, nodo);

        if (Interactions && Interactions.registerNodeEvents) {
            Interactions.registerNodeEvents(div, nodo);
        }

               /* ------------------------------------------
           TEXTO DEL NODO (editable)
        ------------------------------------------ */
        const content = document.createElement("div");
        content.classList.add("node-content");
        content.contentEditable = true;
        content.innerText = nodo.titulo || "";

        div.appendChild(content);   // CAMBIO: el texto va después de la forma, por encima**

        content.addEventListener("input", () => {
            content.style.height = "auto";
            content.style.height = content.scrollHeight + "px";

            nodo.height = content.scrollHeight + 30;
            div.style.height = nodo.height + "px";
            nodo.width = div.offsetWidth;
            nodo.height = div.offsetHeight;
            Engine.updateConnections();
        });

/* ------------------------------------------
   DESCRIPCIÓN WYSIWYG DEL NODO
------------------------------------------ */
const desc = document.createElement("div");
desc.classList.add("node-description");
desc.contentEditable = "true";
desc.innerHTML = nodo.descripcion || "";

div.appendChild(desc);

// Saltos de línea reales
desc.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        document.execCommand("insertParagraph", false, null);
    }
});

// Mostrar barra de herramientas al enfocar
desc.addEventListener("focus", () => Renderer.showNodeToolbar(desc));
desc.addEventListener("blur", () => setTimeout(() => Renderer.hideNodeToolbar(), 200));

// Guardar como HTML
desc.addEventListener("input", () => {
    nodo.descripcion = desc.innerHTML;
    Engine.updateNode(nodo.id, { descripcion: desc.innerHTML });
    Engine.updateConnections();
});

// ✅ Autoajuste y guardado limpio
desc.addEventListener("input", () => {
    desc.style.height = "auto";
    desc.style.height = desc.scrollHeight + "px";

    const totalHeight = content.scrollHeight + desc.scrollHeight + 50;
    div.style.height = totalHeight + "px";
    nodo.height = totalHeight;

    const text = desc.innerHTML
        .replace(/<div>/g, "\n")
        .replace(/<\/div>/g, "")
        .replace(/<br\s*\/?>/g, "\n")
        .trim();

    Engine.updateNode(nodo.id, { descripcion: text });
    Engine.updateConnections();
});
/* ------------------------------------------
   RESIZER
------------------------------------------ */
const resizer = document.createElement("div");
resizer.classList.add("node-resizer");
div.appendChild(resizer);

let resizing = false;

// VARIABLES FIJAS DURANTE EL RESIZE
let startWidth = 0;
let startHeight = 0;
let startRight = 0;
let startBottom = 0;

resizer.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    resizing = true;

    const rect = div.getBoundingClientRect();

    // Guardamos medidas iniciales
    startWidth  = rect.width;
    startHeight = rect.height;

    // Guardamos posición inicial de la esquina inferior derecha
    startRight  = rect.left + rect.width;
    startBottom = rect.top  + rect.height;
});

document.addEventListener("mousemove", (e) => {
    if (!resizing) return;

// Delta horizontal OK
const dx = e.clientX - startRight;
const newWidth = startWidth + dx;

// Delta vertical CORREGIDO
const rect = div.getBoundingClientRect();
const newHeight = e.clientY - rect.top;

    if (newWidth > 120) {
        nodo.width = newWidth;
        div.style.width = newWidth + "px";

        // <<<<<<<<<< CORRECCIÓN CRÍTICA >>>>>>>>>>>>
        div.style.setProperty("--w", newWidth + "px");
    }

    if (newHeight > 60) {
        nodo.height = newHeight;
        div.style.height = newHeight + "px";
        

        // <<<<<<<<<< CORRECCIÓN CRÍTICA >>>>>>>>>>>>
        div.style.setProperty("--h", newHeight + "px");
    }
// 🔥 Redibujar la forma del nodo con el nuevo tamaño
Renderer.renderShapeSVG(div, nodo);

    // Las conexiones sí estaban bien
    Engine.updateConnections();
});

document.addEventListener("mouseup", () => {
    resizing = false;
});

        return div;
    },

    /* =======================================================
       SVG SEGÚN TIPO
    ======================================================== */
    renderShapeSVG(div, nodo) {
        const shape = div.querySelector(".shape");
        shape.innerHTML = "";
    
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.position = "absolute";
        svg.style.inset = "0";
        svg.style.pointerEvents = "none";
    
        const W = div.offsetWidth;
        const H = div.offsetHeight;
    
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
        /* ====================================================
           FORMULARIO → cápsula vertical no deformable
        ==================================================== */
        if (nodo.tipo === "formulario") {
            const rx = Math.min(W, H) * 0.20;
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", 2);
            r.setAttribute("y", 2);
            r.setAttribute("width", W - 4);
            r.setAttribute("height", H - 4);
            r.setAttribute("rx", rx);
            r.setAttribute("ry", rx);
            r.setAttribute("fill", "#b9e6e8");
            r.setAttribute("stroke", "#4a7f84");
            r.setAttribute("stroke-width", "3");
            g.appendChild(r);
        }
    
        /* ====================================================
           DOCUMENTO → doble curva suave
        ==================================================== */
        if (nodo.tipo === "documento") {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const fx = W / 220;
            const fy = H / 120;
        
            const d = `
                M ${10 * fx} ${5 * fy}
                H ${210 * fx}
                Q ${215 * fx} ${5 * fy}, ${215 * fx} ${10 * fy}
                V ${H - 20 * fy}
        
                C ${160 * fx} ${H - 35 * fy}, ${100 * fx} ${H - 5 * fy}, ${40 * fx} ${H - 15 * fy}
                C ${25 * fx} ${H - 18 * fy}, ${15 * fx} ${H - 20 * fy}, ${10 * fx} ${H - 22 * fy}
        
                Q ${10 * fx} ${H - 20 * fy}, ${10 * fx} ${H - 20 * fy}
                Z
            `;
        
            path.setAttribute("d", d);
            path.setAttribute("fill", "#b9e6e8");
            path.setAttribute("stroke", "#4a7f84");
            path.setAttribute("stroke-width", "3");
            g.appendChild(path);
        }
        
/* ====================================================
   DECISIONR → rombo con esquinas redondeadas (TEST)
==================================================== */
if (nodo.tipo === "decisionR") {

    const s = 10;  // grosor del borde interior
    const rx = 20; // redondeo horizontal
    const ry = 20; // redondeo vertical

    // Creamos un rectángulo redondeado completo
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", s);
    rect.setAttribute("y", s);
    rect.setAttribute("width", W - s*2);
    rect.setAttribute("height", H - s*2);
    rect.setAttribute("rx", rx);
    rect.setAttribute("ry", ry);
    rect.setAttribute("fill", "#b9e6e8");
    rect.setAttribute("stroke", "#4a7f84");
    rect.setAttribute("stroke-width", "3");

    g.appendChild(rect);
}
    /* ====================================================
    PLAZO → reloj circular minimalista
    ==================================================== */
    if (nodo.tipo === "plazo") {

        // 🔹 Reloj circular principal
        const reloj = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        reloj.setAttribute("cx", W / 2);
        reloj.setAttribute("cy", H / 2);
        reloj.setAttribute("r", Math.min(W, H) / 2 - 6);
        reloj.setAttribute("fill", "#b9e6e8");
        reloj.setAttribute("stroke", "#4a7f84");
        reloj.setAttribute("stroke-width", "3");
        g.appendChild(reloj);

        // 🔹 Centro del reloj
        const centro = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centro.setAttribute("cx", W / 2);
        centro.setAttribute("cy", H / 2);
        centro.setAttribute("r", 3);
        centro.setAttribute("fill", "#4a7f84");
        g.appendChild(centro);

        // 🔹 Manecilla horaria
        const hora = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hora.setAttribute("x1", W / 2);
        hora.setAttribute("y1", H / 2);
        hora.setAttribute("x2", W / 2);
        hora.setAttribute("y2", H / 2 - Math.min(W, H) * 0.20);
        hora.setAttribute("stroke", "#4a7f84");
        hora.setAttribute("stroke-width", "3");
        hora.setAttribute("stroke-linecap", "round");
        g.appendChild(hora);

        // 🔹 Manecilla minutera (más larga)
        const min = document.createElementNS("http://www.w3.org/2000/svg", "line");
        min.setAttribute("x1", W / 2);
        min.setAttribute("y1", H / 2);
        min.setAttribute("x2", W / 2 + Math.min(W, H) * 0.25);
        min.setAttribute("y2", H / 2);
        min.setAttribute("stroke", "#4a7f84");
        min.setAttribute("stroke-width", "2");
        min.setAttribute("stroke-linecap", "round");
        g.appendChild(min);

        // 🔹 Pequeños marcadores a las 12, 3, 6 y 9
        const marks = [
            { x1: W/2, y1: H/2 - Math.min(W,H)/2 + 8, x2: W/2, y2: H/2 - Math.min(W,H)/2 + 16 },
            { x1: W/2 + Math.min(W,H)/2 - 8, y1: H/2, x2: W/2 + Math.min(W,H)/2 - 16, y2: H/2 },
            { x1: W/2, y1: H/2 + Math.min(W,H)/2 - 8, x2: W/2, y2: H/2 + Math.min(W,H)/2 - 16 },
            { x1: W/2 - Math.min(W,H)/2 + 8, y1: H/2, x2: W/2 - Math.min(W,H)/2 + 16, y2: H/2 }
        ];
        for (const m of marks) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", m.x1);
            line.setAttribute("y1", m.y1);
            line.setAttribute("x2", m.x2);
            line.setAttribute("y2", m.y2);
            line.setAttribute("stroke", "#4a7f84");
            line.setAttribute("stroke-width", "2");
            g.appendChild(line);
        }
    }
    /* ====================================================
   OPERACIÓN EXTERNA → cilindro tipo base de datos
==================================================== */
if (nodo.tipo === "operacion_externa") {
    const fx = W / 220;
    const fy = H / 140;

    // 🟣 Cuerpo principal (rectángulo con bordes curvos)
    const body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    body.setAttribute("x", 10 * fx);
    body.setAttribute("y", 20 * fy);
    body.setAttribute("width", 200 * fx);
    body.setAttribute("height", 100 * fy);
    body.setAttribute("fill", "#b9e6e8");
    body.setAttribute("stroke", "#4a7f84");
    body.setAttribute("stroke-width", "3");
    g.appendChild(body);

    // 🔵 Elipse superior
    const topEllipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    topEllipse.setAttribute("cx", 110 * fx);
    topEllipse.setAttribute("cy", 20 * fy);
    topEllipse.setAttribute("rx", 100 * fx);
    topEllipse.setAttribute("ry", 20 * fy);
    topEllipse.setAttribute("fill", "#b9e6e8");
    topEllipse.setAttribute("stroke", "#4a7f84");
    topEllipse.setAttribute("stroke-width", "3");
    g.appendChild(topEllipse);

    // 🔵 Elipse inferior (solo contorno)
    const bottomEllipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    bottomEllipse.setAttribute("cx", 110 * fx);
    bottomEllipse.setAttribute("cy", 120 * fy);
    bottomEllipse.setAttribute("rx", 100 * fx);
    bottomEllipse.setAttribute("ry", 20 * fy);
    bottomEllipse.setAttribute("fill", "none");
    bottomEllipse.setAttribute("stroke", "#4a7f84");
    bottomEllipse.setAttribute("stroke-width", "3");
    g.appendChild(bottomEllipse);
}

        /* ====================================================
           LIBRE → elipse perfecta
        ==================================================== */
        if (nodo.tipo === "libre") {
            const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            el.setAttribute("cx", W / 2);
            el.setAttribute("cy", H / 2);
            el.setAttribute("rx", W / 2 - 4);
            el.setAttribute("ry", H / 2 - 4);
            el.setAttribute("fill", "#b9e6e8");
            el.setAttribute("stroke", "#4a7f84");
            el.setAttribute("stroke-width", "3");
            g.appendChild(el);
        }
    
        /* ====================================================
           DECISIÓN → rombo
        ==================================================== */
        if (nodo.tipo === "decision") {
            const p = `
                ${W / 2},2
                ${W - 2},${H / 2}
                ${W / 2},${H - 2}
                2,${H / 2}
            `;
            const romb = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            romb.setAttribute("points", p);
            romb.setAttribute("fill", "#b9e6e8");
            romb.setAttribute("stroke", "#4a7f84");
            romb.setAttribute("stroke-width", "3");
            g.appendChild(romb);
        }
    
        /* ====================================================
           CIRCUITO → cubo 3D
        ==================================================== */
        if (nodo.tipo === "circuito") {
            const fx = W / 300;
            const fy = H / 220;
    
            const FW = 180 * fx;
            const FH = 110 * fy;
            const DEPTH_X = 60 * fx;
            const DEPTH_Y = 40 * fy;
            const OFFSET_X = 10 * fx;
            const OFFSET_Y = 10 * fy;
    
            const centerX = (W / 2) - OFFSET_X;
            const centerY = (H / 2) - OFFSET_Y;
    
            const F1 = { x: centerX - FW / 2, y: centerY - FH / 2 };
            const F2 = { x: F1.x + FW, y: F1.y };
            const F3 = { x: F1.x + FW, y: F1.y + FH };
            const F4 = { x: F1.x, y: F1.y + FH };
    
            const front = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            front.setAttribute("points", `${F1.x},${F1.y} ${F2.x},${F2.y} ${F3.x},${F3.y} ${F4.x},${F4.y}`);
            front.setAttribute("fill", "#b9e6e8");
            front.setAttribute("stroke", "#4a7f84");
            front.setAttribute("stroke-width", 3);
            g.appendChild(front);
    
            const T1 = { x: F1.x, y: F1.y };
            const T2 = { x: F1.x + DEPTH_X, y: F1.y - DEPTH_Y };
            const T3 = { x: F2.x + DEPTH_X, y: F2.y - DEPTH_Y };
            const T4 = { x: F2.x, y: F2.y };
    
            const top = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            top.setAttribute("points", `${T1.x},${T1.y} ${T2.x},${T2.y} ${T3.x},${T3.y} ${T4.x},${T4.y}`);
            top.setAttribute("fill", "#a4d7d9");
            top.setAttribute("stroke", "#4a7f84");
            top.setAttribute("stroke-width", 3);
            g.appendChild(top);
    
            const L1 = { x: F2.x, y: F2.y };
            const L2 = { x: T3.x, y: T3.y };
            const L3 = { x: T3.x, y: F3.y - DEPTH_Y };
            const L4 = { x: F3.x, y: F3.y };
    
            const side = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            side.setAttribute("points", `${L1.x},${L1.y} ${L2.x},${L2.y} ${L3.x},${L3.y} ${L4.x},${L4.y}`);
            side.setAttribute("fill", "#97c8ca");
            side.setAttribute("stroke", "#4a7f84");
            side.setAttribute("stroke-width", 3);
            g.appendChild(side);
        }
    
        // 🟢 Primero añadimos la forma principal
        svg.appendChild(g);
    
        /* ====================================================
           ICONO DE TAREA MANUAL (Ⓜ️)
        ==================================================== */
        if (nodo.tareaManual) {
            const iconSize = Math.min(W, H) * 0.25;
            const iconX = W - iconSize * 0.7;
            const iconY = iconSize * 1.2;
    
            // Fondo circular
            const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            bg.setAttribute("cx", iconX);
            bg.setAttribute("cy", iconY);
            bg.setAttribute("r", iconSize * 0.55);
            bg.setAttribute("fill", "#ffffff");
            bg.setAttribute("stroke", "#4a7f84");
            bg.setAttribute("stroke-width", "1.5");
            bg.style.pointerEvents = "none";
            svg.appendChild(bg);
    
            // Emoji Ⓜ️ encima
            const emoji = document.createElementNS("http://www.w3.org/2000/svg", "text");
            emoji.textContent = "Ⓜ️";
            emoji.setAttribute("x", iconX);
            emoji.setAttribute("y", iconY + iconSize * 0.05);
            emoji.setAttribute("font-size", `${iconSize}px`);
            emoji.setAttribute("text-anchor", "middle");
            emoji.setAttribute("dominant-baseline", "middle");
            emoji.style.pointerEvents = "none";
            emoji.style.userSelect = "none";
            emoji.style.filter = "drop-shadow(0 0 1px white)";
            svg.appendChild(emoji);
    
            svg.style.overflow = "visible";
        }
    
        shape.appendChild(svg);
    }
    
      
    
    ,

    /* =======================================================
       ACTUALIZAR LABEL DEL NODO
    ======================================================== */
    updateNodeLabel(id) {
        const nodo = Engine.getNode(id);
        if (!nodo) return;
    
        const div = document.getElementById(id);
        if (!div) return;
    
        const content = div.querySelector(".node-content");
        if (content) {
            content.innerText = nodo.titulo || "";
        }
    
        const desc = div.querySelector(".node-description");
        if (desc) {
            desc.innerText = nodo.descripcion || "";
        }
    
        // ❗️IMPORTANTE: NO recalculamos altura del nodo aquí
        // El tamaño del nodo solo cambia con el RESIZER.
    },
    
/* ========================================================
   DIBUJAR CONEXIÓN MIENTRAS SE RECONCONECTA EN VIVO
======================================================== */
redrawConnectionsDynamic(conn, fixedX, fixedY, mx, my, movingEnd) {
    this.svg.innerHTML = "";
    Engine.data.conexiones.forEach(c => {
        if (c.id === conn.id) {
            // Línea temporal dinámica
            const d = movingEnd === "from"
                ? `M ${mx},${my} L ${fixedX},${fixedY}`
                : `M ${fixedX},${fixedY} L ${mx},${my}`;
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.classList.add("connection-line");
            path.id = c.id;
            path.setAttribute("d", d);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "#4a7f84");
            path.setAttribute("stroke-width", "2");
            this.svg.appendChild(path);
        } else {
            this.drawConnection(c);
        }
    });
},
    /* =======================================================
       OBTENER COORDENADAS DE HANDLE
    ======================================================== */
    getHandleCoordinates(nodeId, side) {

        const node = document.getElementById(nodeId);
        if (!node) return { x: 0, y: 0 };

        const handle = node.querySelector(`.handle.${side}`);
        if (!handle) return { x: 0, y: 0 };

        const rect = handle.getBoundingClientRect();
        const canvasRect = this.container.getBoundingClientRect();

        return {
            x: rect.left + rect.width / 2 - canvasRect.left,
            y: rect.top + rect.height / 2 - canvasRect.top
        };
    },

    /* =======================================================
       DIBUJAR CONEXIÓN
    ======================================================== */
    drawConnection(conn) {

        // =============================
        // 🎯 Coordenadas ajustadas
        // =============================
        const from = this.getHandleCoordinates(conn.from, conn.fromPos);
        const to   = this.getHandleCoordinates(conn.to, conn.toPos);
    
        // 🔧 Ajustar la distancia final para que la línea no toque el nodo
        const OFFSET = 14;
        let adjToX = to.x;
        let adjToY = to.y;
    
        if (conn.toPos === "top")      adjToY += OFFSET;
        if (conn.toPos === "bottom")   adjToY -= OFFSET;
        if (conn.toPos === "left")     adjToX += OFFSET;
        if (conn.toPos === "right")    adjToX -= OFFSET;
    
        const adjustedTo = { x: adjToX, y: adjToY };
    
        // =============================
        // 📐 Path principal (línea)
        // =============================
        const d = this.generateOrthogonalPath(from, adjustedTo, conn.fromPos, conn.toPos);
    
        // =============================
        // 🎯 Crear marcador de flecha (una sola vez)
        // =============================
        if (!this.svg.querySelector("#arrowhead")) {
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
            marker.setAttribute("id", "arrowhead");
            marker.setAttribute("markerWidth", "10");
            marker.setAttribute("markerHeight", "7");
            marker.setAttribute("refX", "9");  // controla la distancia desde el final del path
            marker.setAttribute("refY", "3.5");
            marker.setAttribute("orient", "auto");
            marker.setAttribute("markerUnits", "strokeWidth");
    
            const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            arrowPath.setAttribute("d", "M0,0 L10,3.5 L0,7 Z");
            arrowPath.setAttribute("fill", "#4a7f84"); // mismo color que tus líneas
    
            marker.appendChild(arrowPath);
            defs.appendChild(marker);
            this.svg.appendChild(defs);
        }
    
        // =============================
        // 🟦 Área de clic invisible (gruesa)
        // =============================
        const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hit.setAttribute("d", d);
        hit.setAttribute("stroke", "transparent");
        hit.setAttribute("stroke-width", "18");
        hit.setAttribute("fill", "none");
        hit.style.cursor = "pointer";
    
        hit.addEventListener("click", (e) => {
            e.stopPropagation();
            Engine.selectConnection(conn.id);
        });
    
        this.svg.appendChild(hit);
    
        // =============================
        // 🧭 Línea visible con flecha
        // =============================
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("connection-line");
        path.id = conn.id;
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#4a7f84");
        path.setAttribute("stroke-width", "2");
    
        // 🔻 Agregar la flecha al final
        path.setAttribute("marker-end", "url(#arrowhead)");
    
        // Eventos
        path.addEventListener("click", (e) => {
            e.stopPropagation();
            Engine.selectConnection(conn.id);
        });
    
        path.addEventListener("mousedown", (e) => {
            if (e.altKey) {
                // ALT + clic → reconectar origen
                e.stopPropagation();
                Interactions.startReconnectConnection(conn.id, "from");
            } else if (e.shiftKey) {
                // SHIFT + clic → reconectar destino
                e.stopPropagation();
                Interactions.startReconnectConnection(conn.id, "to");
            }
        });
    
        this.svg.appendChild(path);
    
        // =============================
        // 🏷️ ETIQUETA SOBRE LA LÍNEA
        // =============================
        if (conn.condicionNombre || conn.condicionValor) {
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.classList.add("connection-label");
    
            // Texto
            const texto = conn.condicionNombre
                ? `${conn.condicionNombre}: ${conn.condicionValor || ""}`
                : conn.condicionValor || "";
    
            label.textContent = texto;
    
            const from = this.getHandleCoordinates(conn.from, conn.fromPos);
            const to   = this.getHandleCoordinates(conn.to, conn.toPos);
    
            const LABEL_OFFSET = 35;
            let p1x = from.x, p1y = from.y;
            let p2x = to.x,   p2y = to.y;
    
            if (conn.fromPos === "top")    p1y = from.y - LABEL_OFFSET;
            if (conn.fromPos === "bottom") p1y = from.y + LABEL_OFFSET;
            if (conn.fromPos === "left")   p1x = from.x - LABEL_OFFSET;
            if (conn.fromPos === "right")  p1x = from.x + LABEL_OFFSET;
    
            if (conn.toPos === "top")      p2y = to.y - LABEL_OFFSET;
            if (conn.toPos === "bottom")   p2y = to.y + LABEL_OFFSET;
            if (conn.toPos === "left")     p2x = to.x - LABEL_OFFSET;
            if (conn.toPos === "right")    p2x = to.x + LABEL_OFFSET;
    
            let midX, midY;
            if (Math.abs(p1y - p2y) < 25) {
                midX = (p1x + p2x) / 2;
                midY = p1y;
            } else {
                midX = (p1x + p2x) / 2;
                midY = Math.max(p1y, p2y) - LABEL_OFFSET / 2;
            }
    
            label.setAttribute("x", midX);
            label.setAttribute("y", midY);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
    
            label.setAttribute("fill", "#ffffff");
            label.setAttribute("stroke", "#000000");
            label.setAttribute("stroke-width", "2");
            label.setAttribute("paint-order", "stroke fill");
    
            this.svg.appendChild(label);
        }
    }
    ,
    /* ============================================================
   MOSTRAR HANDLES DE RECONEXIÓN CUANDO UNA LÍNEA ESTÁ SELECCIONADA
============================================================ */
showConnectionHandles(conn) {
    this.hideConnectionHandles();

    if (!conn) return;

    const from = this.getHandleCoordinates(conn.from, conn.fromPos);
    const to = this.getHandleCoordinates(conn.to, conn.toPos);

    // Crear dos círculos para arrastrar los extremos
    const createHandle = (x, y, type) => {
        const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        h.setAttribute("cx", x);
        h.setAttribute("cy", y);
        h.setAttribute("r", 7);
        h.setAttribute("fill", "#ffffff");
        h.setAttribute("stroke", "#4a7f84");
        h.setAttribute("stroke-width", "2");
        h.classList.add("conn-handle");
        h.dataset.type = type;
        this.svg.appendChild(h);

        // Hacerlo dragable
        h.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            Interactions.startReconnectConnection(conn.id, type);
        });
    };

    createHandle(from.x, from.y, "from");
    createHandle(to.x, to.y, "to");
},

hideConnectionHandles() {
    this.svg.querySelectorAll(".conn-handle").forEach(el => el.remove());
},

    /* =======================================================
       PATH ORTOGONAL
    ======================================================== */
    generateOrthogonalPath(start, end, fromSide, toSide) {

        const OFFSET = 35;
        const x1 = start.x, y1 = start.y;
        const x2 = end.x,   y2 = end.y;

        let p1x = x1, p1y = y1;
        let p2x = x2, p2y = y2;

        if (fromSide === "top")    p1y = y1 - OFFSET;  
        if (fromSide === "bottom") p1y = y1 + OFFSET; 
        if (fromSide === "left")   p1x = x1 - OFFSET;
        if (fromSide === "right")  p1x = x1 + OFFSET;

        if (toSide === "top")      p2y = y2 - OFFSET;
        if (toSide === "bottom")   p2y = y2 + OFFSET;
        if (toSide === "left")     p2x = x2 - OFFSET;
        if (toSide === "right")    p2x = x2 + OFFSET;

        if (p1x === p2x)
            return `M ${x1},${y1} L ${p1x},${p1y} L ${p2x},${p2y} L ${x2},${y2}`;

        if (p1y === p2y)
            return `M ${x1},${y1} L ${p1x},${p1y} L ${p2x},${p2y} L ${x2},${y2}`;

        let midX, midY;

        if (fromSide === "top" || fromSide === "bottom") {
            midX = p1x;
            midY = p2y;
        } else {
            midX = p2x;
            midY = p1y;
        }

        return `M ${x1},${y1} L ${p1x},${p1y} L ${midX},${midY} L ${p2x},${p2y} L ${x2},${y2}`;
    },

    redrawConnections() {
        this.svg.innerHTML = "";
        Engine.data.conexiones.forEach(conn => this.drawConnection(conn));
    },

    drawTempLine(startX, startY, endX, endY) {
        let temp = document.getElementById("temp-connection-line");
        if (temp) temp.remove();
    
        temp = document.createElementNS("http://www.w3.org/2000/svg", "line");
        temp.id = "temp-connection-line";
        temp.classList.add("temp-line");
    
        temp.setAttribute("x1", startX);
        temp.setAttribute("y1", startY);
        temp.setAttribute("x2", endX);
        temp.setAttribute("y2", endY);
    
        this.svg.appendChild(temp);
    }
    ,

    clearTempLine() {
        const el = document.getElementById("temp-connection-line");
        if (el) el.remove();
    },

    /* ============================================================
   ELIMINAR VISUAL DE UN NODO (sin tocar Engine)
============================================================ */
deleteNodeVisual(id) {
    const div = document.getElementById(id);
    if (div && div.parentNode) {
        div.parentNode.removeChild(div);
    }
}

};
/* ============================================================
   TOOLBAR FLOTANTE PARA DESCRIPCIÓN DE NODOS
============================================================ */
Renderer.showNodeToolbar = function(target) {
    let tb = document.getElementById("nodeWysiToolbar");
    if (!tb) {
        tb = document.createElement("div");
        tb.id = "nodeWysiToolbar";
        tb.className = "node-toolbar";
        tb.innerHTML = `
            <button data-cmd="bold" title="Negrita">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M7 5h7a3 3 0 010 6H7zm0 6h8a3 3 0 010 6H7z" fill="currentColor"/></svg>
            </button>
            <button data-cmd="italic" title="Cursiva">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M10 5v2h2.58l-3.16 10H7v2h7v-2h-2.58l3.16-10H17V5z" fill="currentColor"/></svg>
            </button>
            <button data-cmd="underline" title="Subrayado">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 17a5 5 0 005-5V5h-2v7a3 3 0 01-6 0V5H7v7a5 5 0 005 5zM5 19h14v2H5z" fill="currentColor"/></svg>
            </button>
            <span class="separator"></span>
            <button data-cmd="justifyLeft" title="Alinear izquierda">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M3 6h18v2H3zm0 4h12v2H3zm0 4h18v2H3zm0 4h12v2H3z" fill="currentColor"/></svg>
            </button>
            <button data-cmd="justifyCenter" title="Centrar">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M4 6h16v2H4zm2 4h12v2H6zm-2 4h16v2H4zm2 4h12v2H6z" fill="currentColor"/></svg>
            </button>
            <button data-cmd="justifyRight" title="Alinear derecha">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M3 6h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zm6 4h12v2H9z" fill="currentColor"/></svg>
            </button>
            <span class="separator"></span>
            <button data-cmd="insertUnorderedList" title="Lista">
                <svg width="14" height="14" viewBox="0 0 24 24"><path d="M7 5h14v2H7zM7 11h14v2H7zM7 17h14v2H7zM3 5h2v2H3zM3 11h2v2H3zM3 17h2v2H3z" fill="currentColor"/></svg>
            </button>
        `;
        document.body.appendChild(tb);

        tb.querySelectorAll("button[data-cmd]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const cmd = btn.getAttribute("data-cmd");
                target.focus();
                document.execCommand(cmd, false, null);
            });
        });
    }
    const rect = target.getBoundingClientRect();
    tb.style.left = rect.left + "px";
    tb.style.top = (rect.top - 36) + "px";
    tb.style.display = "flex";
};

Renderer.hideNodeToolbar = function() {
    const tb = document.getElementById("nodeWysiToolbar");
    if (tb) tb.style.display = "none";
};

Renderer.hideNodeToolbar = function() {
    const tb = document.getElementById("nodeWysiToolbar");
    if (tb) tb.style.display = "none";
};


window.addEventListener("DOMContentLoaded", () => Renderer.init());

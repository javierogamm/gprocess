/* ============================================================
   RENDERER.JS
   Dibuja nodos, SVGs internos, handles, conexiones y etiquetas.
============================================================ */
let lastNodeClickTime = 0;
const Renderer = {

    svg: null,
    container: null,

    init() {
        this.svg = document.getElementById("svgConnections");
        this.container = document.getElementById("nodesContainer");
        
    // 🔥 forzar recepción de clics
    if (this.svg) {
        this.svg.style.pointerEvents = "all";
    }
    },

    clearAll() {
        // 🧹 Limpia el contenido visual actual
        if (this.container) this.container.innerHTML = "";
        if (this.svg) this.svg.innerHTML = "";
      
        // ✨ Limpia resaltados y selecciones visuales
        document.querySelectorAll(".connection-line.selected-conn").forEach(el => el.classList.remove("selected-conn"));
        document.querySelectorAll(".node.selected-conn").forEach(el => el.classList.remove("selected-conn"));
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

        if (!nodo.width)  nodo.width  = 144;
        if (!nodo.height) nodo.height = 68;

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
        content.style.color = nodo.colorTitulo || "#111827";
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
desc.style.color = nodo.colorDescripcion || "#333333";
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

/* ============================================================
   LIMPIAR SOLO DESTACADOS DE CONEXIÓN Y NODOS
============================================================ */
Renderer.clearHighlights = function() {
    document.querySelectorAll(".connection-line.selected-conn, .connection-path.selected-conn")
      .forEach(el => el.classList.remove("selected-conn"));
    document.querySelectorAll(".node.selected-conn")
      .forEach(el => el.classList.remove("selected-conn"));
  };
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

        const fillBase = nodo.color || "#dff3f9";
        const strokeBase = "#2f6f82";
        const strokeAccent = "#3b8c99";
        const strokeWidth = 1.4;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const shadowId = `shadow-${nodo.id}`;

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        filter.setAttribute("id", shadowId);
        filter.setAttribute("x", "-20%");
        filter.setAttribute("y", "-20%");
        filter.setAttribute("width", "140%");
        filter.setAttribute("height", "140%");

        const dropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
        dropShadow.setAttribute("dx", "0");
        dropShadow.setAttribute("dy", "2");
        dropShadow.setAttribute("stdDeviation", "2.5");
        dropShadow.setAttribute("flood-color", "#111827");
        dropShadow.setAttribute("flood-opacity", "0.18");
        filter.appendChild(dropShadow);

        defs.appendChild(filter);
        svg.appendChild(defs);

        g.setAttribute("filter", `url(#${shadowId})`);
        g.setAttribute("stroke-linejoin", "round");
        g.setAttribute("stroke-linecap", "round");
    
        /* ====================================================
           FORMULARIO → cápsula vertical no deformable
        ==================================================== */
        if (nodo.tipo === "formulario") {
            const rx = Math.min(W, H) * 0.18;
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", 2);
            r.setAttribute("y", 2);
            r.setAttribute("width", W - 4);
            r.setAttribute("height", H - 4);
            r.setAttribute("rx", rx);
            r.setAttribute("ry", rx);
            r.setAttribute("fill", fillBase);
            r.setAttribute("stroke", strokeBase);
            r.setAttribute("stroke-width", strokeWidth);
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
            path.setAttribute("fill", fillBase);
            path.setAttribute("stroke", strokeBase);
            path.setAttribute("stroke-width", strokeWidth);
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
    rect.setAttribute("fill", fillBase);
    rect.setAttribute("stroke", strokeBase);
    rect.setAttribute("stroke-width", strokeWidth);

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
        reloj.setAttribute("fill", fillBase);
        reloj.setAttribute("stroke", strokeBase);
        reloj.setAttribute("stroke-width", strokeWidth);
        g.appendChild(reloj);

        // 🔹 Centro del reloj
        const centro = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centro.setAttribute("cx", W / 2);
        centro.setAttribute("cy", H / 2);
        centro.setAttribute("r", 3.5);
        centro.setAttribute("fill", strokeBase);
        g.appendChild(centro);

        // 🔹 Manecilla horaria
        const hora = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hora.setAttribute("x1", W / 2);
        hora.setAttribute("y1", H / 2);
        hora.setAttribute("x2", W / 2);
        hora.setAttribute("y2", H / 2 - Math.min(W, H) * 0.20);
        hora.setAttribute("stroke", strokeBase);
        hora.setAttribute("stroke-width", strokeWidth);
        hora.setAttribute("stroke-linecap", "round");
        g.appendChild(hora);

        // 🔹 Manecilla minutera (más larga)
        const min = document.createElementNS("http://www.w3.org/2000/svg", "line");
        min.setAttribute("x1", W / 2);
        min.setAttribute("y1", H / 2);
        min.setAttribute("x2", W / 2 + Math.min(W, H) * 0.25);
        min.setAttribute("y2", H / 2);
        min.setAttribute("stroke", strokeBase);
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
            line.setAttribute("stroke", strokeBase);
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
    const cylinderRadius = Math.min(W, H) * 0.12;
    body.setAttribute("fill", fillBase);
    body.setAttribute("stroke", strokeBase);
    body.setAttribute("stroke-width", strokeWidth);
    body.setAttribute("rx", cylinderRadius);
    body.setAttribute("ry", cylinderRadius);
    g.appendChild(body);

    // 🔵 Elipse superior
    const topEllipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    topEllipse.setAttribute("cx", 110 * fx);
    topEllipse.setAttribute("cy", 20 * fy);
    topEllipse.setAttribute("rx", 100 * fx);
    topEllipse.setAttribute("ry", 20 * fy);
    topEllipse.setAttribute("fill", fillBase);
    topEllipse.setAttribute("stroke", strokeBase);
    topEllipse.setAttribute("stroke-width", strokeWidth);
    g.appendChild(topEllipse);

    // 🔵 Elipse inferior (solo contorno)
    const bottomEllipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    bottomEllipse.setAttribute("cx", 110 * fx);
    bottomEllipse.setAttribute("cy", 120 * fy);
    bottomEllipse.setAttribute("rx", 100 * fx);
    bottomEllipse.setAttribute("ry", 20 * fy);
    bottomEllipse.setAttribute("fill", nodo.color || "none");
    bottomEllipse.setAttribute("stroke", strokeAccent);
    bottomEllipse.setAttribute("stroke-width", strokeWidth);
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
            el.setAttribute("fill", fillBase);
            el.setAttribute("stroke", strokeBase);
            el.setAttribute("stroke-width", strokeWidth);
            g.appendChild(el);
        }
    
        /* ====================================================
           DECISIÓN → rombo
        ==================================================== */
        if (nodo.tipo === "decision") {
            const r = Math.min(W, H) * 0.08;
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const topY = 2;
            const bottomY = H - 2;
            const leftX = 2;
            const rightX = W - 2;

            const d = `
                M ${W / 2},${topY + r}
                Q ${W / 2},${topY} ${W / 2 + r},${topY + r}
                L ${rightX - r},${H / 2 - r}
                Q ${rightX},${H / 2} ${rightX - r},${H / 2 + r}
                L ${W / 2 + r},${bottomY - r}
                Q ${W / 2},${bottomY} ${W / 2 - r},${bottomY - r}
                L ${leftX + r},${H / 2 + r}
                Q ${leftX},${H / 2} ${leftX + r},${H / 2 - r}
                L ${W / 2 - r},${topY + r}
                Q ${W / 2},${topY} ${W / 2 + r},${topY + r}
                Z
            `;

            path.setAttribute("d", d);
            path.setAttribute("fill", fillBase);
            path.setAttribute("stroke", strokeBase);
            path.setAttribute("stroke-width", strokeWidth);
            g.appendChild(path);
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
            front.setAttribute("fill", fillBase);
            front.setAttribute("stroke", strokeBase);
            front.setAttribute("stroke-width", strokeWidth);
            g.appendChild(front);
    
            const T1 = { x: F1.x, y: F1.y };
            const T2 = { x: F1.x + DEPTH_X, y: F1.y - DEPTH_Y };
            const T3 = { x: F2.x + DEPTH_X, y: F2.y - DEPTH_Y };
            const T4 = { x: F2.x, y: F2.y };
    
            const top = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            top.setAttribute("points", `${T1.x},${T1.y} ${T2.x},${T2.y} ${T3.x},${T3.y} ${T4.x},${T4.y}`);
            top.setAttribute("fill", nodo.color || "#cae8ee");
            top.setAttribute("stroke", strokeAccent);
            top.setAttribute("stroke-width", strokeWidth);
            g.appendChild(top);
    
            const L1 = { x: F2.x, y: F2.y };
            const L2 = { x: T3.x, y: T3.y };
            const L3 = { x: T3.x, y: F3.y - DEPTH_Y };
            const L4 = { x: F3.x, y: F3.y };
    
            const side = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            side.setAttribute("points", `${L1.x},${L1.y} ${L2.x},${L2.y} ${L3.x},${L3.y} ${L4.x},${L4.y}`);
            side.setAttribute("fill", nodo.color || "#b6d8de");
            side.setAttribute("stroke", strokeBase);
            side.setAttribute("stroke-width", strokeWidth);
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
            bg.setAttribute("fill", nodo.color || "#ffffff");
            bg.setAttribute("stroke", strokeBase);
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

/* ============================================================
   RESALTAR CONEXIONES DE UNO O VARIOS NODOS SELECCIONADOS
============================================================ */
highlightConnectionsForNode(nodeIds) {
    // Aceptar string, array o Set
    const ids =
      nodeIds instanceof Set
        ? Array.from(nodeIds)
        : Array.isArray(nodeIds)
          ? nodeIds
          : [nodeIds];

    // Quitar highlights previos
    document.querySelectorAll(".connection-line, .conn-path").forEach(p => {
        p.classList.remove("highlighted-conn");
    });

    if (!ids || ids.length === 0 || !Engine?.data?.conexiones) return;

    // Recorrer conexiones que enlacen cualquier nodo seleccionado
    Engine.data.conexiones.forEach(conn => {
        if (ids.includes(conn.from) || ids.includes(conn.to)) {
            const path = document.getElementById(conn.id) || document.querySelector(`.conn-path[data-conn-id="${conn.id}"]`);
            if (path) {
                Renderer.applyConnectionColorStyles(path, conn);
                path.classList.add("highlighted-conn");
            }
        }
    });
},
/* ============================================================
   RESALTAR UNA CONEXIÓN Y SUS NODOS
============================================================ */
highlightConnectionFull(connId) {

    // 🧹 1️⃣ Limpiar cualquier highlight anterior
    document.querySelectorAll(".connection-line, .conn-path").forEach(p => {
        p.classList.remove("highlighted-conn", "selected-conn");
    });

    document.querySelectorAll(".node").forEach(n => {
        n.classList.remove("highlighted-node", "selected-conn");
    });

    // Si no hay connId, salimos (ya se limpió todo)
    if (!connId) return;

    // 🧩 2️⃣ Encontrar la conexión
    const conn = Engine.getConnection(connId);
    if (!conn) return;

    // ✨ 3️⃣ Iluminar la línea
    const el = document.getElementById(conn.id);
    if (el) {
        Renderer.applyConnectionColorStyles(el, conn);
        el.classList.add("highlighted-conn", "selected-conn");
    }

    // ✨ 4️⃣ Iluminar los nodos conectados
    const n1 = document.getElementById(conn.from);
    const n2 = document.getElementById(conn.to);
    if (n1) n1.classList.add("highlighted-node");
    if (n2) n2.classList.add("highlighted-node");
},

applyConnectionColorStyles(path, conn) {
    if (!path) return;
    const baseColor = conn?.lineColor || "#4a7f84";
    path.style.setProperty("--conn-base", baseColor);
    if (conn?.lineColor) {
        path.style.setProperty("--conn-select-color", conn.lineColor);
        path.style.setProperty("--conn-glow", Renderer.toGlowColor(conn.lineColor, 0.8));
    } else {
        path.style.removeProperty("--conn-select-color");
        path.style.removeProperty("--conn-glow");
    }
},

toGlowColor(color, alpha = 0.8) {
    if (!color) return `rgba(0,180,216,${alpha})`;
    if (color.startsWith("rgb")) {
        const match = color.match(/rgba?\(([^)]+)\)/);
        if (!match) return color;
        const parts = match[1].split(",").map(v => parseFloat(v.trim()));
        const [r, g, b] = parts;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const hex = color.replace("#", "").trim();
    if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (hex.length >= 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(0,180,216,${alpha})`;
},

getDefaultLabelAnchor(d) {
    const pts = Renderer.parsePoints(d);
    const segs = Renderer._toSegments(pts);
    if (!segs.length) return null;

    const elbows = Math.max(0, segs.length - 1);
    let seg;
    if (elbows === 0) {
        seg = segs[0];
    } else if (elbows === 1) {
        seg = segs[segs.length - 1];
    } else {
        seg = segs[1];
    }

    const midX = (seg.p1.x + seg.p2.x) / 2;
    const midY = (seg.p1.y + seg.p2.y) / 2;
    const isHorizontal = Math.abs(seg.p1.y - seg.p2.y) < Math.abs(seg.p1.x - seg.p2.x);
    const baseY = isHorizontal ? (midY - 6) : midY;
    return { x: midX, y: baseY, isHorizontal };
},

    

updateLabelTspans(label, x, y) {
    const tspans = label.querySelectorAll("tspan");
    tspans.forEach((tspan, idx) => {
        tspan.setAttribute("x", x);
        if (idx === 0) {
            tspan.setAttribute("y", y);
            tspan.removeAttribute("dy");
        } else {
            tspan.setAttribute("dy", "1.2em");
        }
    });
},

placeLabelOnPath(label, path, conn, fallbackAnchor) {
    if (!label || !path) return;
    const length = path.getTotalLength();
    if (!length) return;

    let anchor = fallbackAnchor;
    if (typeof conn?.labelPosition === "number") {
        const clamped = Math.min(1, Math.max(0, conn.labelPosition));
        const targetLength = clamped * length;
        const point = path.getPointAtLength(targetLength);
        const neighbor = path.getPointAtLength(Math.min(length, targetLength + 1));
        const isHorizontal = Math.abs(neighbor.y - point.y) < Math.abs(neighbor.x - point.x);
        const baseY = isHorizontal ? (point.y - 6) : point.y;
        anchor = { x: point.x, y: baseY, isHorizontal };
    }

    if (!anchor) return;
    Renderer.updateLabelTspans(label, anchor.x, anchor.y);
},

getSvgPointerPosition(e) {
    const contRect = Renderer.container.getBoundingClientRect();
    return {
        x: e.clientX - contRect.left,
        y: e.clientY - contRect.top
    };
},

closestPointOnPath(path, x, y) {
    const length = path.getTotalLength();
    if (!length) return { length: 0, point: { x: 0, y: 0 }, distance: Infinity };
    const step = Math.max(8, length / 60);
    let best = { length: 0, point: path.getPointAtLength(0), distance: Infinity };

    for (let l = 0; l <= length; l += step) {
        const p = path.getPointAtLength(l);
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < best.distance) {
            best = { length: l, point: p, distance: dist };
        }
    }

    const refineStart = Math.max(0, best.length - step);
    const refineEnd = Math.min(length, best.length + step);
    const refineStep = Math.max(2, step / 4);
    for (let l = refineStart; l <= refineEnd; l += refineStep) {
        const p = path.getPointAtLength(l);
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < best.distance) {
            best = { length: l, point: p, distance: dist };
        }
    }

    return best;
},

bindLabelDrag(label, path, conn) {
    if (label.__dragBound) return;
    label.__dragBound = true;

    label.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (Engine?.selectConnection) {
            Engine.selectConnection(conn.id);
        }
        label.classList.add("dragging");

        const onMove = (ev) => {
            const pos = Renderer.getSvgPointerPosition(ev);
            const nearest = Renderer.closestPointOnPath(path, pos.x, pos.y);
            if (!nearest || !path.getTotalLength()) return;
            conn.labelPosition = nearest.length / path.getTotalLength();
            Renderer.placeLabelOnPath(label, path, conn, null);
        };

        const onUp = () => {
            label.classList.remove("dragging");
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            Engine.saveHistory?.();
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    });
},


        /* ============================================================
   HELPERS PARA TRAMOS Y CÁLCULO LIMPIO DE ETIQUETAS
============================================================ */

// --- convierte "M x y L x y ..." a [{x,y},...]
parsePoints(d) {
    const nums = d.match(/-?\d+(\.\d+)?/g) || [];
    const pts = [];
    for (let i = 0; i < nums.length; i += 2) {
        pts.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i+1]) });
    }
    return pts;
},

// --- true si A->B y B->C están en el mismo eje (colineales ortogonales)
_colineales(a, b, c) {
    return (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
},

// --- fusiona segmentos consecutivos colineales → devuelve tramos reales {p1,p2}
_toSegments(pts) {
    if (pts.length < 2) return [];
    const simp = [ pts[0] ];
    for (let i = 1; i < pts.length - 1; i++) {
        const a = simp[simp.length - 1];
        const b = pts[i];
        const c = pts[i + 1];
        if (this._colineales(a, b, c)) continue;
        simp.push(b);
    }
    simp.push(pts[pts.length - 1]);

    const segs = [];
    for (let i = 0; i < simp.length - 1; i++) {
        segs.push({ p1: simp[i], p2: simp[i+1] });
    }
    return segs;
},

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
            // Línea temporal dinámica mientras se arrastra
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

            this.applyConnectionColorStyles(path, c);
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
    parsePoints(d) {
        const nums = d.match(/-?\d+(\.\d+)?/g);
        const pts = [];
        for (let i = 0; i < nums.length; i += 2) {
            pts.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i+1]) });
        }
        return pts;
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
            arrowPath.setAttribute("fill", "context-stroke");    
            marker.appendChild(arrowPath);
            defs.appendChild(marker);
            this.svg.appendChild(defs);
        }
// 🧭 Línea visible con flecha
const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.classList.add("connection-line");
path.id = conn.id;
path.setAttribute("d", d);
path.setAttribute("fill", "none");       
path.setAttribute("stroke", "#4a7f84");
path.setAttribute("stroke-width", "2");
path.setAttribute("marker-end", "url(#arrowhead)");
this.svg.appendChild(path);  // ⚠️ primero el visible
// ⚙️ Identificar y habilitar drop
path.setAttribute("data-conn-id", conn.id);
path.classList.add("conn-path");
path.style.pointerEvents = "stroke"; // permite soltar encima del trazo
this.applyConnectionColorStyles(path, conn);

if (!path.__dndBound) {
  path.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    path.classList.add("conn-drop-over"); // para resaltar visualmente
  });
  path.addEventListener("dragleave", () => {
    path.classList.remove("conn-drop-over");
  });
  path.addEventListener("drop", (e) => {
    path.classList.remove("conn-drop-over");
    if (window.handleTesauroDrop) {
      window.handleTesauroDrop(e, conn.id);
    }
  });
  path.__dndBound = true;
}

// 🟦 Área de clic invisible (gruesa, encima)
const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
// --- HABILITAR DROP TAMBIÉN EN EL HIT ---
if (!hit.__dndBound) {

    hit.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        hit.classList.add("conn-drop-over");
    });

    hit.addEventListener("dragleave", () => {
        hit.classList.remove("conn-drop-over");
    });

    hit.addEventListener("drop", (e) => {
        hit.classList.remove("conn-drop-over");
        if (window.handleTesauroDrop) {
            window.handleTesauroDrop(e, conn.id);
        }
    });

    hit.__dndBound = true;
}
hit.setAttribute("d", d);
hit.setAttribute("stroke", "rgba(0,0,0,0.001)"); // casi invisible pero capta eventos
hit.setAttribute("stroke-width", "15");
hit.setAttribute("fill", "none");
hit.setAttribute("pointer-events", "stroke");
hit.classList.add("connection-hit");
hit.style.cursor = "pointer";

hit.addEventListener("mouseenter", () => {
    hit.setAttribute("stroke", "rgba(0,0,0,0.1)");
});
hit.addEventListener("mouseleave", () => {
    hit.setAttribute("stroke", "rgba(0,0,0,0.001)");
});
hit.addEventListener("click", (e) => {
    e.stopPropagation();
    Engine.selectConnection(conn.id);
});
// 🧪 LOG DE DEPURACIÓN DE COORDENADAS DE HOVER
hit.addEventListener("mousemove", (e) => {
    const svgRect = Renderer.svg.getBoundingClientRect();
    const contRect = Renderer.container.getBoundingClientRect();
    const mx = e.clientX - contRect.left;
    const my = e.clientY - contRect.top;

    // Parsear puntos reales de la línea
    const pts = Renderer.parsePoints(d);
    const first = pts[0];
    const last = pts[pts.length - 1];


});
this.svg.appendChild(hit); // ⚠️ el hit se añade DESPUÉS → queda arriba
   
// =============================
// 🏷️ ETIQUETA SEGÚN REGLAS (0, 1 o 2+ codos)
// =============================
if (conn.condicionNombre || conn.condicionValor) {

    // 1️⃣ Texto base
    const textoBase = conn.condicionNombre
        ? `${conn.condicionNombre}: ${conn.condicionValor || ""}`
        : (conn.condicionValor || "");

    const texto = (textoBase || "").trim();
    if (!texto) return;

    // 2️⃣ Puntos del path y tramos "reales"
    const anchor = Renderer.getDefaultLabelAnchor(d);
    if (!anchor) return;

    // 5️⃣ Partir el texto en varias líneas cortas
    const maxCharsPerLine = 22;      // 🔧 ajusta a tu gusto
    const maxLines        = 3;       // 🔧 máximo de líneas visibles
    const words  = texto.split(/\s+/);
    const lines  = [];
    let current  = "";

    words.forEach(w => {
        const probe = (current ? current + " " : "") + w;
        if (probe.length > maxCharsPerLine && current) {
            lines.push(current);
            current = w;
        } else {
            current = probe;
        }
    });
    if (current) lines.push(current);

    // Si hay demasiadas líneas, recortamos y añadimos "…"
    if (lines.length > maxLines) {
        const lastIdx = maxLines - 1;
        lines[lastIdx] = (lines[lastIdx] + " …").trim();
        lines.length = maxLines;
    }

    // 6️⃣ Crear <text> con <tspan> por línea
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("connection-label");
    label.dataset.connId = conn.id;

    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("fill", "#ffffff");
    label.setAttribute("stroke", "#000000");
    label.setAttribute("stroke-width", "2");
    label.setAttribute("paint-order", "stroke fill");

    lines.forEach((line, idx) => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.textContent = line;

        // Primera línea: x/y absolutos
        if (idx === 0) {
            tspan.setAttribute("x", anchor.x);
            tspan.setAttribute("y", anchor.y);
        } else {
            // Siguientes → mismo x, desplazadas con dy
            tspan.setAttribute("x", anchor.x);
            tspan.setAttribute("dy", "1.2em");
        }

        label.appendChild(tspan);
    });

    this.svg.appendChild(label);
    Renderer.placeLabelOnPath(label, path, conn, anchor);
    Renderer.bindLabelDrag(label, path, conn);
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
    generateOrthogonalPath(from, to, fromPos, toPos) {
        const offset = 30; // separación desde el nodo
        const p = [];
    
        // 1️⃣ punto inicial
        p.push({ x: from.x, y: from.y });
    
        // 2️⃣ salir recto del nodo origen
        switch (fromPos) {
            case "top":    p.push({ x: from.x, y: from.y - offset }); break;
            case "bottom": p.push({ x: from.x, y: from.y + offset }); break;
            case "left":   p.push({ x: from.x - offset, y: from.y }); break;
            case "right":  p.push({ x: from.x + offset, y: from.y }); break;
        }
    
        // 3️⃣ llegar recto al nodo destino
        let approach = { x: to.x, y: to.y };
        switch (toPos) {
            case "top":    approach = { x: to.x, y: to.y - offset }; break;
            case "bottom": approach = { x: to.x, y: to.y + offset }; break;
            case "left":   approach = { x: to.x - offset, y: to.y }; break;
            case "right":  approach = { x: to.x + offset, y: to.y }; break;
        }
    
        // 4️⃣ añadir punto intermedio — sólo cambia un eje por vez
        const last = p[p.length - 1];
    
        // calculamos primer codo horizontal o vertical según distancia
        if (Math.abs(to.x - last.x) > Math.abs(to.y - last.y)) {
            // más ancho que alto → primero horizontal, luego vertical
            p.push({ x: approach.x, y: last.y });
        } else {
            // más alto que ancho → primero vertical, luego horizontal
            p.push({ x: last.x, y: approach.y });
        }
    
        // 5️⃣ añadir llegada y destino
        p.push(approach);
        p.push({ x: to.x, y: to.y });
    
        // 6️⃣ construir path SVG asegurando ortogonalidad
        let d = `M ${p[0].x} ${p[0].y}`;
        for (let i = 1; i < p.length; i++) {
            const prev = p[i - 1], cur = p[i];
            // 🔒 forzamos un eje constante
            if (prev.x !== cur.x && prev.y !== cur.y) {
                // elige mantener el eje más cercano al anterior
                if (Math.abs(prev.x - cur.x) > Math.abs(prev.y - cur.y)) {
                    cur.y = prev.y;
                } else {
                    cur.x = prev.x;
                }
            }
            d += ` L ${cur.x} ${cur.y}`;
        }
    
        return d;
    }
    
,    

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

/* ============================================================
   ACTUALIZAR COLOR DE UN NODO EN VIVO + STROKE OPCIONAL
============================================================ */
Renderer.updateNodeColor = function(id, fillColor, strokeColor) {
    const div = document.getElementById(id);
    if (!div) return;

    // Actualizar formas SVG internas
    const shapes = div.querySelectorAll("rect, path, polygon, ellipse, circle");
    shapes.forEach(s => {
        if (fillColor)  s.setAttribute("fill", fillColor);
        if (strokeColor) s.setAttribute("stroke", strokeColor);
    });

    // Actualizar en el objeto de datos
    const nodo = Engine.getNode(id);
    if (nodo) {
        if (fillColor)  nodo.color = fillColor;
        if (strokeColor) nodo.strokeColor = strokeColor;
        Engine.saveHistory();
    }

    // Redibujar conexiones (mantiene color consistente)
    if (Engine.data && Engine.data.conexiones) {
        Renderer.redrawConnections();
    }
};
/* ============================================================
   ACTUALIZAR COLOR DE TEXTO DEL NODO (TÍTULO / DESCRIPCIÓN)
============================================================ */
Renderer.updateNodeTextColor = function(id, tipoTexto, color) {
    const div = document.getElementById(id);
    if (!div) return;

    const nodo = Engine.getNode(id);
    if (!nodo) return;

    if (tipoTexto === "titulo") {
        const content = div.querySelector(".node-content");
        if (content) content.style.color = color;
        nodo.colorTitulo = color;
    } else if (tipoTexto === "descripcion") {
        const desc = div.querySelector(".node-description");
        if (desc) desc.style.color = color;
        nodo.colorDescripcion = color;
    }

    Engine.saveHistory();
};
/* ============================================================
   EDICIÓN DE LÍNEAS: MOVER TRAMOS RECTOS + CREAR CODO AUTOMÁTICO
============================================================ */
Renderer.LineEditor = {
    activeConn: null,
    handles: [],
    isDragging: false,
    dragIndex: null,
    segments: [],

    show(conn) {
        this.clear();
        if (!conn) return;
        this.activeConn = conn;
    
        const pathEl = Renderer.svg.querySelector(`#${conn.id}`);
        if (!pathEl) return;
    
        const pts = this._extractPoints(pathEl.getAttribute("d"));
        if (pts.length < 3) return; // nada que mover si solo hay 2 puntos
    
        this.segments = [];
        for (let i = 0; i < pts.length - 1; i++) {
            // ❌ Saltar el primer y último tramo (conectan con nodos)
            if (i === 0 || i === pts.length - 2) continue;
    
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const isHorizontal = Math.abs(p1.y - p2.y) < Math.abs(p1.x - p2.x);
    
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
    
            const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            h.classList.add("line-segment-handle");
            h.setAttribute("cx", cx);
            h.setAttribute("cy", cy);
            h.setAttribute("r", "7");
            h.setAttribute("fill", "#2563eb");
            h.setAttribute("stroke", "#fff");
            h.setAttribute("stroke-width", "2");
            h.style.cursor = isHorizontal ? "ns-resize" : "ew-resize";
            h.dataset.index = i;
            h.dataset.axis = isHorizontal ? "y" : "x";
    
            h.addEventListener("mousedown", (e) => this.startDrag(e, i, isHorizontal));
            Renderer.svg.appendChild(h);
            this.handles.push(h);
    
            this.segments.push({ i1: i, i2: i + 1, horizontal: isHorizontal });
        }
    },
        clear() {
        Renderer.svg.querySelectorAll(".line-segment-handle").forEach(h => h.remove());
        this.handles = [];
        this.activeConn = null;
        this.isDragging = false;
        this.dragIndex = null;
    },

    _extractPoints(d) {
        const coords = d.match(/-?\d+(\.\d+)?/g);
        const pts = [];
        if (coords) {
            for (let i = 0; i < coords.length; i += 2)
                pts.push({ x: parseFloat(coords[i]), y: parseFloat(coords[i + 1]) });
        }
        return pts;
    },

    startDrag(e, segIndex, isHorizontal) {
        e.stopPropagation();
        this.isDragging = true;
        this.dragIndex = segIndex;
    
        const conn = this.activeConn;
        const pathEl = Renderer.svg.querySelector(`#${conn.id}`);
        if (!pathEl) return;
    
        let pts = this._extractPoints(pathEl.getAttribute("d"));
        const seg = this.segments.find(s => s.i1 === segIndex || s.i2 === segIndex + 1);
        if (!seg) return;
    
        const svgRect = Renderer.svg.getBoundingClientRect();
        const axis = isHorizontal ? "y" : "x";
    
        const onMove = (ev) => {
            if (!this.isDragging) return;
    
            // Coordenadas del ratón en el SVG
            const x = ev.clientX - svgRect.left;
            const y = ev.clientY - svgRect.top;
    
            // Desplazamos ambos puntos del tramo (manteniendo ortogonalidad)
            if (axis === "y") {
                const deltaY = y - (pts[seg.i1].y + pts[seg.i2].y) / 2;
                pts[seg.i1].y += deltaY;
                pts[seg.i2].y += deltaY;
            } else {
                const deltaX = x - (pts[seg.i1].x + pts[seg.i2].x) / 2;
                pts[seg.i1].x += deltaX;
                pts[seg.i2].x += deltaX;
            }
    
            // 🔹 Reforzar ortogonalidad automática (solo tramos internos)
            pts = this._ensureOrthogonality(pts, seg.i1, seg.i2);
    
            // Redibujar la línea
            let d = `M ${pts[0].x},${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x},${pts[i].y}`;
            pathEl.setAttribute("d", d);

            // 🏷️ Mover también la etiqueta correcta (solo la de esta conexión)
            const label = Renderer.svg.querySelector(`text.connection-label[data-conn-id="${conn.id}"]`);
            if (label) {
                const anchor = Renderer.getDefaultLabelAnchor(d);
                Renderer.placeLabelOnPath(label, pathEl, conn, anchor);
            }

// Actualizar posición de los handles
this.updateHandles(pts);        };
    
        const onUp = () => {
            this.isDragging = false;
            this.dragIndex = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);

            Engine.saveHistory();
            Renderer.LineEditor.show(conn); // 🔄 refrescar handles después del movimiento
        };
    
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    },
    

    /* ============================================================
       Mantener ortogonalidad: inserta un codo si se rompe
    ============================================================ */
    _ensureOrthogonality(pts, i1, i2) {
        const fixed = [...pts];
        const before = i1 - 1 >= 0 ? fixed[i1 - 1] : null;
        const after  = i2 + 1 < fixed.length ? fixed[i2 + 1] : null;

        // Verificar ángulos antes y después
        const horizontal = Math.abs(fixed[i1].y - fixed[i2].y) < Math.abs(fixed[i1].x - fixed[i2].x);

        // 🔹 Si se rompe antes
        if (before) {
            const prevDir = Math.abs(before.x - fixed[i1].x) > Math.abs(before.y - fixed[i1].y) ? "H" : "V";
            if ((horizontal && prevDir === "H") || (!horizontal && prevDir === "V")) {
                // Necesitamos insertar codo
                const mid = horizontal
                    ? { x: before.x, y: fixed[i1].y }
                    : { x: fixed[i1].x, y: before.y };
                fixed.splice(i1, 0, mid);
                i1++;
                i2++;
            }
        }

        // 🔹 Si se rompe después
        if (after) {
            const nextDir = Math.abs(after.x - fixed[i2].x) > Math.abs(after.y - fixed[i2].y) ? "H" : "V";
            if ((horizontal && nextDir === "H") || (!horizontal && nextDir === "V")) {
                const mid = horizontal
                    ? { x: after.x, y: fixed[i2].y }
                    : { x: fixed[i2].x, y: after.y };
                fixed.splice(i2 + 1, 0, mid);
            }
        }

        return fixed;
    },

    updateHandles(pts) {
        this.handles.forEach((h) => {
            const i = parseInt(h.dataset.index);
            if (i >= pts.length - 1) return;
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            h.setAttribute("cx", cx);
            h.setAttribute("cy", cy);
        });
    }
};

/* ============================================================
   MOSTRAR HANDLES AL SELECCIONAR LÍNEA
============================================================ */
const _oldSelectConnection = Engine.selectConnection;
Engine.selectConnection = function(connId) {
    _oldSelectConnection.call(Engine, connId);
    const conn = Engine.getConnection(connId);
    if (conn) Renderer.LineEditor.show(conn);
    else Renderer.LineEditor.clear();
};

/* ============================================================
   LIMPIAR HANDLES AL HACER CLIC FUERA
============================================================ */
// 🧩 Listener global de limpieza
document.addEventListener("click", (e) => {
  const now = Date.now();
  if (now - lastNodeClickTime < 150) return; // evita doble ejecución inmediata

  const clickedNode   = e.target.closest(".node");
  const clickedLine   = e.target.closest(".connection-line") || e.target.closest(".conn-path");
  const clickedHit    = e.target.closest(".connection-hit");
  const clickedLabel  = e.target.closest?.(".connection-label");

  const cleanAll = () => {
    Renderer.highlightConnectionFull(null);
    Renderer.LineEditor.clear();
    document.querySelectorAll(".selected-conn, .highlighted-node").forEach(el =>
      el.classList.remove("selected-conn", "highlighted-node")
    );
  };

  // ⚙️ Si haces clic dentro del nodo ya seleccionado → ignora
  const selected = document.querySelector(".node.highlighted-node");
  if (selected && selected.contains(e.target)) return;

  // 1️⃣ CLIC EN NODO
  if (clickedNode) {
    lastNodeClickTime = now;
    e.stopPropagation();
    // Solo limpiamos editores de línea; mantenemos los highlights de selección
    Renderer.LineEditor.clear();
    document
      .querySelectorAll(".connection-line.selected-conn, .conn-path.selected-conn")
      .forEach((el) => el.classList.remove("selected-conn"));
    clickedNode.classList.add("highlighted-node");
    return;
  }

  // 2️⃣ CLIC EN LÍNEA
  if (clickedLine || clickedHit) {
    lastNodeClickTime = now;
    e.stopPropagation();
    const connId = clickedLine?.id || clickedHit?.getAttribute("data-conn-id");
    cleanAll();
    if (connId) Renderer.highlightConnectionFull(connId);
    return;
  }

  // 3️⃣ CLIC EN ETIQUETA → no limpiar
  if (clickedLabel) return;

  // 4️⃣ CLIC FUERA → limpiar todo
  cleanAll();
});


/* ============================================================
   EFECTO VISUAL: FLASH VERDE EN CONEXIÓN
============================================================ */
Renderer.flashConnection = function (connId) {
    const path = document.querySelector(`.conn-path[data-conn-id="${connId}"]`);
    if (!path) return;
  
    const oldStroke = path.getAttribute("stroke") || "#4a7f84";
    const oldWidth = path.getAttribute("stroke-width") || "2";
  
    // Cambia temporalmente el color y grosor
    path.setAttribute("stroke", "#10b981");
    path.setAttribute("stroke-width", "4");
    path.style.transition = "all 0.25s ease";
  
    // Revertir a su estado original tras 0.5 s
    setTimeout(() => {
      path.setAttribute("stroke", oldStroke);
      path.setAttribute("stroke-width", oldWidth);
    }, 500);
  };
  
/* ============================================================
   DROP TESAURO SOBRE CONEXIÓN
   (Asigna condicionNombre y condicionValor automáticamente)
============================================================ */
const sanitizeTesauroNumeric = (input) => {
  const raw = (input || "").trim();
  if (!raw) return "";

  const sign = raw.trim().startsWith("-") ? "-" : "";
  const cleaned = raw.replace(/[^0-9.,-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  const integerPart = (decimalIndex >= 0 ? cleaned.slice(0, decimalIndex) : cleaned)
    .replace(/[.,-]/g, "");
  const decimalPart = decimalIndex >= 0 ? cleaned.slice(decimalIndex + 1).replace(/[.,-]/g, "") : "";

  return decimalPart ? `${sign}${integerPart}.${decimalPart}` : `${sign}${integerPart}`;
};

window.handleTesauroDrop = function (e, connId) {
  try {
    e.preventDefault();

    const Eng = window.Engine ?? (typeof Engine !== "undefined" ? Engine : null);
    if (!Eng) return;

    // 1️⃣ Recuperar el payload arrastrado
    const raw =
      e.dataTransfer.getData("application/x-tesauro") ||
      e.dataTransfer.getData("text/plain");
    if (!raw) return;

    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    // 2️⃣ Determinar nombre del campo tesauro
    let condicionNombre = (payload.nombre || "").trim();
    if (!condicionNombre)
      condicionNombre = (payload.refCampo || "").trim();
    if (!condicionNombre) return;

    // 3️⃣ Determinar valor según el tipo
    let valor = (payload.valor || "").trim();

    // ---- SELECTOR ----
    if (payload.tipo === "selector") {
      if (!valor) {
        const campo = (Eng.tesauro || []).find(
          (t) =>
            t.nombre === condicionNombre ||
            t.ref === payload.refCampo
        );
        if (!campo || !Array.isArray(campo.opciones)) {
          alert("Este selector no tiene valores definidos.");
          return;
        }
        const opcionesTxt = campo.opciones
          .map((o) => `${o.ref} — ${o.valor}`)
          .join("\n");
        const indicado = prompt(
          `Valor para "${campo.nombre}" (escribe la REFERENCIA):\n${opcionesTxt}`
        );
        if (!indicado) return;
        const found = campo.opciones.find(
          (o) =>
            o.ref.toLowerCase() ===
            indicado.trim().toLowerCase()
        );
        if (!found) {
          alert("Referencia no válida.");
          return;
        }
        valor = found.valor;
      }
    }

    // ---- SI/NO ----
    else if (payload.tipo === "si_no") {
      if (!valor) {
        valor = confirm(
          `Asignar "${condicionNombre}" = Sí ?`
        )
          ? "Sí"
          : "No";
      }
    }

    // ---- TEXTO o NUMÉRICO ----
    else if (
      payload.tipo === "texto" ||
      payload.tipo === "numerico" ||
      payload.tipo === "moneda" ||
      payload.tipo === "fecha"
    ) {
      if (payload.needsInput || !valor) {
        const input = prompt(
          `Introduce el valor para "${condicionNombre}"${
            payload.tipo === "numerico"
              ? " (numérico)"
              : payload.tipo === "moneda"
                ? " (importe)"
                : payload.tipo === "fecha"
                  ? " (fecha)"
                  : ""
          }:`
        );
        if (input == null) return;

        if (payload.tipo === "numerico" || payload.tipo === "moneda") {
          const sanitized = sanitizeTesauroNumeric(input);
          if (sanitized === "" || isNaN(parseFloat(sanitized))) {
            alert("Introduce un número válido.");
            return;
          }
          valor = sanitized;
        } else {
          valor = input.trim();
        }
      } else if (payload.tipo === "numerico" || payload.tipo === "moneda") {
        const sanitized = sanitizeTesauroNumeric(valor);
        if (sanitized === "" || isNaN(parseFloat(sanitized))) {
          alert("Introduce un número válido.");
          return;
        }
        valor = sanitized;
      }
    } else {
      // Tipo no reconocido
      return;
    }

    // 4️⃣ Actualizar la conexión en Engine
    if (typeof Eng.updateConnectionCondition === "function") {
      Eng.updateConnectionCondition(connId, condicionNombre, valor);
    } else {
      // Si no existe ese método, forzamos actualización directa
      const conn = Eng.getConnection(connId);
      if (conn) {
        conn.condicionNombre = condicionNombre;
        conn.condicionValor = valor;
        Eng.saveHistory?.();
        Eng.updateConnections?.();
      }
    }

    // 5️⃣ Efecto visual (flash verde corto)
    if (window.Renderer && typeof Renderer.flashConnection === "function") {
      Renderer.flashConnection(connId);
    }
  } catch (err) {
    console.error("Error en handleTesauroDrop:", err);
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { handleTesauroDrop: window.handleTesauroDrop, sanitizeTesauroNumeric };
}
  

  

window.addEventListener("DOMContentLoaded", () => Renderer.init());

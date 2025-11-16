/* ============================================================
   REDIMENSIONAR PANELES LATERALES (izquierda y derecha)
============================================================ */
(function() {
    const leftPanel = document.getElementById("leftPanel");
    const rightPanel = document.getElementById("rightPanel");
    const canvas = document.getElementById("canvasArea");

    if (!leftPanel || !rightPanel || !canvas) return;

    // Crear los resizers
    const leftResizer = document.createElement("div");
    leftResizer.className = "panel-resizer";
    leftPanel.appendChild(leftResizer);

    const rightResizer = document.createElement("div");
    rightResizer.className = "panel-resizer";
    rightPanel.appendChild(rightResizer);

    let activeSide = null;
    let startX = 0;
    let startWidth = 0;

    const startResize = (e, side) => {
        e.preventDefault();
        activeSide = side;
        startX = e.clientX;
        startWidth = side === "left" ? leftPanel.offsetWidth : rightPanel.offsetWidth;
        document.body.style.cursor = "ew-resize";
    };

    const stopResize = () => {
        activeSide = null;
        document.body.style.cursor = "default";
    };

    const doResize = (e) => {
        if (!activeSide) return;

        if (activeSide === "left") {
            const dx = e.clientX - startX;
            const newWidth = Math.max(120, startWidth + dx);
            leftPanel.style.width = newWidth + "px";
        } else if (activeSide === "right") {
            const dx = startX - e.clientX;
            const newWidth = Math.max(160, startWidth + dx);
            rightPanel.style.width = newWidth + "px";
        }

        // mantener el canvas ocupando el espacio restante
        canvas.style.flex = "1 1 auto";
    };

    leftResizer.addEventListener("mousedown", (e) => startResize(e, "left"));
    rightResizer.addEventListener("mousedown", (e) => startResize(e, "right"));
    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
})();

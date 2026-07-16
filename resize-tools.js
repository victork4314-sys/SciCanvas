(() => {
  const HANDLE_SIZE = 14;
  const MIN_SIZE = 20;
  const directions = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  const baseRenderSelection = renderSelection;
  renderSelection = function renderResizableSelection() {
    baseRenderSelection();
    const item = selectedObject();
    if (!item || item.type === "connector" || item.visible === false) return;

    const points = {
      nw: [item.x, item.y],
      n: [item.x + item.width / 2, item.y],
      ne: [item.x + item.width, item.y],
      e: [item.x + item.width, item.y + item.height / 2],
      se: [item.x + item.width, item.y + item.height],
      s: [item.x + item.width / 2, item.y + item.height],
      sw: [item.x, item.y + item.height],
      w: [item.x, item.y + item.height / 2]
    };

    directions.forEach(direction => {
      const [cx, cy] = points[direction];
      const handle = createSvg("rect", {
        class: `resize-handle resize-${direction}`,
        x: cx - HANDLE_SIZE / 2,
        y: cy - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        rx: 3,
        "data-direction": direction,
        tabindex: 0,
        role: "button",
        "aria-label": `Resize ${direction}`
      });
      handle.addEventListener("pointerdown", beginResize);
      selectionLayer.appendChild(handle);
    });
  };

  function beginResize(event) {
    const item = selectedObject();
    if (!item || item.type === "connector") return;
    event.preventDefault();
    event.stopPropagation();
    pushHistory();
    const point = canvasPoint(event);
    state.resize = {
      id: item.id,
      direction: event.currentTarget.dataset.direction,
      startPointerX: point.x,
      startPointerY: point.y,
      startX: item.x,
      startY: item.y,
      startWidth: item.width,
      startHeight: item.height
    };
    canvas.setPointerCapture(event.pointerId);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function applyProportionalResize(item, resize, dx, dy, direction) {
    const horizontalScale = direction.includes("e")
      ? (resize.startWidth + dx) / resize.startWidth
      : (resize.startWidth - dx) / resize.startWidth;
    const verticalScale = direction.includes("s")
      ? (resize.startHeight + dy) / resize.startHeight
      : (resize.startHeight - dy) / resize.startHeight;
    let scale = Math.abs(horizontalScale - 1) >= Math.abs(verticalScale - 1)
      ? horizontalScale
      : verticalScale;
    scale = Math.max(MIN_SIZE / resize.startWidth, MIN_SIZE / resize.startHeight, scale);

    let width = resize.startWidth * scale;
    let height = resize.startHeight * scale;
    let x = direction.includes("w") ? resize.startX + resize.startWidth - width : resize.startX;
    let y = direction.includes("n") ? resize.startY + resize.startHeight - height : resize.startY;

    if (x < 0) {
      const allowed = (resize.startX + resize.startWidth) / resize.startWidth;
      width = resize.startWidth * allowed;
      height = resize.startHeight * allowed;
      x = 0;
      if (direction.includes("n")) y = resize.startY + resize.startHeight - height;
    }
    if (y < 0) {
      const allowed = (resize.startY + resize.startHeight) / resize.startHeight;
      width = resize.startWidth * allowed;
      height = resize.startHeight * allowed;
      y = 0;
      if (direction.includes("w")) x = resize.startX + resize.startWidth - width;
    }
    if (x + width > 1200) {
      const allowed = (1200 - x) / resize.startWidth;
      width = resize.startWidth * allowed;
      height = resize.startHeight * allowed;
    }
    if (y + height > 750) {
      const allowed = (750 - y) / resize.startHeight;
      width = resize.startWidth * allowed;
      height = resize.startHeight * allowed;
    }

    item.x = x;
    item.y = y;
    item.width = Math.max(MIN_SIZE, width);
    item.height = Math.max(MIN_SIZE, height);
  }

  canvas.addEventListener("pointermove", event => {
    const resize = state.resize;
    if (!resize) return;
    const item = state.objects.find(object => object.id === resize.id);
    if (!item) return;

    const point = canvasPoint(event);
    const dx = point.x - resize.startPointerX;
    const dy = point.y - resize.startPointerY;
    const direction = resize.direction;
    const isCorner = direction.length === 2;

    if (isCorner && event.shiftKey) {
      applyProportionalResize(item, resize, dx, dy, direction);
    } else {
      let left = resize.startX;
      let top = resize.startY;
      let right = resize.startX + resize.startWidth;
      let bottom = resize.startY + resize.startHeight;

      if (direction.includes("w")) left = clamp(resize.startX + dx, 0, right - MIN_SIZE);
      if (direction.includes("e")) right = clamp(resize.startX + resize.startWidth + dx, left + MIN_SIZE, 1200);
      if (direction.includes("n")) top = clamp(resize.startY + dy, 0, bottom - MIN_SIZE);
      if (direction.includes("s")) bottom = clamp(resize.startY + resize.startHeight + dy, top + MIN_SIZE, 750);

      item.x = left;
      item.y = top;
      item.width = right - left;
      item.height = bottom - top;
    }

    render();
  });

  function finishResize() {
    if (!state.resize) return;
    state.resize = null;
    render();
    scheduleSave();
  }

  canvas.addEventListener("pointerup", finishResize);
  canvas.addEventListener("pointercancel", finishResize);

  const style = document.createElement("style");
  style.textContent = `
    .resize-handle{fill:#fff;stroke:#2563eb;stroke-width:2;vector-effect:non-scaling-stroke;pointer-events:all}
    .resize-handle:hover{fill:#dbe8ff}
    .resize-nw,.resize-se{cursor:nwse-resize}.resize-ne,.resize-sw{cursor:nesw-resize}
    .resize-n,.resize-s{cursor:ns-resize}.resize-e,.resize-w{cursor:ew-resize}
  `;
  document.head.appendChild(style);

  render();
})();
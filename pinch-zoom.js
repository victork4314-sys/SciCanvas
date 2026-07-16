(() => {
  const stage = document.getElementById('canvasStage');
  const canvas = document.getElementById('canvas');
  if (!stage || !canvas || typeof setZoom !== 'function') return;

  let pinch = null;

  function midpoint(touchA, touchB) {
    return {
      x:(touchA.clientX + touchB.clientX) / 2,
      y:(touchA.clientY + touchB.clientY) / 2
    };
  }

  function distance(touchA, touchB) {
    return Math.hypot(touchA.clientX - touchB.clientX, touchA.clientY - touchB.clientY);
  }

  function beginPinch(event) {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    state.drag = null;
    state.resize = null;
    const [touchA, touchB] = event.touches;
    const center = midpoint(touchA, touchB);
    const canvasRect = canvas.getBoundingClientRect();
    pinch = {
      startDistance:Math.max(1, distance(touchA, touchB)),
      startZoom:state.zoom || 1,
      anchorX:canvasRect.width ? (center.x - canvasRect.left) / canvasRect.width : .5,
      anchorY:canvasRect.height ? (center.y - canvasRect.top) / canvasRect.height : .5
    };
    stage.classList.add('pinch-zooming');
  }

  function updatePinch(event) {
    if (!pinch || event.touches.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    const [touchA, touchB] = event.touches;
    const center = midpoint(touchA, touchB);
    const scale = distance(touchA, touchB) / pinch.startDistance;
    const nextZoom = Math.max(.15, Math.min(2.4, pinch.startZoom * scale));
    setZoom(nextZoom);

    const canvasRect = canvas.getBoundingClientRect();
    const anchoredClientX = canvasRect.left + canvasRect.width * pinch.anchorX;
    const anchoredClientY = canvasRect.top + canvasRect.height * pinch.anchorY;
    stage.scrollLeft += anchoredClientX - center.x;
    stage.scrollTop += anchoredClientY - center.y;
  }

  function finishPinch(event) {
    if (!pinch) return;
    if (event.touches?.length >= 2) return;
    pinch = null;
    stage.classList.remove('pinch-zooming');
    scheduleSave();
  }

  stage.addEventListener('touchstart', beginPinch, { passive:false, capture:true });
  stage.addEventListener('touchmove', updatePinch, { passive:false, capture:true });
  stage.addEventListener('touchend', finishPinch, { passive:false, capture:true });
  stage.addEventListener('touchcancel', finishPinch, { passive:false, capture:true });

  ['gesturestart','gesturechange','gestureend'].forEach(type => {
    stage.addEventListener(type, event => event.preventDefault(), { passive:false });
  });

  const zoomValue = document.getElementById('zoomValue');
  if (zoomValue) zoomValue.title = 'Pinch with two fingers to zoom';

  const style = document.createElement('style');
  style.textContent = `
    .canvas-stage{touch-action:none}
    .canvas-stage.pinch-zooming,.canvas-stage.pinch-zooming #canvas,.canvas-stage.pinch-zooming .canvas-object{cursor:zoom-in!important}
  `;
  document.head.appendChild(style);
})();
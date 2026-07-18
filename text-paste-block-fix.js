(() => {
  if (window.__figureLoomTextPasteBlockFix) return;
  window.__figureLoomTextPasteBlockFix = true;

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  function fontString(item) {
    return `${item.fontStyle || 'normal'} ${Number(item.fontWeight) || 400} ${Math.max(6, Number(item.fontSize) || 30)}px ${item.fontFamily || 'Segoe UI, sans-serif'}`;
  }

  function shouldBecomeBlock(item, value = item?.text || '') {
    const text = String(value || '');
    if (!text.trim()) return false;
    if (text.includes('\n') || text.length > 42) return true;
    if (!measureContext) return text.length > 28;
    measureContext.font = fontString(item || {});
    const usableWidth = Math.max(20, Number(item?.width || 280) - Math.max(0, Number(item?.textPadding) || 9) * 2);
    return measureContext.measureText(text).width > usableWidth;
  }

  function lineMetrics(group, item) {
    const lines = Math.max(1, group?.querySelectorAll('text > tspan').length || 0);
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return {
      lines,
      height:Math.max(30, Math.ceil(lines * lineHeight + padding * 2))
    };
  }

  function install() {
    if (!window.__figureLoomTextLayoutTools || typeof renderObject !== 'function' || typeof render !== 'function') {
      setTimeout(install, 80);
      return;
    }
    if (window.__figureLoomTextPasteBlockInstalled) return;
    window.__figureLoomTextPasteBlockInstalled = true;

    const baseRenderObject = renderObject;
    renderObject = function renderObjectWithCompleteTextBlocks(item) {
      if (item?.type !== 'text') return baseRenderObject(item);

      if (!item.textFlowManual && (item.textFlow == null || (item.textFlow === 'single' && shouldBecomeBlock(item)))) {
        item.textFlow = 'auto-height';
      }

      let group = baseRenderObject(item);
      if (item.textFlow !== 'auto-height') return group;

      let metrics = lineMetrics(group, item);
      const canvasView = document.getElementById('canvas')?.viewBox?.baseVal;
      const pageWidth = Number(canvasView?.width) || 1200;
      const pageHeight = Number(canvasView?.height) || 750;
      const currentX = Math.max(0, Number(item.x) || 0);
      const sensibleMaximumWidth = Math.max(280, Math.min(600, pageWidth - currentX - 20));

      if (!item.textWidthManual && metrics.height > pageHeight && Number(item.width) < sensibleMaximumWidth) {
        item.width = sensibleMaximumWidth;
        group = baseRenderObject(item);
        metrics = lineMetrics(group, item);
      }

      item.height = metrics.height;
      if (item.height <= pageHeight && Number(item.y || 0) + item.height > pageHeight) {
        item.y = Math.max(0, pageHeight - item.height);
      } else if (item.height > pageHeight) {
        item.y = 0;
      }

      const flow = item.textFlow;
      item.textFlow = 'wrap';
      group = baseRenderObject(item);
      item.textFlow = flow;
      return group;
    };

    const content = document.getElementById('textContent');
    if (content && !content.dataset.figureloomBlockInput) {
      content.dataset.figureloomBlockInput = '1';
      content.addEventListener('input', event => {
        const item = typeof selectedObject === 'function' ? selectedObject() : null;
        if (!item || item.type !== 'text') return;
        item.text = event.target.value;
        item.name = event.target.value.trim().slice(0, 40) || 'Text label';
        if (!item.textFlowManual && shouldBecomeBlock(item, item.text)) item.textFlow = 'auto-height';
        render();
        scheduleSave?.();
      });
    }

    const flowControl = document.getElementById('textBoxFlow');
    flowControl?.addEventListener('change', () => {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (item?.type === 'text') item.textFlowManual = true;
    }, true);

    document.addEventListener('pointerdown', event => {
      const handle = event.target.closest?.('.text-box-resize-hit.resize-e,.text-box-resize-hit.resize-w');
      if (!handle) return;
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (item?.type === 'text') item.textWidthManual = true;
    }, true);

    const addText = document.getElementById('addTextButton');
    if (addText && !addText.dataset.figureloomBlockDefault) {
      addText.dataset.figureloomBlockDefault = '1';
      addText.addEventListener('click', () => {
        const item = typeof selectedObject === 'function' ? selectedObject() : null;
        if (!item || item.type !== 'text') return;
        item.textFlow = 'auto-height';
        item.textFlowManual = false;
        item.textWidthManual = false;
        item.width = Math.max(420, Number(item.width) || 0);
        render();
        scheduleSave?.();
      });
    }

    state.objects?.forEach(item => {
      if (item?.type === 'text' && !item.textFlowManual && shouldBecomeBlock(item)) item.textFlow = 'auto-height';
    });
    render();
  }

  install();
})();